import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    reporters: ['default', '@buddy-works/test-collector/vitest'],
    allowOnly: true,
  },
})
