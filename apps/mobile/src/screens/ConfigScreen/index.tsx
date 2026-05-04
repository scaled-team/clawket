import React, { useCallback, useRef } from 'react';
import { Platform, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { useTabBarHeight } from '../../hooks/useTabBarHeight';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import i18n from '../../i18n';
import { ConfigScreenLayout } from './ConfigScreenLayout';
import { QRScanResult } from './qrPayload';
import { useGatewayOverlay } from '../../contexts/GatewayOverlayContext';
import { useGatewayScanner } from '../../contexts/GatewayScannerContext';
import { useConfigScreenController } from './hooks/useConfigScreenController';
import type { ConfigStackParamList } from './ConfigTab';

export function ConfigScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useTabBarHeight();
  const controller = useConfigScreenController();
  const route = useRoute<RouteProp<ConfigStackParamList, 'ConfigHome'>>();
  const navigation = useNavigation();
  const { showOverlay } = useGatewayOverlay();
  const { openGatewayScanner, importGatewayQrImage } = useGatewayScanner();
  const scanDispatchLockedRef = useRef(false);
  const editingIdBeforeScanRef = useRef<string | null>(null);
  const handledAddRequestRef = useRef<number | null>(null);

  const applyOrCreate = useCallback(
    (result: QRScanResult) => {
      if (editingIdBeforeScanRef.current) {
        void controller.applyScannedConfig(result);
      } else {
        void controller.createFromScan(result);
      }
    },
    [controller],
  );

  const dispatchImportedResult = useCallback((result: QRScanResult) => {
    if (scanDispatchLockedRef.current) return;
    scanDispatchLockedRef.current = true;
    showOverlay(i18n.t('Switching Gateway...', { ns: 'common' }));
    void applyOrCreate(result);
  }, [applyOrCreate, showOverlay]);

  const handleScanQR = useCallback(() => {
    scanDispatchLockedRef.current = false;
    editingIdBeforeScanRef.current = controller.editingConfigId;
    controller.closeEditor();
    setTimeout(() => {
      openGatewayScanner({
        onScanned: (result) => {
          dispatchImportedResult(result);
        },
        onCancel: () => {
          scanDispatchLockedRef.current = false;
          const prevId = editingIdBeforeScanRef.current;
          if (prevId) {
            controller.openEditEditor(prevId);
          }
        },
      });
    }, 350);
  }, [controller, dispatchImportedResult, openGatewayScanner]);

  React.useEffect(() => {
    const requestedAt = route.params?.addConnectionRequestAt;
    if (!requestedAt) return;
    if (handledAddRequestRef.current === requestedAt) return;
    handledAddRequestRef.current = requestedAt;
    const preferredTab = route.params?.addConnectionTab === 'manual' ? 'manual' : 'quick';
    controller.openCreateEditor(preferredTab);
    (navigation as { setParams: (params: ConfigStackParamList['ConfigHome']) => void }).setParams({
      addConnectionRequestAt: undefined,
      addConnectionTab: undefined,
    });
  }, [controller, navigation, route.params?.addConnectionRequestAt, route.params?.addConnectionTab]);

  const handleUploadQR = useCallback(() => {
    scanDispatchLockedRef.current = false;
    editingIdBeforeScanRef.current = controller.editingConfigId;
    controller.closeEditor();
    setTimeout(async () => {
      await importGatewayQrImage({
        onScanned: (result) => {
          dispatchImportedResult(result);
        },
        onCancel: () => {
          scanDispatchLockedRef.current = false;
          const prevId = editingIdBeforeScanRef.current;
          if (prevId) {
            controller.openEditEditor(prevId);
          }
        },
      });
    }, 350);
  }, [controller, dispatchImportedResult, importGatewayQrImage]);

  const extendedController = {
    ...controller,
    onScanQR: handleScanQR,
    onUploadQR: handleUploadQR,
  };

  const content = (
    <ConfigScreenLayout insets={insets} tabBarHeight={tabBarHeight} controller={extendedController} />
  );

  // iOS native bottom tabs render each tab in a separate native UIViewController,
  // so the app-level GestureHandlerRootView cannot reach into it.
  // Wrap with a local GestureHandlerRootView to enable Swipeable gestures.
  if (Platform.OS === 'ios') {
    return (
      <GestureHandlerRootView testID="tab-Config-body" style={{ flex: 1 }}>
        {content}
      </GestureHandlerRootView>
    );
  }

  return (
    <View testID="tab-Config-body" style={{ flex: 1 }}>
      {content}
    </View>
  );
}
