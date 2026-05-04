import React, { useMemo } from 'react';
import type { LucideIcon } from 'lucide-react-native';
import { IconButton } from './IconButton';
import { useAppTheme } from '../../theme';

type Tone = 'default' | 'accent' | 'destructive';

type Props = {
  icon: LucideIcon;
  onPress: () => void;
  disabled?: boolean;
  tone?: Tone;
  size?: number;
  strokeWidth?: number;
  buttonSize?: number;
  testID?: string;
};

function resolveIconColor(tone: Tone, colors: ReturnType<typeof useAppTheme>['theme']['colors']): string {
  if (tone === 'accent') return colors.primary;
  if (tone === 'destructive') return colors.error;
  return colors.textMuted;
}

export function HeaderActionButton({
  icon: Icon,
  onPress,
  disabled = false,
  tone = 'default',
  size = 18,
  strokeWidth = 2,
  buttonSize = 44,
  testID,
}: Props): React.JSX.Element {
  const { theme } = useAppTheme();
  const color = useMemo(
    () => resolveIconColor(tone, theme.colors),
    [theme.colors, tone],
  );

  return (
    <IconButton
      size={buttonSize}
      icon={<Icon size={size} color={color} strokeWidth={strokeWidth} />}
      onPress={onPress}
      disabled={disabled}
      testID={testID}
    />
  );
}
