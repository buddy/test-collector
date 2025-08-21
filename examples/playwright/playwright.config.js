import { defineConfig } from '@playwright/test'

export default defineConfig({
  forbidOnly: false,
  reporter: [['@buddy-works/unit-tests/playwright']],
})
