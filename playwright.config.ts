import { defineConfig, devices } from '@playwright/test';
import fs from 'fs';

// A saved login (localStorage with the token), made once with:
//   npx playwright codegen --save-storage=e2e/.auth.json http://localhost:5173
// Log in with "Remember me" checked and close the window. The file is never committed.
const authFile = 'e2e/.auth.json';
const storageState = fs.existsSync(authFile) ? authFile : undefined;

// Mobile first audits (layout overflow, touch targets and axe) against the vite dev server.
// Run: npx playwright test   (starts `npm start` if it is not already running)
export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e-results/output',
  timeout: 90_000,
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    storageState,
    locale: 'sv-SE',
    timezoneId: 'Europe/Stockholm'
  },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } } },
    { name: 'small-mobile', use: { ...devices['Pixel 7'], viewport: { width: 360, height: 740 } } },
    // The pages must still work on a tablet and a big screen
    {
      name: 'tablet',
      use: { ...devices['iPad (gen 7)'], defaultBrowserType: 'chromium', viewport: { width: 768, height: 1024 } }
    },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } }
  ],
  webServer: {
    command: 'npx vite --port 5173 --strictPort',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 120_000
  }
});
