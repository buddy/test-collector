const { test } = require('@playwright/test')

const prefix = `[playwright ${require('./package.json').devDependencies['@playwright/test']}]`

module.exports = {
  prefixedTest: test.extend({
    page: async ({ page }, use, testInfo) => {
      testInfo.title = `${prefix} ${testInfo.title}`
      await use(page)
    },
  }),
}
