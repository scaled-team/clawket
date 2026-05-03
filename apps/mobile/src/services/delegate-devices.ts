/**
 * Typed service wrappers for Delegate device/push-registration endpoints.
 *
 * Endpoints mirrored:
 *   GET    /api/devices                         (list devices for current user)
 *   POST   /api/devices                         (register or update a device)
 *   DELETE /api/devices/[id]                    (revoke / disconnect a device)
 */

import { type DelegateConnectionConfig, normalizeUrl } from './delegate-http-adapter';

export type DelegateDevice = {
  id: string;
  platform: string;          // 'ios' | 'android'
  appVersion?: string | null;
  pushToken?: string | null;
  registered: boolean;
  createdAt: string;
  updatedAt: string;
};

export type RegisterDelegateDeviceInput = {
  platform: string;
  pushToken?: string;
  appVersion?: string;
};

function authHeaders(config: DelegateConnectionConfig, json = false): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${config.apiToken}`,
  };
  if (json) headers['Content-Type'] = 'application/json';
  return headers;
}

async function unwrap<T>(res: Response, label: string): Promise<T> {
  if (!res.ok) throw new Error(`${label} failed: ${res.status}`);
  const json = await res.json();
  return (json?.data ?? json) as T;
}

/** Register or update the current device's push token. Returns the upserted device record. */
export async function registerDelegateDevice(
  config: DelegateConnectionConfig,
  input: RegisterDelegateDeviceInput,
): Promise<DelegateDevice> {
  const url = `${normalizeUrl(config.apiUrl)}/api/devices`;
  const res = await fetch(url, {
    method: 'POST',
    headers: authHeaders(config, true),
    body: JSON.stringify(input),
  });
  return unwrap<DelegateDevice>(res, 'registerDelegateDevice');
}

/** List all registered devices for the authenticated user. */
export async function listDelegateDevices(
  config: DelegateConnectionConfig,
): Promise<DelegateDevice[]> {
  const url = `${normalizeUrl(config.apiUrl)}/api/devices`;
  const res = await fetch(url, {
    headers: authHeaders(config),
  });
  return unwrap<DelegateDevice[]>(res, 'listDelegateDevices');
}

/** Revoke / disconnect a device by its id. */
export async function revokeDelegateDevice(
  config: DelegateConnectionConfig,
  deviceId: string,
): Promise<void> {
  const url = `${normalizeUrl(config.apiUrl)}/api/devices/${deviceId}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: authHeaders(config),
  });
  if (!res.ok) throw new Error(`revokeDelegateDevice failed: ${res.status}`);
}
