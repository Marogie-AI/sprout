import { describe, expect, test } from 'vitest';
import { buildConnectionEnv, buildConnectionString } from '../src/url.js';

const base = {
  user: 'postgres',
  password: 'postgres',
  internal_host: 'db',
  database: 'appdb',
  url_var: 'DATABASE_URL',
  mirror_vars: [] as string[],
};

describe('buildConnectionString', () => {
  test('builds a postgres URL from the internal docker host', () => {
    expect(buildConnectionString(base)).toBe('postgresql://postgres:postgres@db:5432/appdb');
  });

  test('url-encodes special characters in user and password', () => {
    expect(buildConnectionString({ ...base, user: 'a@b', password: 'p@ss:w/rd' })).toBe(
      'postgresql://a%40b:p%40ss%3Aw%2Frd@db:5432/appdb',
    );
  });
});

describe('buildConnectionEnv', () => {
  test('maps the connection string under url_var', () => {
    expect(buildConnectionEnv(base)).toEqual({
      DATABASE_URL: 'postgresql://postgres:postgres@db:5432/appdb',
    });
  });

  test('mirrors the same value into every mirror_var', () => {
    expect(
      buildConnectionEnv({ ...base, mirror_vars: ['DATABASE_URL_UNPOOLED', 'DIRECT_URL'] }),
    ).toEqual({
      DATABASE_URL: 'postgresql://postgres:postgres@db:5432/appdb',
      DATABASE_URL_UNPOOLED: 'postgresql://postgres:postgres@db:5432/appdb',
      DIRECT_URL: 'postgresql://postgres:postgres@db:5432/appdb',
    });
  });
});
