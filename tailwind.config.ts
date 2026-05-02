import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/**/*.{html,js,svelte,ts}",
    "./node_modules/flowbite-svelte-icons/**/*.{html,js,svelte,ts}",
    "./node_modules/flowbite-svelte/**/*.{html,js,svelte,ts}",
  ],

  theme: {
    extend: {
      colors: {
        primary: "#1E26E8",
      },
    },
  },

  plugins: [require("@tailwindcss/typography"), require("flowbite/plugin")],
} as Config;
