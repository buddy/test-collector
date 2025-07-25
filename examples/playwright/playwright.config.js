import { defineConfig } from '@playwright/test'
import dotenv from 'dotenv'

dotenv.config({ path: '../../.env' })

export default defineConfig({
  forbidOnly: false,
  reporter: [['@buddy-works/test-collector/playwright']],
})
