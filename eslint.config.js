import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  { ignores: ['dist', 'public'] },
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      // Libraries loaded with <script> tags in index.html, exactly as the old app had them as globals.
      globals: {
        ...globals.browser,
        $: 'readonly', jQuery: 'readonly', toastr: 'readonly', bootstrap: 'readonly',
        ApexCharts: 'readonly', Menu: 'readonly', Helpers: 'readonly', PerfectScrollbar: 'readonly',
        TableToExcel: 'readonly',
      },
    },
    plugins: { react, 'react-hooks': reactHooks },
    settings: { react: { version: 'detect' } },
    rules: {
      ...js.configs.recommended.rules,
      'react/jsx-uses-vars': 'error',
      'react/jsx-uses-react': 'off',
      'react/jsx-no-undef': 'error',
      'react/jsx-key': 'warn',
      'react/no-unknown-property': 'warn',
      'react-hooks/rules-of-hooks': 'error',
      'no-unused-vars': 'off',
      'no-empty': 'off',
      'no-useless-escape': 'off',
      'no-prototype-builtins': 'off',
    },
  },
];
