// @ts-check
import js from '@eslint/js'
import eslintParserTypeScript from '@typescript-eslint/parser'
import eslintPluginUnicorn from 'eslint-plugin-unicorn'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config([
  {
    ignores: ['node_modules/**/*', 'examples/**/*', 'dist/**/*', '*.config.mjs', 'src/api/types/rest.ts'],
  },
  {
    files: ['**/*.{js,mjs,ts}'],
    plugins: { js },
    extends: [js.configs.recommended],
  },
  {
    files: ['**/*.{js,mjs,ts}'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['**/*.{ts}'],
    languageOptions: {
      parser: eslintParserTypeScript,
      parserOptions: {
        project: true,
      },
    },
  },
  eslintPluginUnicorn.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/prefer-nullish-coalescing': [
        'error',
        {
          ignorePrimitives: { string: true },
        },
      ],
      'unicorn/prevent-abbreviations': [
        2,
        {
          replacements: {
            ref: false,
          },
        },
      ],
      '@typescript-eslint/restrict-template-expressions': [0, { allowNumber: true }],
      'no-control-regex': 0,
    },
  },
])
