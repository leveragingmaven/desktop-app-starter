import { describe, expect, it } from 'vitest';
import { MAVENSYNC_BRAND_TEMPLATE, validateAppBrand } from './app-brand';

describe('application branding metadata', () => {
  it('accepts the default brand template', () => {
    expect(validateAppBrand(MAVENSYNC_BRAND_TEMPLATE).publisher).toBe('MavenSync');
  });
  it('rejects invalid application IDs', () => {
    expect(() => validateAppBrand({ ...MAVENSYNC_BRAND_TEMPLATE, appId: 'My App' })).toThrow();
  });
  it('requires HTTPS support links', () => {
    expect(() => validateAppBrand({ ...MAVENSYNC_BRAND_TEMPLATE, supportUrl: 'http://example.com' })).toThrow();
  });
});
