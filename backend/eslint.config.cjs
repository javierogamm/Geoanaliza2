const tseslint = require('typescript-eslint');
const js = require('@eslint/js');

module.exports = [
  {
    ignores: ['dist']
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    rules: {
      '@typescript-eslint/explicit-module-boundary-types': 'off'
    }
  }
];
