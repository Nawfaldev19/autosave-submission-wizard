import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config';

const STRONG_SECRET = 'test-only-'.padEnd(40, 'q');

describe('configuration', () => {
  it('uses development defaults when nothing is set', () => {
    const config = loadConfig({});
    expect(config).toMatchObject({
      port: 4400,
      production: false,
      secureCookies: false,
      trustProxy: 0,
      pressTimeZone: 'Europe/Dublin',
      allowedOrigins: ['http://localhost:5180'],
    });
    expect(config.storageDir).toMatch(/server\/storage\/$/);
  });

  it('refuses values that would only fail later, naming each variable', () => {
    const attempt = () =>
      loadConfig({
        PORT: 'abc',
        ALLOWED_ORIGINS: 'http://localhost:5180, https://press.example.com/',
        PRESS_TIME_ZONE: 'Mars/Olympus_Mons',
        TRUST_PROXY: 'yes',
        SESSION_COOKIE_SECURE: 'on',
      });
    expect(attempt).toThrow(/PORT/);
    expect(attempt).toThrow(/ALLOWED_ORIGINS.*no path or trailing slash/);
    expect(attempt).toThrow(/PRESS_TIME_ZONE: Use an IANA time zone/);
    expect(attempt).toThrow(/TRUST_PROXY/);
    expect(attempt).toThrow(/SESSION_COOKIE_SECURE/);
  });

  it('reads proxy hops, origins and a relative storage folder', () => {
    const config = loadConfig({
      TRUST_PROXY: '2',
      ALLOWED_ORIGINS: 'https://press.example.com, http://localhost:5180',
      STORAGE_DIR: './storage',
    });
    expect(config.trustProxy).toBe(2);
    expect(loadConfig({ TRUST_PROXY: 'true' }).trustProxy).toBe(1);
    expect(config.allowedOrigins).toEqual(['https://press.example.com', 'http://localhost:5180']);
    expect(config.storageDir).toBe(`${process.cwd()}/storage`);
  });

  it('requires a strong, non-example session secret in production', () => {
    const production = (secret?: string) => () =>
      loadConfig({ NODE_ENV: 'production', ...(secret === undefined ? {} : { SESSION_SECRET: secret }) });
    expect(production()).toThrow(/SESSION_SECRET: required/);
    expect(production('x')).toThrow(/at least 32 bytes/);
    expect(production('change-me-for-anything-but-a-local-demo')).toThrow(/example value/);
    expect(production('replace-with-a-long-random-value')).toThrow(/example value/);
    const config = production(STRONG_SECRET)();
    expect(config).toMatchObject({ production: true, secureCookies: true, sessionSecret: STRONG_SECRET });
  });
});
