import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Application from 'expo-application';
import * as Notifications from 'expo-notifications';
import { Bell, RefreshCw, Smartphone, Trash2 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import {
  EmptyState,
  HeaderActionButton,
  LoadingState,
  createCardContentStyle,
} from '../../components/ui';
import { useAppContext } from '../../contexts/AppContext';
import { useNativeStackModalHeader } from '../../hooks/useNativeStackModalHeader';
import {
  listDelegateDevices,
  registerDelegateDevice,
  revokeDelegateDevice,
  type DelegateDevice,
} from '../../services/delegate-devices';
import { resolveGatewayBackendKind } from '../../services/gateway-backends';
import { useAppTheme } from '../../theme';
import { FontSize, FontWeight, Radius, Space } from '../../theme/tokens';
import { APP_PACKAGE_VERSION } from '../../constants/app-version';
import type { ConfigStackParamList } from './ConfigTab';

type Navigation = NativeStackNavigationProp<ConfigStackParamList, 'DelegatePushDevices'>;

function maskToken(token: string | null | undefined): string {
  if (!token) return '—';
  if (token.length <= 12) return token;
  return `${token.slice(0, 6)}…${token.slice(-6)}`;
}

function getPlatformLabel(platform: string): string {
  if (platform === 'ios') return 'iOS';
  if (platform === 'android') return 'Android';
  return platform;
}

export function DelegatePushDevicesScreen(): React.JSX.Element {
  const navigation = useNavigation<Navigation>();
  const { t } = useTranslation(['config', 'common']);
  const { theme } = useAppTheme();
  const { config, gateway, gatewayEpoch } = useAppContext();
  const styles = useMemo(() => createStyles(theme.colors), [theme.colors]);

  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [devices, setDevices] = useState<DelegateDevice[]>([]);
  const [error, setError] = useState<string | null>(null);

  const backendKind = resolveGatewayBackendKind(config);
  const delegateConfig = useMemo(
    () => (backendKind === 'delegate' ? gateway.getDelegateHttpConfig() : null),
    [backendKind, gateway, gatewayEpoch],
  );

  const loadDevices = useCallback(async () => {
    if (!delegateConfig) {
      setDevices([]);
      setError(t('No active Delegate connection.'));
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const list = await listDelegateDevices(delegateConfig);
      setDevices(list);
      setError(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('Failed to load devices');
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [delegateConfig, t]);

  useEffect(() => {
    void loadDevices();
  }, [loadDevices]);

  const handleRegister = useCallback(async () => {
    if (!delegateConfig || registering) return;
    setRegistering(true);
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        Alert.alert(
          t('Push notifications not enabled'),
          t('Grant notification permission in Settings to register this device.'),
        );
        return;
      }

      const tokenResult = await Notifications.getExpoPushTokenAsync();
      const pushToken = tokenResult.data;

      const appVersion =
        Application.nativeApplicationVersion?.trim() || APP_PACKAGE_VERSION;

      await registerDelegateDevice(delegateConfig, {
        platform: Platform.OS,
        pushToken,
        appVersion,
      });

      await loadDevices();
      Alert.alert(t('Device registered'), t('Push notifications are now enabled for this device.'));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('Registration failed');
      Alert.alert(t('Registration failed'), message);
    } finally {
      setRegistering(false);
    }
  }, [delegateConfig, loadDevices, registering, t]);

  const handleDisconnect = useCallback(
    (device: DelegateDevice) => {
      Alert.alert(
        t('Disconnect device?'),
        t('This device will no longer receive push notifications from Delegate.'),
        [
          { text: t('common:Cancel'), style: 'cancel' as const },
          {
            text: t('Disconnect'),
            style: 'destructive' as const,
            onPress: async () => {
              if (!delegateConfig) return;
              try {
                await revokeDelegateDevice(delegateConfig, device.id);
                await loadDevices();
              } catch (err: unknown) {
                const message = err instanceof Error ? err.message : t('Failed to disconnect device');
                Alert.alert(t('Disconnect failed'), message);
              }
            },
          },
        ],
      );
    },
    [delegateConfig, loadDevices, t],
  );

  const handleRefresh = useCallback(() => {
    void loadDevices();
  }, [loadDevices]);

  useNativeStackModalHeader({
    navigation,
    title: t('Push Devices'),
    onClose: () => navigation.goBack(),
    rightContent: (
      <HeaderActionButton
        icon={RefreshCw}
        onPress={handleRefresh}
        size={20}
      />
    ),
  });

  if (loading) {
    return <LoadingState message={t('Loading devices...')} />;
  }

  const scrollContentStyle = createCardContentStyle();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={scrollContentStyle}
      keyboardShouldPersistTaps="handled"
    >
      {/* Register / Update button */}
      <Pressable
        testID="delegate-push-devices-register"
        onPress={() => void handleRegister()}
        disabled={registering || !delegateConfig}
        style={({ pressed }) => [
          styles.primaryButton,
          (registering || !delegateConfig) && styles.primaryButtonDisabled,
          pressed && !(registering || !delegateConfig) && styles.primaryButtonPressed,
        ]}
      >
        <Bell size={15} color={theme.colors.primaryText} strokeWidth={2} />
        <Text style={styles.primaryButtonText}>
          {registering ? t('Registering…') : t('Register / Update this device')}
        </Text>
      </Pressable>

      {error ? (
        <EmptyState icon="⚠️" title={error} />
      ) : devices.length === 0 ? (
        <EmptyState
          icon="🔔"
          title={t('No devices registered')}
          subtitle={t('Tap Register to enable push notifications on this device.')}
        />
      ) : (
        <>
          <Text style={styles.sectionHeader}>{t('MY DEVICES')}</Text>
          <View style={styles.card}>
            {devices.map((device, idx) => (
              <React.Fragment key={device.id}>
                {idx > 0 && <View style={styles.divider} />}
                <View style={styles.deviceRow} testID={`delegate-push-device-row-${device.id}`}>
                  <View style={styles.deviceLead}>
                    <View style={styles.deviceIcon}>
                      <Smartphone size={17} strokeWidth={2.2} color={theme.colors.primary} />
                    </View>
                    <View style={styles.deviceText}>
                      <Text style={styles.devicePlatform}>
                        {getPlatformLabel(device.platform)}
                        {device.appVersion ? ` · v${device.appVersion}` : ''}
                      </Text>
                      <Text style={styles.deviceToken} numberOfLines={1} ellipsizeMode="middle">
                        {maskToken(device.pushToken)}
                      </Text>
                    </View>
                  </View>
                  <Pressable
                    testID={`delegate-push-device-disconnect-${device.id}`}
                    onPress={() => handleDisconnect(device)}
                    style={({ pressed }) => [styles.disconnectButton, pressed && styles.disconnectButtonPressed]}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Trash2 size={16} strokeWidth={2} color={theme.colors.error} />
                  </Pressable>
                </View>
              </React.Fragment>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

type Colors = ReturnType<typeof useAppTheme>['theme']['colors'];

function createStyles(colors: Colors) {
  return StyleSheet.create({
    sectionHeader: {
      fontSize: FontSize.xs,
      fontWeight: FontWeight.semibold,
      color: colors.textSubtle,
      letterSpacing: 0.5,
      marginTop: Space.lg,
      marginBottom: Space.sm,
      marginHorizontal: Space.lg,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: Radius.md,
      overflow: 'hidden',
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginLeft: Space.lg,
    },
    deviceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Space.lg,
      paddingVertical: Space.md,
    },
    deviceLead: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Space.sm,
    },
    deviceIcon: {
      width: 32,
      height: 32,
      borderRadius: Radius.sm,
      backgroundColor: colors.surfaceElevated,
      alignItems: 'center',
      justifyContent: 'center',
    },
    deviceText: {
      flex: 1,
    },
    devicePlatform: {
      fontSize: FontSize.base,
      fontWeight: FontWeight.semibold,
      color: colors.text,
    },
    deviceToken: {
      fontSize: FontSize.sm,
      color: colors.textSubtle,
      marginTop: 2,
    },
    disconnectButton: {
      padding: Space.xs,
    },
    disconnectButtonPressed: {
      opacity: 0.5,
    },
    primaryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Space.sm,
      backgroundColor: colors.primary,
      borderRadius: Radius.md,
      paddingVertical: 11,
    },
    primaryButtonDisabled: {
      opacity: 0.5,
    },
    primaryButtonPressed: {
      opacity: 0.88,
    },
    primaryButtonText: {
      fontSize: FontSize.base,
      fontWeight: FontWeight.semibold,
      color: colors.primaryText,
    },
  });
}
