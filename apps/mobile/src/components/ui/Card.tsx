import React from 'react';
import { StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native';
import { useAppTheme } from '../../theme';
import { Radius, Space } from '../../theme/tokens';

type Props = {
  onPress?: () => void;
  disabled?: boolean;
  style?: ViewStyle | (ViewStyle | false | undefined)[];
  children: React.ReactNode;
  testID?: string;
};

export function Card({ onPress, disabled, style, children, testID }: Props): React.JSX.Element {
  const { theme } = useAppTheme();
  const { colors } = theme;
  const cardStyle = [styles.card, { backgroundColor: colors.surface }, style];

  if (onPress) {
    return (
      <TouchableOpacity
        style={cardStyle}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.7}
        testID={testID}
      >
        {children}
      </TouchableOpacity>
    );
  }
  return <View style={cardStyle} testID={testID}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.md,
    padding: Space.lg - 2,
  },
});
