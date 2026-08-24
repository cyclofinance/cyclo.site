// Static server for the SvelteKit adapter-static build.
// Personal-use deploy: HTTP Basic Auth + noindex. Zero dependencies.
// Fails CLOSED — if credentials are not configured, nothing is served.

import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { join, normalize, extname, resolve } from 'node:path';
import { timingSafeEqual } from 'node:crypto';

const PORT = Number(process.env.PORT) || 8080;
const ROOT = resolve('build');
const USER = process.env.BASIC_AUTH_USER || '';
const PASS = process.env.BASIC_AUTH_PASS || '';
const AUTH_CONFIGURED = USER.length > 0 && PASS.length > 0;

const TYPES = {
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.json': 'application/json; charset=utf-8',
	'.svg': 'image/svg+xml',
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.gif': 'image/gif',
	'.ico': 'image/x-icon',
	'.webp': 'image/webp',
	'.woff': 'font/woff',
	'.woff2': 'font/woff2',
	'.ttf': 'font/ttf',
	'.map': 'application/json; charset=utf-8',
	'.txt': 'text/plain; charset=utf-8',
	'.wasm': 'application/wasm'
};

function safeEqual(a, b) {
	const bufA = Buffer.from(a);
	const bufB = Buffer.from(b);
	if (bufA.length !== bufB.length) return false;
	return timingSafeEqual(bufA, bufB);
}

function authorized(req) {
	const header = req.headers.authorization || '';
	if (!header.startsWith('Basic ')) return false;
	let decoded;
	try {
		decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
	} catch {
		return false;
	}
	const idx = decoded.indexOf(':');
	if (idx === -1) return false;
	// Evaluate both halves every time — no short-circuit timing signal.
	const userOk = safeEqual(decoded.slice(0, idx), USER);
	const passOk = safeEqual(decoded.slice(idx + 1), PASS);
	return userOk && passOk;
}

async function resolveFile(urlPath) {
	// Strip query/hash, decode, and normalize away any traversal.
	let p;
	try {
		p = decodeURIComponent(urlPath.split('?')[0].split('#')[0]);
	} catch {
		return null;
	}
	const rel = normalize(p).replace(/^(\.\.[/\\])+/, '').replace(/^[/\\]+/, '');
	const target = join(ROOT, rel);
	// Containment check — never serve outside build/.
	if (target !== ROOT && !target.startsWith(ROOT + '/')) return null;

	const candidates = [target];
	// adapter-static emits FLAT files (unlock.html), not unlock/index.html —
	// so try <path>.html and <path>/index.html before giving up.
	const bare = target.replace(/\/+$/, '');
	if (bare !== target) candidates.push(bare);
	candidates.push(join(bare || target, 'index.html'));
	if (bare && !extname(bare)) candidates.push(bare + '.html');

	for (const c of candidates) {
		if (c !== ROOT && !c.startsWith(ROOT + '/')) continue;
		try {
			const s = await stat(c);
			if (s.isFile()) return { path: c, size: s.size };
		} catch {
			/* try next candidate */
		}
	}
	return null;
}

const server = createServer(async (req, res) => {
	// Applied to every response, including 401s.
	res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
	res.setHeader('X-Content-Type-Options', 'nosniff');
	res.setHeader('Referrer-Policy', 'no-referrer');

	if (!AUTH_CONFIGURED) {
		res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' });
		res.end('Auth not configured. Set BASIC_AUTH_USER and BASIC_AUTH_PASS.\n');
		return;
	}

	if (!authorized(req)) {
		res.writeHead(401, {
			'WWW-Authenticate': 'Basic realm="cyclo", charset="UTF-8"',
			'Content-Type': 'text/plain; charset=utf-8'
		});
		res.end('Authentication required.\n');
		return;
	}

	// The build uses relative asset paths (./_app, ../_app), so a trailing slash
	// invents an extra directory level and every asset 404s. Canonicalise to the
	// slash-less form, which is where each page's relative base actually resolves.
	const rawUrl = req.url || '/';
	const [rawPath, rawQuery] = rawUrl.split(/(?=\?)/);
	if (rawPath.length > 1 && rawPath.endsWith('/')) {
		res.writeHead(301, { Location: rawPath.replace(/\/+$/, '') + (rawQuery || '') });
		res.end();
		return;
	}

	if (req.method !== 'GET' && req.method !== 'HEAD') {
		res.writeHead(405, { Allow: 'GET, HEAD' });
		res.end();
		return;
	}

	const found = await resolveFile(req.url || '/');

	if (!found) {
		// adapter-static fallback page.
		const fb = await resolveFile('/404.html');
		if (fb) {
			res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
			if (req.method === 'HEAD') return res.end();
			createReadStream(fb.path).pipe(res);
			return;
		}
		res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
		res.end('Not found\n');
		return;
	}

	const type = TYPES[extname(found.path).toLowerCase()] || 'application/octet-stream';
	res.writeHead(200, { 'Content-Type': type, 'Content-Length': found.size });
	if (req.method === 'HEAD') return res.end();
	createReadStream(found.path).pipe(res);
});

server.listen(PORT, '0.0.0.0', () => {
	console.log(`serving ${ROOT} on 0.0.0.0:${PORT} (auth configured: ${AUTH_CONFIGURED})`);
});
