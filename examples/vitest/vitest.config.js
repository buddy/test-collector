import dotenv from 'dotenv'
import { defineConfig } from 'vitest/config'

dotenv.config({ path: '../../.env' })

export default defineConfig({
  test: {
    reporters: ['default', '@buddy-works/unit-tests/vitest'],
    allowOnly: true,
  },
})
