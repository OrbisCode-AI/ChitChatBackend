const config = {
  "**/*.{ts?(x),mts}": () => "tsc -p tsconfig.prod.json --noEmit",
  "*.{js,jsx,mjs,cjs,ts,tsx,mts}": [
    "npm run lint -- --fix",
    "vitest related --run",
  ],
  "*.{md,json}": "prettier --write",
};

export default config;
