import { generateEslintConfig } from '@companion-module/tools/eslint/config.mjs';
import tseslint from 'typescript-eslint';

const generated = await generateEslintConfig({
	enableTypescript: true,
	ignores: ['.prettierrc.js'],
});

export default tseslint.config(...generated, {
	rules: {
		'@typescript-eslint/explicit-member-accessibility': 'error',
		'@typescript-eslint/promise-function-async': 'error',
		'require-await': 'off',
		'@typescript-eslint/require-await': 'error',
	},
	languageOptions: {
		parserOptions: {
			project: ['tsconfig.eslint.json'],
		},
	},
	settings: {
		'import/resolver': {
			typescript: {
				project: ['tsconfig.eslint.json'],
			},
		},
	},
});
