<script lang="ts">
  import { page } from "$app/stores";
  import { base } from "$app/paths";
  import { BarsOutline } from "flowbite-svelte-icons";

  let mobileMenuOpen = false;
  const toggleMenu = () => {
    mobileMenuOpen = !mobileMenuOpen;
  };

  $: relativePath = (() => {
    let p = $page.url.pathname;
    if (base && p.startsWith(base)) p = p.slice(base.length);
    if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
    return p;
  })();
</script>

<div class="flex items-center justify-center sm:hidden">
  <BarsOutline
    class="block cursor-pointer"
    size="xl"
    withEvents
    on:click={toggleMenu}
    data-testid="nav-hamburger"
  />
</div>

{#if mobileMenuOpen}
  <div
    class="absolute left-0 top-0 z-50 flex h-screen w-full flex-col items-center justify-center gap-4 bg-black/80 sm:hidden"
  >
    <button
      class="absolute right-4 top-4 text-3xl text-white"
      on:click={toggleMenu}>&times;</button
    >
    <a
      href={base + "/lock"}
      data-testid="app-button-mobile"
      class="text-lg text-white sm:ml-4 sm:block sm:text-xl"
      on:click={toggleMenu}
    >
      App
    </a>
    <a
      href={base + "/docs"}
      data-testid="docs-button-mobile"
      class="text-lg text-white sm:ml-4 sm:block sm:text-xl"
      on:click={toggleMenu}
    >
      Docs
    </a>
    <a
      href={base + "/rewards"}
      data-testid="rewards-button-mobile"
      class="text-lg text-white sm:ml-4 sm:block sm:text-xl"
      on:click={toggleMenu}
    >
      Rewards
    </a>
    <a
      href={base + "/trade"}
      data-testid="trade-button-mobile"
      class="text-lg text-white sm:ml-4 sm:block sm:text-xl"
      on:click={toggleMenu}
    >
      Trade
    </a>
    <a
      href={base + "/chart"}
      data-testid="chart-button-mobile"
      class="text-lg text-white sm:ml-4 sm:block sm:text-xl"
      on:click={toggleMenu}
    >
      Chart
    </a>
  </div>
{/if}

<div class="hidden items-center justify-center gap-4 sm:flex">
  <a
    href={base + "/lock"}
    data-testid="app-button"
    class="text-lg text-white sm:ml-4 sm:block sm:text-xl"
    class:underline={relativePath === "/lock" || relativePath === "/unlock"}
  >
    App
  </a>
  <a
    href={base + "/docs"}
    data-testid="docs-button"
    class="text-lg text-white sm:ml-4 sm:block sm:text-xl"
    class:underline={relativePath === "/docs" ||
      relativePath.startsWith("/docs/")}
  >
    Docs
  </a>
  <a
    href={base + "/rewards"}
    data-testid="rewards-button"
    class="text-lg text-white sm:ml-4 sm:block sm:text-xl"
    class:underline={relativePath === "/rewards"}
  >
    Rewards
  </a>
  <a
    href={base + "/trade"}
    data-testid="trade-button"
    class="text-lg text-white sm:ml-4 sm:block sm:text-xl"
  >
    Trade
  </a>
  <a
    href={base + "/chart"}
    data-testid="chart-button"
    class="text-lg text-white sm:ml-4 sm:block sm:text-xl"
  >
    Chart
  </a>
</div>
