<script lang="ts">
  export let inset: boolean = false;
  export let href: string;

  function sanitizeHref(raw: string): string {
    const trimmed = raw.trim();
    if (
      trimmed.startsWith("/") ||
      trimmed.startsWith("#") ||
      trimmed.startsWith("?")
    ) {
      return trimmed;
    }
    if (/^(https?:|mailto:)/i.test(trimmed)) {
      return trimmed;
    }
    return "#";
  }

  $: safeHref = sanitizeHref(href);
  $: isBlank = $$restProps.target === "_blank";
  $: rel = isBlank
    ? `noopener noreferrer ${$$restProps.rel ?? ""}`.trim()
    : $$restProps.rel;
</script>

<a {...$$restProps} href={safeHref} {rel} class:inset class:outset={!inset}
  ><slot /></a
>

<style lang="postcss">
  a {
    @apply flex items-center justify-center gap-2 border-4 border-white bg-primary px-2 py-1 font-bold text-white transition-all hover:bg-blue-700 disabled:bg-neutral-600 md:px-4 md:py-2;
  }
  .outset {
    border-style: outset;
  }
  .inset {
    border-style: inset;
  }
  a:disabled {
    @apply cursor-not-allowed;
    border-style: solid;
  }
</style>
