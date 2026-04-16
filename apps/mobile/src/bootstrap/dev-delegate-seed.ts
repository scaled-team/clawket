/**
 * Dev-only: Auto-seed a Delegate gateway config on first launch.
 *
 * This lets developers see the Delegate backend working immediately
 * on the iOS Simulator without scanning a QR code. Only runs when
 * __DEV__ is true and no gateway configs exist yet.
 */
import { StorageService } from '../services/storage';
import type { GatewayConfigsState, SavedGatewayConfig } from '../types';

// Change these to match your local Delegate instance.
const DEV_DELEGATE_API_URL = 'http://127.0.0.1:1337';
const DEV_DELEGATE_API_TOKEN =
  '1672236262f5987d866e6d4b8d87a036b97315785336c88fcd1b7e612ff6cd9e';

export async function seedDelegateConfigIfNeeded(): Promise<void> {
  if (!__DEV__) return;

  const state = await StorageService.getGatewayConfigsState();
  if (state.configs.length > 0) return; // already has configs

  const now = Date.now();
  const config: SavedGatewayConfig = {
    id: 'dev_delegate',
    name: 'Delegate (Dev)',
    backendKind: 'delegate',
    transportKind: 'custom',
    mode: 'delegate',
    url: DEV_DELEGATE_API_URL,
    delegate: {
      apiUrl: DEV_DELEGATE_API_URL,
      apiToken: DEV_DELEGATE_API_TOKEN,
    },
    createdAt: now,
    updatedAt: now,
  };

  const nextState: GatewayConfigsState = {
    activeId: config.id,
    configs: [config],
  };

  await StorageService.setGatewayConfigsState(nextState);
  console.log('[dev-delegate-seed] Seeded Delegate gateway config for dev');
}
