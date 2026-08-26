import {
  defineConfig,
  devices
} from "@playwright/test";


export default defineConfig({
  testDir:
    "./tests",
  testMatch:
    "**/*.spec.mjs",
  fullyParallel:
    false,
  timeout:
    30000,
  expect: {
    timeout:
      10000
  },
  retries:
    process.env.CI
      ? 1
      : 0,
  reporter:
    process.env.CI
      ? "github"
      : "list",
  use: {
    baseURL:
      "http://127.0.0.1:4173",
    trace:
      "retain-on-failure"
  },
  webServer: {
    command:
      `"${process.execPath}" tests/static-server.mjs`,
    url:
      "http://127.0.0.1:4173",
    reuseExistingServer:
      !process.env.CI
  },
  projects: [
    {
      name:
        "chromium",
      use: {
        ...devices["Desktop Chrome"]
      }
    }
  ]
});
