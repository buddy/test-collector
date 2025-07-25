import { defineConfig, devices } from '@playwright/test'
import dotenv from 'dotenv'

dotenv.config({ path: '../../.env' })

export default defineConfig({
  testDir: './tests',
  reporter: [['html'], ['@buddy-works/test-collector/playwright']],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
