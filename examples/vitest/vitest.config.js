import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    reporters: ['default', '@buddy-works/unit-tests/vitest'],
    allowOnly: true,
  },
})
