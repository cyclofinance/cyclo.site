import { bytesToHex, isHex } from 'viem';

export const PYTH_UPDATE_ABI = [
	{
		anonymous: false,
		inputs: [
			{
				indexed: true,
				internalType: 'bytes32',
				name: 'id',
				type: 'bytes32'
			},
			{
				indexed: false,
				internalType: 'uint64',
				name: 'publishTime',
				type: 'uint64'
			},
			{
				indexed: false,
				internalType: 'int64',
				name: 'price',
				type: 'int64'
			},
			{
				indexed: false,
				internalType: 'uint64',
				name: 'conf',
				type: 'uint64'
			}
		],
		name: 'PriceFeedUpdate',
		type: 'event'
	},
	{
		inputs: [
			{
				internalType: 'bytes32',
				name: 'id',
				type: 'bytes32'
			}
		],
		name: 'getEmaPrice',
		outputs: [
			{
				components: [
					{
						internalType: 'int64',
						name: 'price',
						type: 'int64'
					},
					{
						internalType: 'uint64',
						name: 'conf',
						type: 'uint64'
					},
					{
						internalType: 'int32',
						name: 'expo',
						type: 'int32'
					},
					{
						internalType: 'uint256',
						name: 'publishTime',
						type: 'uint256'
					}
				],
				internalType: 'struct PythStructs.Price',
				name: 'price',
				type: 'tuple'
			}
		],
		stateMutability: 'view',
		type: 'function'
	},
	{
		inputs: [
			{
				internalType: 'bytes32',
				name: 'id',
				type: 'bytes32'
			},
			{
				internalType: 'uint256',
				name: 'age',
				type: 'uint256'
			}
		],
		name: 'getEmaPriceNoOlderThan',
		outputs: [
			{
				components: [
					{
						internalType: 'int64',
						name: 'price',
						type: 'int64'
					},
					{
						internalType: 'uint64',
						name: 'conf',
						type: 'uint64'
					},
					{
						internalType: 'int32',
						name: 'expo',
						type: 'int32'
					},
					{
						internalType: 'uint256',
						name: 'publishTime',
						type: 'uint256'
					}
				],
				internalType: 'struct PythStructs.Price',
				name: 'price',
				type: 'tuple'
			}
		],
		stateMutability: 'view',
		type: 'function'
	},
	{
		inputs: [
			{
				internalType: 'bytes32',
				name: 'id',
				type: 'bytes32'
			}
		],
		name: 'getEmaPriceUnsafe',
		outputs: [
			{
				components: [
					{
						internalType: 'int64',
						name: 'price',
						type: 'int64'
					},
					{
						internalType: 'uint64',
						name: 'conf',
						type: 'uint64'
					},
					{
						internalType: 'int32',
						name: 'expo',
						type: 'int32'
					},
					{
						internalType: 'uint256',
						name: 'publishTime',
						type: 'uint256'
					}
				],
				internalType: 'struct PythStructs.Price',
				name: 'price',
				type: 'tuple'
			}
		],
		stateMutability: 'view',
		type: 'function'
	},
	{
		inputs: [
			{
				internalType: 'bytes32',
				name: 'id',
				type: 'bytes32'
			}
		],
		name: 'getPrice',
		outputs: [
			{
				components: [
					{
						internalType: 'int64',
						name: 'price',
						type: 'int64'
					},
					{
						internalType: 'uint64',
						name: 'conf',
						type: 'uint64'
					},
					{
						internalType: 'int32',
						name: 'expo',
						type: 'int32'
					},
					{
						internalType: 'uint256',
						name: 'publishTime',
						type: 'uint256'
					}
				],
				internalType: 'struct PythStructs.Price',
				name: 'price',
				type: 'tuple'
			}
		],
		stateMutability: 'view',
		type: 'function'
	},
	{
		inputs: [
			{
				internalType: 'bytes32',
				name: 'id',
				type: 'bytes32'
			},
			{
				internalType: 'uint256',
				name: 'age',
				type: 'uint256'
			}
		],
		name: 'getPriceNoOlderThan',
		outputs: [
			{
				components: [
					{
						internalType: 'int64',
						name: 'price',
						type: 'int64'
					},
					{
						internalType: 'uint64',
						name: 'conf',
						type: 'uint64'
					},
					{
						internalType: 'int32',
						name: 'expo',
						type: 'int32'
					},
					{
						internalType: 'uint256',
						name: 'publishTime',
						type: 'uint256'
					}
				],
				internalType: 'struct PythStructs.Price',
				name: 'price',
				type: 'tuple'
			}
		],
		stateMutability: 'view',
		type: 'function'
	},
	{
		inputs: [
			{
				internalType: 'bytes32',
				name: 'id',
				type: 'bytes32'
			}
		],
		name: 'getPriceUnsafe',
		outputs: [
			{
				components: [
					{
						internalType: 'int64',
						name: 'price',
						type: 'int64'
					},
					{
						internalType: 'uint64',
						name: 'conf',
						type: 'uint64'
					},
					{
						internalType: 'int32',
						name: 'expo',
						type: 'int32'
					},
					{
						internalType: 'uint256',
						name: 'publishTime',
						type: 'uint256'
					}
				],
				internalType: 'struct PythStructs.Price',
				name: 'price',
				type: 'tuple'
			}
		],
		stateMutability: 'view',
		type: 'function'
	},
	{
		inputs: [
			{
				internalType: 'bytes[]',
				name: 'updateData',
				type: 'bytes[]'
			}
		],
		name: 'getUpdateFee',
		outputs: [
			{
				internalType: 'uint256',
				name: 'feeAmount',
				type: 'uint256'
			}
		],
		stateMutability: 'view',
		type: 'function'
	},
	{
		inputs: [],
		name: 'getValidTimePeriod',
		outputs: [
			{
				internalType: 'uint256',
				name: 'validTimePeriod',
				type: 'uint256'
			}
		],
		stateMutability: 'view',
		type: 'function'
	},
	{
		inputs: [
			{
				internalType: 'bytes[]',
				name: 'updateData',
				type: 'bytes[]'
			},
			{
				internalType: 'bytes32[]',
				name: 'priceIds',
				type: 'bytes32[]'
			},
			{
				internalType: 'uint64',
				name: 'minPublishTime',
				type: 'uint64'
			},
			{
				internalType: 'uint64',
				name: 'maxPublishTime',
				type: 'uint64'
			}
		],
		name: 'parsePriceFeedUpdates',
		outputs: [
			{
				components: [
					{
						internalType: 'bytes32',
						name: 'id',
						type: 'bytes32'
					},
					{
						components: [
							{
								internalType: 'int64',
								name: 'price',
								type: 'int64'
							},
							{
								internalType: 'uint64',
								name: 'conf',
								type: 'uint64'
							},
							{
								internalType: 'int32',
								name: 'expo',
								type: 'int32'
							},
							{
								internalType: 'uint256',
								name: 'publishTime',
								type: 'uint256'
							}
						],
						internalType: 'struct PythStructs.Price',
						name: 'price',
						type: 'tuple'
					},
					{
						components: [
							{
								internalType: 'int64',
								name: 'price',
								type: 'int64'
							},
							{
								internalType: 'uint64',
								name: 'conf',
								type: 'uint64'
							},
							{
								internalType: 'int32',
								name: 'expo',
								type: 'int32'
							},
							{
								internalType: 'uint256',
								name: 'publishTime',
								type: 'uint256'
							}
						],
						internalType: 'struct PythStructs.Price',
						name: 'emaPrice',
						type: 'tuple'
					}
				],
				internalType: 'struct PythStructs.PriceFeed[]',
				name: 'priceFeeds',
				type: 'tuple[]'
			}
		],
		stateMutability: 'payable',
		type: 'function'
	},
	{
		inputs: [
			{
				internalType: 'bytes[]',
				name: 'updateData',
				type: 'bytes[]'
			},
			{
				internalType: 'bytes32[]',
				name: 'priceIds',
				type: 'bytes32[]'
			},
			{
				internalType: 'uint64',
				name: 'minPublishTime',
				type: 'uint64'
			},
			{
				internalType: 'uint64',
				name: 'maxPublishTime',
				type: 'uint64'
			}
		],
		name: 'parsePriceFeedUpdatesUnique',
		outputs: [
			{
				components: [
					{
						internalType: 'bytes32',
						name: 'id',
						type: 'bytes32'
					},
					{
						components: [
							{
								internalType: 'int64',
								name: 'price',
								type: 'int64'
							},
							{
								internalType: 'uint64',
								name: 'conf',
								type: 'uint64'
							},
							{
								internalType: 'int32',
								name: 'expo',
								type: 'int32'
							},
							{
								internalType: 'uint256',
								name: 'publishTime',
								type: 'uint256'
							}
						],
						internalType: 'struct PythStructs.Price',
						name: 'price',
						type: 'tuple'
					},
					{
						components: [
							{
								internalType: 'int64',
								name: 'price',
								type: 'int64'
							},
							{
								internalType: 'uint64',
								name: 'conf',
								type: 'uint64'
							},
							{
								internalType: 'int32',
								name: 'expo',
								type: 'int32'
							},
							{
								internalType: 'uint256',
								name: 'publishTime',
								type: 'uint256'
							}
						],
						internalType: 'struct PythStructs.Price',
						name: 'emaPrice',
						type: 'tuple'
					}
				],
				internalType: 'struct PythStructs.PriceFeed[]',
				name: 'priceFeeds',
				type: 'tuple[]'
			}
		],
		stateMutability: 'payable',
		type: 'function'
	},
	{
		inputs: [
			{
				internalType: 'bytes[]',
				name: 'updateData',
				type: 'bytes[]'
			}
		],
		name: 'updatePriceFeeds',
		outputs: [],
		stateMutability: 'payable',
		type: 'function'
	},
	{
		inputs: [
			{
				internalType: 'bytes[]',
				name: 'updateData',
				type: 'bytes[]'
			},
			{
				internalType: 'bytes32[]',
				name: 'priceIds',
				type: 'bytes32[]'
			},
			{
				internalType: 'uint64[]',
				name: 'publishTimes',
				type: 'uint64[]'
			}
		],
		name: 'updatePriceFeedsIfNecessary',
		outputs: [],
		stateMutability: 'payable',
		type: 'function'
	}
] as const;

export const DEFAULT_PYTH_ADDR = '0xff1a0f4744e8582DF1aE09D5611b887B6a12925C' as const;

const HERMES_V2 = 'https://hermes.pyth.network/v2/updates/price/latest';
const U64_MAX = (1n << 64n) - 1n;

type PublishTimeLike = bigint | number | string | null | undefined;

type ParsedPriceRow = {
	price_id?: string;
	priceId?: string;
	id?: string;
	price_feed?: { id?: string };
	publish_time?: PublishTimeLike;
	publishTime?: PublishTimeLike;
	price?: {
		publish_time?: PublishTimeLike;
		publishTime?: PublishTimeLike;
	};
};

type ParsedSection = {
	price_updates?: ParsedPriceRow[];
	updates?: ParsedPriceRow[];
} | null;

type HermesJson = {
	binary?: unknown;
	priceUpdates?: unknown;
	updates?: unknown;
	parsed?: ParsedSection;
};

const coerceHexArray = (value: unknown): `0x${string}`[] => {
	if (!Array.isArray(value)) return [];
	const result: `0x${string}`[] = [];
	for (const item of value) {
		if (typeof item === 'string' && item.length) {
			// Normalize to 0x-prefixed hex string and validate
			const hex = item.startsWith('0x') ? item : `0x${item}`;
			if (isHex(hex)) {
				result.push(hex);
			}
		} else if (item && typeof item === 'object' && 'data' in (item as Record<string, unknown>)) {
			const candidate = (item as { data?: string }).data;
			if (typeof candidate === 'string' && candidate.length) {
				const hex = candidate.startsWith('0x') ? candidate : `0x${candidate}`;
				if (isHex(hex)) {
					result.push(hex);
				}
			}
		}
	}
	return result;
};

const normalizeIdsNo0x = (ids: `0x${string}`[]): string[] =>
	ids.map((id) => (id.startsWith('0x') ? id.slice(2) : id).toLowerCase());

/**
 * Converts a base64 string to a hex string with 0x prefix.
 * Uses Buffer in Node.js and atob in browser environments.
 */
function b64ToHex0x(b64: string): `0x${string}` {
	let bytes: Uint8Array;
	if (typeof Buffer !== 'undefined') {
		// Node.js: Buffer.from returns a Uint8Array-compatible Buffer
		bytes = Buffer.from(b64, 'base64');
	} else if (typeof atob === 'function') {
		// Browser: decode base64 and convert to bytes
		const binary = atob(b64);
		bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
	} else {
		throw new Error('Base64 decoding not available in this environment');
	}
	return bytesToHex(bytes);
}

export const toU64 = (n: bigint) => (n < 0n ? 0n : n > U64_MAX ? U64_MAX : n);

const coerceSection = (
	input: { parsed?: ParsedSection } | ParsedSection | null | undefined
): ParsedSection => {
	if (!input) return null;
	if (typeof input === 'object' && 'parsed' in input) {
		return input.parsed ?? null;
	}
	return input as ParsedSection;
};

/**
 * Normalizes various time representations to bigint.
 * Returns null if the value cannot be converted.
 */
const normalisePublishTime = (value: PublishTimeLike): bigint | null => {
	if (value === null || value === undefined) return null;
	if (typeof value === 'bigint') return value;
	if (typeof value === 'number') {
		// Validate number is safe for BigInt conversion
		if (!Number.isFinite(value) || Number.isNaN(value)) return null;
		return BigInt(Math.floor(value));
	}
	if (typeof value === 'string' && value.trim().length > 0) {
		try {
			return BigInt(value.trim());
		} catch {
			return null;
		}
	}
	return null;
};

export function extractParsedTimes(
	input: { parsed?: ParsedSection } | ParsedSection | null | undefined
): Record<string, bigint> {
	const section = coerceSection(input);
	const rows = section?.price_updates ?? section?.updates ?? [];
	const out: Record<string, bigint> = {};

	for (const row of rows) {
		if (!row) continue;
		const id = row.price_id ?? row.priceId ?? row.id ?? row.price_feed?.id ?? '';
		const timeCandidate =
			normalisePublishTime(row.publish_time) ??
			normalisePublishTime(row.publishTime) ??
			normalisePublishTime(row.price?.publish_time) ??
			normalisePublishTime(row.price?.publishTime);

		if (id && timeCandidate !== null) {
			out[id.toLowerCase()] = timeCandidate;
		}
	}

	return out;
}

export function extractPublishTime(result: unknown): bigint {
	if (Array.isArray(result) && result.length >= 4) {
		const tupleValue = result[3];
		const normalised = normalisePublishTime(tupleValue as PublishTimeLike);
		return normalised ?? 0n;
	}

	if (result && typeof result === 'object') {
		const obj = result as Record<string, unknown>;
		let candidate = normalisePublishTime(obj.publishTime as PublishTimeLike);
		if (candidate === null) {
			candidate = normalisePublishTime(obj.publish_time as PublishTimeLike);
		}
		if (candidate === null && obj.price && typeof obj.price === 'object') {
			const price = obj.price as Record<string, unknown>;
			candidate =
				normalisePublishTime(price.publishTime as PublishTimeLike) ??
				normalisePublishTime(price.publish_time as PublishTimeLike);
		}
		return candidate ?? 0n;
	}

	return 0n;
}

export async function fetchUpdateBlobs(
	priceIds: `0x${string}`[]
): Promise<{ updateData: `0x${string}`[]; parsed: ParsedSection }> {
	const attempts: ReadonlyArray<{
		ids: readonly string[];
		encoding: 'hex' | 'base64';
	}> = [
		{ ids: priceIds, encoding: 'hex' },
		{ ids: normalizeIdsNo0x(priceIds), encoding: 'hex' },
		{ ids: priceIds, encoding: 'base64' },
		{ ids: normalizeIdsNo0x(priceIds), encoding: 'base64' }
	];

	for (const attempt of attempts) {
		const u = new URL(HERMES_V2);
		for (const id of attempt.ids) {
			u.searchParams.append('ids[]', id);
		}
		u.searchParams.set('encoding', attempt.encoding);

		const resp = await fetch(u.toString());
		if (!resp.ok) continue;

		const json = (await resp.json()) as HermesJson;

		let blobs: `0x${string}`[] = [];
		if (attempt.encoding === 'hex') {
			blobs =
				coerceHexArray(json?.binary) ||
				coerceHexArray((json?.binary as { data?: unknown })?.data) ||
				coerceHexArray(json?.priceUpdates) ||
				coerceHexArray(json?.updates);
		} else {
			const base64Lists = [
				json?.binary,
				(json?.binary as { data?: unknown })?.data,
				json?.priceUpdates,
				json?.updates
			];
			for (const candidate of base64Lists) {
				if (!Array.isArray(candidate)) continue;
				const converted = candidate
					.filter((item): item is string => typeof item === 'string')
					.map((item) => b64ToHex0x(item));
				if (converted.length) {
					blobs = converted;
					break;
				}
			}
		}

		if (blobs.length) {
			return { updateData: blobs, parsed: json?.parsed ?? null };
		}
	}

	throw new Error(
		`Hermes v2 returned no update data for provided ids. First id: ${priceIds[0] ?? 'N/A'}`
	);
}
