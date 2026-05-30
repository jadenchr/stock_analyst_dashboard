import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Vitest 4 reads tsconfig paths natively.
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    globals: false,
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    exclude: ["node_modules", ".next", "dist"],
    setupFiles: ["./tests/setup.ts"],
    testTimeout: 15_000,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      reportsDirectory: "./coverage",
      include: ["app/api/**", "lib/billing/**", "lib/email/**", "lib/auth/**"],
      exclude: ["**/*.test.ts"],
    },
  },
});
