import React from 'react';
import { View } from 'react-native';
import { DiscoverTabNavigator } from './sharedNavigator';

export type { DiscoverStackParamList } from './sharedNavigator';

export function DiscoverTab(): React.JSX.Element {
  return (
    <View testID="tab-Discover-body" style={{ flex: 1 }}>
      <DiscoverTabNavigator />
    </View>
  );
}
