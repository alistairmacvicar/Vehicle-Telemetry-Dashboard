// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs';
import js from '@eslint/js';
import nPlugin from 'eslint-plugin-n';

export default withNuxt(js.configs.recommended, nPlugin.configs['flat/recommended'], {
  rules: {
    // Disabled due to internal crash in @typescript-eslint/eslint-plugin@8.46.3
    // when processing Vue SFC files with ECharts option objects
    '@typescript-eslint/unified-signatures': 'off',
    'vue/html-self-closing': [
      'error',
      {
        html: {
          void: 'always',
          normal: 'always',
          component: 'always',
        },
        svg: 'always',
        math: 'always',
      },
    ],
    'n/no-missing-import': 'off', // Nuxt uses ~ and ~~ aliases
    'n/no-extraneous-import': 'off', // Nuxt manages dependencies differently
    'n/no-process-env': 'error',
    'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
  },
});
