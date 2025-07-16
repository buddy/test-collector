// @ts-check

/**
 * @see https://prettier.io/docs/configuration
 * @type {import('prettier').Config}
 */
const config = {
  semi: false,
  singleQuote: true,
  plugins: ['@trivago/prettier-plugin-sort-imports'],
  importOrder: ['^node:*$', '<THIRD_PARTY_MODULES>', '^@/(.*)$', '^\\..*$'],
  importOrderSortSpecifiers: true,
  printWidth: 120,
}

export default config
