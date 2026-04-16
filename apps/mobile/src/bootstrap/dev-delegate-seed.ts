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
  '0ab6b3d9066b78931921ee2190a4e582f6270a7ba51a70abe28981b6fb23249c';

const STORAGE_KEY = 'clawket.gatewayConfig.v1';

export async function seedDelegateConfigIfNeeded(): Promise<void> {
  if (!__DEV__) return;

  try {
    // Check if any config already exists — update token if stale
    const existing = await AsyncStorage.getItem(STORAGE_KEY).catch(() => null);
    if (existing) {
      try {
        const parsed = JSON.parse(existing);
        if (parsed?.delegate?.apiToken === DEV_DELEGATE_API_TOKEN) return;
        // Token changed — update it
        parsed.delegate = { apiUrl: DEV_DELEGATE_API_URL, apiToken: DEV_DELEGATE_API_TOKEN };
        parsed.updatedAt = Date.now();
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        // Also update configs state
        const stateStr = await AsyncStorage.getItem('clawket.gatewayConfigsState.v1').catch(() => null);
        if (stateStr) {
          const state = JSON.parse(stateStr);
          if (state.configs?.[0]) {
            state.configs[0].delegate = parsed.delegate;
            state.configs[0].updatedAt = parsed.updatedAt;
            await AsyncStorage.setItem('clawket.gatewayConfigsState.v1', JSON.stringify(state));
          }
        }
        console.log('[dev-delegate-seed] Updated Delegate token in AsyncStorage');
      } catch { /* parse error — re-seed below */ }
      return;
    }

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
