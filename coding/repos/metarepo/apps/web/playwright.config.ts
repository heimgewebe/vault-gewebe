import { defineConfig } from "@playwright/test";

const PORT = Number(process.env.PORT ?? 4173);
const shouldStartWebServer = process.env.PLAYWRIGHT_SKIP_WEBSERVER !== "1";
// Erzeuge in CI einen HTML-Report (Ordner: playwright-report) + line für Log-Ausgabe
const reporter: any = [["html", { open: "never", outputFolder: "playwright-report" }], ["line"]];

export default defineConfig({
  testDir: "tests",
  timeout: 60_000,
  // Sanfte Stabilisierung im CI gegen Flakes, lokal 0 Retries
  retries: process.env.CI ? 1 : 0,
  expect: {
    timeout: 10_000
  },
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "on-first-retry"
  },
  reporter,
  ...(shouldStartWebServer
    ? {
        webServer: {
          command: `npm run preview -- --port ${PORT} --host 127.0.0.1`,
          url: `http://127.0.0.1:${PORT}`,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000
        }
      }
    : {})
});
