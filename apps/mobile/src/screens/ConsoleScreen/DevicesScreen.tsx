import React from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { DevicesView } from '../../components/console/DevicesView';
import { useAppContext } from '../../contexts/AppContext';
import { useNativeStackModalHeader } from '../../hooks/useNativeStackModalHeader';
import type { ConsoleStackParamList } from './ConsoleTab';

type DevicesNavigation = NativeStackNavigationProp<ConsoleStackParamList, 'Devices'>;

export function DevicesScreen(): React.JSX.Element {
  const { gateway } = useAppContext();
  const { t } = useTranslation('console');
  const navigation = useNavigation<DevicesNavigation>();

  useNativeStackModalHeader({
    navigation,
    title: t('Devices'),
    onClose: () => navigation.goBack(),
  });

  return (
    <View testID="devices" style={{ flex: 1 }}>
      <DevicesView
        gateway={gateway}
        topInset={0}
        onBack={() => navigation.goBack()}
        hideHeader
      />
    </View>
  );
}
