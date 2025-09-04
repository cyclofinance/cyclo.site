<script>
	import xLogo from '$lib/images/x-twitter.svg';
	import telegramLogo from '$lib/images/telegram.svg';
	import githubLogo from '$lib/images/github.svg';
	import duneLogo from '$lib/images/dune.svg';
</script>

<div class="flex flex-row gap-4">
	<a href="https://x.com/cyclofinance" target="_blank">
		<img src={xLogo} alt="x" class="h-4 w-4 sm:h-5 sm:w-5" />
	</a>
	<a href="https://t.me/cyclofinance" target="_blank">
		<img src={telegramLogo} alt="telegram" class="h-4 w-4 sm:h-5 sm:w-5" />
	</a>
	<a href="https://github.com/cyclofinance" target="_blank">
		<img src={githubLogo} alt="github" class="h-4 w-4 sm:h-5 sm:w-5" />
	</a>
	<a href="https://dune.com/cyclofinance" target="_blank">
		<img src={duneLogo} alt="dune" class="h-4 w-4 sm:h-5 sm:w-5" />
	</a>
</div>
