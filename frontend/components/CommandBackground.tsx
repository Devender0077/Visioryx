/**
 * Reusable command-center background — subtle grid + corner brackets
 * + radial glow. Place at the root of a screen, behind all content.
 */
import { memo } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Svg, Defs, Pattern, Path, Rect, LinearGradient as SvgGradient, Stop, RadialGradient } from 'react-native-svg';
import { PaletteDark } from '@/constants/visionTheme';

interface Props {
  /** Background color underneath the grid. */
  color?: string;
  /** Show top-radial glow */
  glow?: boolean;
}

export const CommandBackground = memo(function CommandBackground({
  color = PaletteDark.bg,
  glow = true,
}: Props) {
  return (
    <View
      style={[StyleSheet.absoluteFillObject, { backgroundColor: color }]}
      pointerEvents="none"
      testID="command-bg"
    >
      <Svg
        width="100%"
        height="100%"
        // @ts-ignore — RN-Web accepts style
        style={Platform.OS === 'web' ? { position: 'absolute', inset: 0 } : undefined}
        preserveAspectRatio="xMidYMid slice"
      >
        <Defs>
          <Pattern id="vxGrid" width="36" height="36" patternUnits="userSpaceOnUse">
            <Path
              d="M 36 0 L 0 0 0 36"
              fill="none"
              stroke={PaletteDark.primary}
              strokeOpacity={0.05}
              strokeWidth={0.5}
            />
          </Pattern>
          {glow ? (
            <RadialGradient id="vxGlow" cx="50%" cy="0%" r="55%">
              <Stop offset="0%" stopColor={PaletteDark.primary} stopOpacity={0.22} />
              <Stop offset="50%" stopColor={PaletteDark.primaryActive} stopOpacity={0.06} />
              <Stop offset="100%" stopColor={PaletteDark.primary} stopOpacity={0} />
            </RadialGradient>
          ) : null}
        </Defs>
        <Rect width="100%" height="100%" fill="url(#vxGrid)" />
        {glow ? <Rect width="100%" height="100%" fill="url(#vxGlow)" /> : null}
      </Svg>
    </View>
  );
});
