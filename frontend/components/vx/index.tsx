/**
 * Reusable VisionaryX primitives — Buttons, Cards, Inputs, Section labels.
 *
 * Built on top of /constants/visionTheme tokens. All elements expose
 * data-testid for testing automation.
 */
import { ReactNode, forwardRef } from 'react';
import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextProps,
  View,
  ViewStyle,
} from 'react-native';
import { PaletteDark as C, FontFamily as F, Radius, Space, TextStyles } from '@/constants/visionTheme';

// ---------- Section eyebrow + heading ----------
export function SectionEyebrow({ children, testID }: { children: ReactNode; testID?: string }) {
  return (
    <Text testID={testID} style={styles.eyebrow}>
      {children}
    </Text>
  );
}

export function ScreenTitle({ children, testID }: { children: ReactNode; testID?: string }) {
  return (
    <Text testID={testID} style={styles.screenTitle}>
      {children}
    </Text>
  );
}

export function ScreenSub({ children, testID }: { children: ReactNode; testID?: string }) {
  return (
    <Text testID={testID} style={styles.screenSub}>
      {children}
    </Text>
  );
}

// ---------- Card ----------
export function VxCard({
  children,
  style,
  pad = 'lg',
  testID,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  pad?: keyof typeof Space;
  testID?: string;
}) {
  return (
    <View testID={testID} style={[styles.card, { padding: Space[pad] }, style]}>
      {children}
    </View>
  );
}

// ---------- Button ----------
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface VxButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  label: string;
  variant?: ButtonVariant;
  busy?: boolean;
  fullWidth?: boolean;
  icon?: ReactNode;
  trailingIcon?: ReactNode;
  size?: 'md' | 'lg';
  testID?: string;
}

export const VxButton = forwardRef<View, VxButtonProps>(function VxButton(
  { label, variant = 'primary', busy, fullWidth, icon, trailingIcon, size = 'lg', testID, disabled, ...rest },
  ref,
) {
  const isPrimary = variant === 'primary';
  const isDanger = variant === 'danger';
  const isGhost = variant === 'ghost';

  const baseStyle: ViewStyle = {
    backgroundColor: isPrimary
      ? C.primary
      : isDanger
        ? C.danger
        : isGhost
          ? 'transparent'
          : C.surface2,
    borderColor: variant === 'secondary' ? C.borderStrong : 'transparent',
    borderWidth: variant === 'secondary' ? 1 : 0,
    paddingVertical: size === 'lg' ? 14 : 10,
    paddingHorizontal: size === 'lg' ? 24 : 18,
    borderRadius: Radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Space.sm,
    opacity: disabled ? 0.55 : 1,
    width: fullWidth ? '100%' : undefined,
  };

  const textColor =
    isPrimary || isDanger ? '#FFFFFF' : isGhost ? C.primaryAccent : C.text;

  return (
    <Pressable
      ref={ref}
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled || busy }}
      disabled={disabled || busy}
      style={({ pressed }) => [baseStyle, pressed && { opacity: 0.85 }]}
      {...rest}
    >
      {busy ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <>
          {icon}
          <Text style={[styles.btnText, { color: textColor }]} numberOfLines={1}>
            {label}
          </Text>
          {trailingIcon}
        </>
      )}
    </Pressable>
  );
});

// ---------- Input ----------
interface VxInputProps extends TextInputProps {
  label?: string;
  trailing?: ReactNode;
  leading?: ReactNode;
  testID?: string;
}

export const VxInput = forwardRef<TextInput, VxInputProps>(function VxInput(
  { label, trailing, leading, style, testID, ...rest },
  ref,
) {
  return (
    <View style={{ width: '100%' }}>
      {label ? (
        <Text style={styles.label} testID={testID ? `${testID}-label` : undefined}>
          {label}
        </Text>
      ) : null}
      <View style={styles.inputWrap}>
        {leading ? <View style={styles.inputAdorn}>{leading}</View> : null}
        <TextInput
          ref={ref}
          testID={testID}
          placeholderTextColor={C.textFaint}
          style={[
            styles.input,
            { paddingLeft: leading ? 0 : Space.md, paddingRight: trailing ? 0 : Space.md },
            style,
          ]}
          {...rest}
        />
        {trailing ? <View style={styles.inputAdorn}>{trailing}</View> : null}
      </View>
    </View>
  );
});

// ---------- Inline error / status ----------
export function ErrorBanner({ message, testID }: { message: string | null; testID?: string }) {
  if (!message) return null;
  return (
    <View style={styles.errorBanner} testID={testID ?? 'error-banner'}>
      <View style={styles.errorDot} />
      <Text style={styles.errorText} numberOfLines={2}>
        {message}
      </Text>
    </View>
  );
}

// ---------- Style sheet ----------
const styles = StyleSheet.create({
  eyebrow: {
    ...TextStyles.label,
    color: C.primaryAccent,
    fontFamily: F.bodySemibold,
  },
  screenTitle: {
    ...TextStyles.h2,
    color: C.text,
    marginTop: Space.xs,
  },
  screenSub: {
    ...TextStyles.body,
    color: C.textMuted,
    marginTop: Space.sm,
    maxWidth: 560,
  },
  card: {
    backgroundColor: C.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: C.border,
  },
  btnText: {
    ...TextStyles.label,
    fontSize: 12,
    letterSpacing: 1.2,
    color: '#FFFFFF',
  },
  label: {
    ...TextStyles.label,
    color: C.textMuted,
    marginBottom: Space.sm,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.bg,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: C.border,
    minHeight: 52,
  },
  input: {
    flex: 1,
    color: C.text,
    fontFamily: F.body,
    fontSize: 15,
    paddingVertical: 14,
  },
  inputAdorn: {
    paddingHorizontal: Space.md,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
    backgroundColor: C.dangerFaint,
    borderColor: C.danger,
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm + 2,
  },
  errorDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.danger },
  errorText: {
    ...TextStyles.bodySmall,
    color: C.danger,
    flex: 1,
  },
});
