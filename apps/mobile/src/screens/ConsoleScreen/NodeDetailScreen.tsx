import React from 'react';
import { View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NodeDetailView } from '../../components/console/NodeDetailView';
import { useAppContext } from '../../contexts/AppContext';
import type { ConsoleStackParamList } from './ConsoleTab';

type NodeDetailNavigation = NativeStackNavigationProp<ConsoleStackParamList, 'NodeDetail'>;
type NodeDetailRoute = RouteProp<ConsoleStackParamList, 'NodeDetail'>;

export function NodeDetailScreen(): React.JSX.Element {
  const { gateway, nodeCapabilityToggles, onNodeCapabilityTogglesChange } = useAppContext();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NodeDetailNavigation>();
  const route = useRoute<NodeDetailRoute>();

  return (
    <View testID="node-detail" style={{ flex: 1 }}>
      <NodeDetailView
        gateway={gateway}
        nodeId={route.params.nodeId}
        displayName={route.params.displayName}
        nodeCapabilityToggles={nodeCapabilityToggles}
        onNodeCapabilityTogglesChange={onNodeCapabilityTogglesChange}
        topInset={insets.top}
        onBack={() => navigation.goBack()}
        dismissStyle="close"
      />
    </View>
  );
}
