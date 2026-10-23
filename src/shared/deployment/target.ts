/**
 * Deployment target selection for future adapters.
 * The existing Electron runtime remains the default. This module does not
 * implement Agency authentication or transport.
 */
export type AppTarget = 'desktop' | 'agency';

export function parseAppTarget(value: string | undefined): AppTarget {
  if (value === undefined || value === '' || value === 'desktop') return 'desktop';
  if (value === 'agency') return 'agency';
  throw new Error('Invalid VITE_APP_TARGET: expected "desktop" or "agency"');
}

/** Never infer Agency identity or authorization from this build-time setting. */
export function isAgencyTarget(target: AppTarget): boolean {
  return target === 'agency';
}
