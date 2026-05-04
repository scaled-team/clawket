import React from 'react';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AccentColorId, ThemeMode } from '../types';
import { AccentScale, AppThemeProvider } from '../theme';
import { AnalyticsProvider } from '../services/analytics/AnalyticsProvider';
import { StorageService } from '../services/storage';
import {
  DelegateLiveEventsProvider,
  type GetConnection as GetDelegateConnection,
} from '../contexts/DelegateLiveEventsContext';
import { WorkspaceProvider } from '../contexts/WorkspaceContext';

type Props = {
  accentId: AccentColorId;
  children: React.ReactNode;
  customAccent: AccentScale | null;
  mode: ThemeMode;
  onAccentChange: (nextAccentId: AccentColorId) => void;
  onModeChange: (nextMode: ThemeMode) => void;
  /**
   * Returns the active Delegate apiUrl + apiToken (or null) — used by
   * `DelegateLiveEventsProvider` to fetch a Supabase Realtime JWT and
   * subscribe to `user:{userId}` broadcasts. When omitted the provider
   * stays inert (consumers receive no events; `subscribe()` is a no-op).
   */
  getDelegateConnection?: GetDelegateConnection;
};

export function AppProviders({
  accentId,
  children,
  customAccent,
  mode,
  onAccentChange,
  onModeChange,
  getDelegateConnection,
}: Props): React.JSX.Element {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <SafeAreaProvider>
          <AnalyticsProvider>
            <BottomSheetModalProvider>
              <AppThemeProvider
                mode={mode}
                accentId={accentId}
                customAccent={customAccent}
                setMode={(nextMode) => {
                  onModeChange(nextMode);
                  StorageService.setThemeMode(nextMode);
                }}
                setAccentId={(nextAccentId) => {
                  onAccentChange(nextAccentId);
                  StorageService.setAccentColor(nextAccentId);
                }}
              >
                <DelegateLiveEventsProvider
                  enabled={!!getDelegateConnection}
                  getConnection={getDelegateConnection}
                >
                  <WorkspaceProvider
                    enabled={!!getDelegateConnection}
                    getConnection={getDelegateConnection}
                  >
                    {children}
                  </WorkspaceProvider>
                </DelegateLiveEventsProvider>
              </AppThemeProvider>
            </BottomSheetModalProvider>
          </AnalyticsProvider>
        </SafeAreaProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
