<script lang="ts">
  import { page } from "$app/stores";
  import { base } from "$app/paths";
  import { BarsOutline } from "flowbite-svelte-icons";

  let mobileMenuOpen = false;
  const toggleMenu = () => {
    mobileMenuOpen = !mobileMenuOpen;
  };
  const closeMenu = () => {
    mobileMenuOpen = false;
  };
</script>

<svelte:window on:keydown={(e) => e.key === "Escape" && closeMenu()} />

<div class="flex items-center justify-center sm:hidden">
  <button
    type="button"
    class="block cursor-pointer border-0 bg-transparent p-0"
    on:click={toggleMenu}
    aria-label="Open menu"
    aria-expanded={mobileMenuOpen}
    aria-controls="mobile-menu"
    data-testid="nav-hamburger"
  >
    <BarsOutline class="block" size="xl" aria-hidden="true" />
  </button>
</div>

{#if mobileMenuOpen}
  <div
    id="mobile-menu"
    role="dialog"
    aria-modal="true"
    aria-label="Navigation menu"
    class="absolute left-0 top-0 z-50 flex h-screen w-full flex-col items-center justify-center gap-4 bg-black/80 sm:hidden"
  >
    <button
      class="absolute right-4 top-4 text-3xl text-white"
      on:click={closeMenu}
      aria-label="Close menu">&times;</button
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
    class:underline={$page.url.pathname === "/lock" ||
      $page.url.pathname === "/unlock"}
  >
    App
  </a>
  <a
    href={base + "/docs"}
    data-testid="docs-button"
    class="text-lg text-white sm:ml-4 sm:block sm:text-xl"
    class:underline={$page.url.pathname.startsWith("/docs")}
    on:click={toggleMenu}
  >
    Docs
  </a>
  <a
    href={base + "/rewards"}
    data-testid="rewards-button"
    class="text-lg text-white sm:ml-4 sm:block sm:text-xl"
    class:underline={$page.url.pathname === "/rewards"}
    on:click={toggleMenu}
  >
    Rewards
  </a>
  <a
    href={base + "/trade"}
    data-testid="trade-button"
    class="text-lg text-white sm:ml-4 sm:block sm:text-xl"
    on:click={toggleMenu}
  >
    Trade
  </a>
  <a
    href={base + "/chart"}
    data-testid="chart-button"
    class="text-lg text-white sm:ml-4 sm:block sm:text-xl"
    on:click={toggleMenu}
  >
    Chart
  </a>
</div>
