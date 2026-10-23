import { describe, expect, it } from 'vitest';
import { isAgencyTarget, parseAppTarget } from './target';

describe('deployment target configuration', () => {
  it('defaults to the existing desktop application', () => {
    expect(parseAppTarget(undefined)).toBe('desktop');
    expect(parseAppTarget('')).toBe('desktop');
  });

  it('accepts explicit supported targets', () => {
    expect(parseAppTarget('desktop')).toBe('desktop');
    expect(parseAppTarget('agency')).toBe('agency');
    expect(isAgencyTarget('agency')).toBe(true);
    expect(isAgencyTarget('desktop')).toBe(false);
  });

  it('rejects unsupported targets rather than silently changing behavior', () => {
    expect(() => parseAppTarget('web')).toThrow('Invalid VITE_APP_TARGET');
  });
});
