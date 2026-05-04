import React, { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import { RouteProp, useNavigation, usePreventRemove, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FileEditorView } from '../../components/console/FileEditorView';
import { useAppContext } from '../../contexts/AppContext';
import type { ConsoleStackParamList } from './ConsoleTab';

type FileEditorNavigation = NativeStackNavigationProp<ConsoleStackParamList, 'FileEditor'>;
type FileEditorRoute = RouteProp<ConsoleStackParamList, 'FileEditor'>;

export function FileEditorScreen(): React.JSX.Element {
  const { gateway, currentAgentId } = useAppContext();
  const { t } = useTranslation('console');
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<FileEditorNavigation>();
  const route = useRoute<FileEditorRoute>();
  const [hasChanges, setHasChanges] = useState(false);

  usePreventRemove(hasChanges, ({ data }) => {
    Alert.alert(t('Discard changes?'), t('You have unsaved changes.'), [
      { text: t('Keep Editing'), style: 'cancel' },
      {
        text: t('Discard'),
        style: 'destructive',
        onPress: () => navigation.dispatch(data.action),
      },
    ]);
  });

  return (
    <View testID="file-editor" style={{ flex: 1 }}>
      <FileEditorView
        gateway={gateway}
        topInset={insets.top}
        fileName={route.params.fileName}
        onBack={() => navigation.goBack()}
        onDirtyChange={setHasChanges}
        agentId={currentAgentId}
        dismissStyle="close"
      />
    </View>
  );
}
