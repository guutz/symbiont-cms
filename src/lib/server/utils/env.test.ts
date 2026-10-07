import { afterEach, describe, expect, it } from 'vitest';
import { readEnvVar, requireEnvVar, setEnvSource } from './env.js';

describe('env source', () => {
	afterEach(() => {
		setEnvSource(null);
		delete process.env.SYMBIONT_ENV_TEST;
	});

	it('reads process.env when nothing is injected', () => {
		process.env.SYMBIONT_ENV_TEST = 'from-process';
		expect(readEnvVar('SYMBIONT_ENV_TEST')).toBe('from-process');
	});

	it('reads an injected source -- the vite dev case, where process.env lacks .env', () => {
		setEnvSource({ SYMBIONT_ENV_TEST: 'from-injected' });
		expect(requireEnvVar('SYMBIONT_ENV_TEST')).toBe('from-injected');
	});

	it('prefers the injected source, and falls back to process.env for anything it lacks', () => {
		process.env.SYMBIONT_ENV_TEST = 'from-process';
		setEnvSource({ SYMBIONT_ENV_TEST: 'from-injected' });
		expect(readEnvVar('SYMBIONT_ENV_TEST')).toBe('from-injected');
		setEnvSource({ SOMETHING_ELSE: 'x' });
		expect(readEnvVar('SYMBIONT_ENV_TEST')).toBe('from-process');
	});

	it('still throws when neither has it', () => {
		setEnvSource({});
		expect(() => requireEnvVar('SYMBIONT_ENV_TEST', 'hint.')).toThrow(/SYMBIONT_ENV_TEST.*hint\./);
	});
});
