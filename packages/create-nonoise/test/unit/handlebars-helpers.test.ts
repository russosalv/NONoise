import { describe, it, expect } from 'vitest';
import { toPascalCase, toSnakeCase } from '../../src/handlebars-helpers.js';

describe('toPascalCase', () => {
  it('converts kebab-case to PascalCase', () => {
    expect(toPascalCase('my-app')).toBe('MyApp');
  });

  it('handles single word', () => {
    expect(toPascalCase('app')).toBe('App');
  });

  it('handles multiple segments', () => {
    expect(toPascalCase('my-awesome-app')).toBe('MyAwesomeApp');
  });

  it('strips leading/trailing hyphens', () => {
    expect(toPascalCase('-my-app-')).toBe('MyApp');
  });

  it('handles digits', () => {
    expect(toPascalCase('app-v2')).toBe('AppV2');
  });
});

describe('toSnakeCase', () => {
  it('converts kebab-case to snake_case', () => {
    expect(toSnakeCase('my-app')).toBe('my_app');
  });

  it('handles single word', () => {
    expect(toSnakeCase('app')).toBe('app');
  });

  it('handles multiple segments', () => {
    expect(toSnakeCase('my-awesome-app')).toBe('my_awesome_app');
  });

  it('strips leading/trailing hyphens', () => {
    expect(toSnakeCase('-my-app-')).toBe('my_app');
  });
});
