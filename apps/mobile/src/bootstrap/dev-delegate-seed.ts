/**
 * Dev-only: Auto-seed a Delegate gateway config on first launch.
 *
 * Uses AsyncStorage directly (not SecureStore) because SecureStore
 * can fail on fresh simulator boots before keychain is ready.
 * The app's StorageService falls through to legacy storage paths
 * that read from AsyncStorage, so this seed is picked up on next read.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { GatewayConfigsState, SavedGatewayConfig } from '../types';

// Change these to match your local Delegate instance.
const DEV_DELEGATE_API_URL = 'http://127.0.0.1:1337';
const DEV_DELEGATE_API_TOKEN =
  '1672236262f5987d866e6d4b8d87a036b97315785336c88fcd1b7e612ff6cd9e';

const STORAGE_KEY = 'clawket.gatewayConfig.v1';

export async function seedDelegateConfigIfNeeded(): Promise<void> {
  if (!__DEV__) return;

  try {
    // Check if any config already exists (in either store)
    const existing = await AsyncStorage.getItem(STORAGE_KEY).catch(() => null);
    if (existing) return;

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

    // Write as the legacy single-config format that StorageService.getGatewayConfig() reads
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(config));

    // Also write the configs state so the app picks it up
    const state: GatewayConfigsState = {
      activeId: config.id,
      configs: [config],
    };
    await AsyncStorage.setItem('clawket.gatewayConfigsState.v1', JSON.stringify(state));

    console.log('[dev-delegate-seed] Seeded Delegate gateway config via AsyncStorage');
  } catch (e) {
    console.warn('[dev-delegate-seed] Failed to seed:', e);
  }
}
