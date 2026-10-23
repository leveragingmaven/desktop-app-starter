/**
 * Transport-neutral Agency contracts.
 * Interfaces only: never trust a browser-supplied tenant ID for authorization.
 * The PHP server must derive identity from verified Agency SSO.
 */
export interface AgencySession {
  authenticated: true;
  displayName?: string;
  /** Informational only; server-side access checks must not trust this value on requests. */
  tenantLabel?: string;
}

export interface AgencySessionProvider {
  /** Server verifies the current SSO session; no standalone login flow. */
  getSession(): Promise<AgencySession | null>;
}

export interface AgencyStorage {
  /** Operations are scoped to the server-verified customer session. */
  read(documentKey: string): Promise<Uint8Array | null>;
  write(documentKey: string, content: Uint8Array): Promise<void>;
  remove(documentKey: string): Promise<void>;
}

export interface AgencySecrets {
  /** Raw credentials must never be returned to browser code. */
  has(key: string): Promise<boolean>;
  /** Secret is sent only to an authenticated HTTPS endpoint with CSRF protection. */
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

export interface AgencyAdapter {
  session: AgencySessionProvider;
  storage: AgencyStorage;
  secrets: AgencySecrets;
}
