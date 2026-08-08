import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "dashboard-verify.spec.ts",
  reporter: "line",
  use: { ...devices["Desktop Chrome"] },
});
