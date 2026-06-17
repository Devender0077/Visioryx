/**
 * VisionaryX Logo — flexible SVG mark.
 *
 * Two visual variants:
 *  - `mark`: just the bracketed-X glyph (square 1:1)
 *  - `wordmark`: glyph + "VISIONARY X" wordmark to the right
 *
 * Pure SVG (no images), works in RN + RN-Web.
 */
import { memo } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Svg, Path, Rect, Line, Circle } from 'react-native-svg';
import { PaletteDark, FontFamily } from '@/constants/visionTheme';

interface Props {
  size?: number;
  color?: string;
  accent?: string;
  variant?: 'mark' | 'wordmark';
  testID?: string;
}

export const VisionaryXLogo = memo(function VisionaryXLogo({
  size = 32,
  color = PaletteDark.primaryAccent,
  accent = PaletteDark.primary,
  variant = 'mark',
  testID,
}: Props) {
  const bracket = 0.18 * size; // bracket arm length
  const stroke = Math.max(1.5, size * 0.06);

  const Mark = (
    <Svg width={size} height={size} viewBox="0 0 32 32" testID={testID ? `${testID}-mark` : 'vx-logo-mark'}>
      {/* Top-left bracket */}
      <Path d={`M2 8 L2 2 L8 2`} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" />
      {/* Top-right bracket */}
      <Path d={`M24 2 L30 2 L30 8`} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" />
      {/* Bottom-left bracket */}
      <Path d={`M2 24 L2 30 L8 30`} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" />
      {/* Bottom-right bracket */}
      <Path d={`M24 30 L30 30 L30 24`} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" />
      {/* X strokes */}
      <Line x1="9" y1="9" x2="23" y2="23" stroke={accent} strokeWidth={stroke} strokeLinecap="round" />
      <Line x1="23" y1="9" x2="9" y2="23" stroke={accent} strokeWidth={stroke} strokeLinecap="round" />
      {/* Sentinel eye dot */}
      <Circle cx="16" cy="16" r={stroke * 0.7} fill={color} />
    </Svg>
  );

  if (variant === 'mark') return Mark;

  return (
    <View style={styles.wordmarkRow} testID={testID ?? 'vx-logo-wordmark'}>
      {Mark}
      <View style={{ marginLeft: size * 0.35 }}>
        <Text style={[styles.wordmark, { fontSize: size * 0.55, color }]}>VISIONARY</Text>
        <Text style={[styles.wordmarkX, { fontSize: size * 0.55, color: accent, marginTop: -size * 0.08 }]}>
          X<Text style={[styles.wordmarkDot, { color }]}>·</Text>
        </Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  wordmarkRow: { flexDirection: 'row', alignItems: 'center' },
  wordmark: {
    fontFamily: Platform.select({ web: FontFamily.display, default: FontFamily.display }),
    letterSpacing: 2,
    lineHeight: undefined,
  },
  wordmarkX: {
    fontFamily: FontFamily.display,
    letterSpacing: 4,
  },
  wordmarkDot: { letterSpacing: 0, opacity: 0.6 },
});
