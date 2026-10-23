/**
 * Non-invasive branding metadata for future generated products.
 * This module does not replace the existing app title, theme, or icons.
 */
export interface AppBrand {
  appId: string;
  productName: string;
  publisher: string;
  supportUrl?: string;
}

export const MAVENSYNC_BRAND_TEMPLATE: Readonly<AppBrand> = Object.freeze({
  appId: 'space.mavensync.new-app',
  productName: 'New MavenSync App',
  publisher: 'MavenSync',
});

export function validateAppBrand(brand: AppBrand): AppBrand {
  if (!/^[a-z0-9]+(?:[.-][a-z0-9]+)+$/.test(brand.appId)) {
    throw new Error('appId must be a lowercase reverse-domain identifier');
  }
  if (!brand.productName.trim() || !brand.publisher.trim()) {
    throw new Error('productName and publisher must be non-empty');
  }
  if (brand.supportUrl && !brand.supportUrl.startsWith('https://')) {
    throw new Error('supportUrl must use HTTPS');
  }
  return { ...brand };
}
