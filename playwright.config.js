// @ts-check
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:8613",
    viewport: { width: 1440, height: 900 },
  },
  webServer: {
    command: "python3 -m http.server 8613",
    url: "http://localhost:8613/demo/index.html",
    reuseExistingServer: true,
    timeout: 15000,
  },
});
