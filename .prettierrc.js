import companionPrettier from '@companion-module/tools/.prettierrc.json' with { type: 'json' };

export default {
	...companionPrettier,
	semi: true,
	quoteProps: 'as-needed',
	trailingComma: 'all',
};
