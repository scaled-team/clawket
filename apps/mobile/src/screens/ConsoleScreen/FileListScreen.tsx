import React from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { FileListView } from '../../components/console/FileListView';
import { useAppContext } from '../../contexts/AppContext';
import { useNativeStackModalHeader } from '../../hooks/useNativeStackModalHeader';
import type { ConsoleStackParamList } from './ConsoleTab';

type FileListNavigation = NativeStackNavigationProp<ConsoleStackParamList, 'FileList'>;

export function FileListScreen(): React.JSX.Element {
  const { gateway, currentAgentId } = useAppContext();
  const { t } = useTranslation('console');
  const navigation = useNavigation<FileListNavigation>();

  useNativeStackModalHeader({
    navigation,
    title: t('Memory'),
    onClose: () => navigation.goBack(),
  });

  return (
    <View testID="file-list" style={{ flex: 1 }}>
      <FileListView
        gateway={gateway}
        topInset={0}
        onBack={() => navigation.goBack()}
        onOpenFile={(name) => navigation.navigate('FileEditor', { fileName: name })}
        agentId={currentAgentId}
        hideHeader
      />
    </View>
  );
}
