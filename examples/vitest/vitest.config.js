import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    reporters: ['default', 'hanging-process', '@buddy-works/unit-tests/vitest'],
    allowOnly: true,
  },
})
