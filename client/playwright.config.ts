import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
    launchOptions: {
      slowMo: process.env.SLOW_MO ? parseInt(process.env.SLOW_MO) : 0,
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "npm run dev -w server",
      cwd: "..",
      port: 3001,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "npm run dev -w client",
      cwd: "..",
      port: 5173,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
