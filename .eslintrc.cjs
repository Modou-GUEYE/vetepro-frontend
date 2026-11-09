module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'plugin:react-hooks/recommended', 'prettier'],
  ignorePatterns: ['dist', 'public', 'node_modules', '*.cjs', '*.config.*'],
  rules: { 'react-refresh/only-export-components': ['warn', { allowConstantExport: true }] },
};
