//  @ts-check

import { tanstackConfig } from '@tanstack/eslint-config';

export default [
	{
		ignores: ['eslint.config.js', '.output/**'],
	},
	...tanstackConfig,
];
