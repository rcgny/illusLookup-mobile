// https://docs.expo.dev/guides/using-eslint/
// This file defines lint rules used by `npm run lint`.
// We extend Expo's flat config and only add project-specific ignore patterns.
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
	expoConfig,
	{
		ignores: ['dist/*'],
	},
]);
