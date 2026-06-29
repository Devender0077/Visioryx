/**
 * Reusable VisionaryX primitives — Buttons, Cards, Inputs, Section labels.
 *
 * Theme-aware: on web the static palette tokens resolve to CSS variables
 * automatically; on native we additionally read `useColors()` at render
 * time and override the StyleSheet-baked colors inline, so light mode
 * works on both platforms for components that go through these primitives.
 */
import { ReactNode, forwardRef, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { PaletteDark as C, FontFamily as F, Radius, Space, TextStyles } from '@/constants/visionTheme';
import { useColors } from '@/contexts/ThemeContext';

// ---------- Section eyebrow + heading ----------
export function SectionEyebrow({ children, testID }: { children: ReactNode; testID?: string }) {
  const c = useColors();
  return (
    <Text testID={testID} style={[styles.eyebrow, { color: c.primaryAccent }]}>
      {children}
    </Text>
  );
}

export function ScreenTitle({ children, testID }: { children: ReactNode; testID?: string }) {
  const c = useColors();
  return (
    <Text testID={testID} style={[styles.screenTitle, { color: c.text }]}>
      {children}
    </Text>
  );
}

export function ScreenSub({ children, testID }: { children: ReactNode; testID?: string }) {
  const c = useColors();
  return (
    <Text testID={testID} style={[styles.screenSub, { color: c.textMuted }]}>
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
  const c = useColors();
  return (
    <View
      testID={testID}
      style={[
        styles.card,
        { padding: Space[pad], backgroundColor: c.surface, borderColor: c.border },
        style,
      ]}
    >
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
  const c = useColors();
  const isPrimary = variant === 'primary';
  const isDanger = variant === 'danger';
  const isGhost = variant === 'ghost';

  const baseStyle: ViewStyle = {
    backgroundColor: isPrimary
      ? c.primary
      : isDanger
        ? c.danger
        : isGhost
          ? 'transparent'
          : c.surface2,
    borderColor: variant === 'secondary' ? c.borderStrong : 'transparent',
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
    isPrimary || isDanger ? '#FFFFFF' : isGhost ? c.primaryAccent : c.text;

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
  const c = useColors();
  return (
    <View style={{ width: '100%' }}>
      {label ? (
        <Text style={[styles.label, { color: c.textMuted }]} testID={testID ? `${testID}-label` : undefined}>
          {label}
        </Text>
      ) : null}
      <View style={[styles.inputWrap, { backgroundColor: c.bg, borderColor: c.border }]}>
        {leading ? <View style={styles.inputAdorn}>{leading}</View> : null}
        <TextInput
          ref={ref}
          testID={testID}
          placeholderTextColor={c.textFaint}
          style={[
            styles.input,
            { color: c.text, paddingLeft: leading ? 0 : Space.md, paddingRight: trailing ? 0 : Space.md },
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
  const c = useColors();
  if (!message) return null;
  return (
    <View style={[styles.errorBanner, { backgroundColor: c.dangerFaint, borderColor: c.danger }]} testID={testID ?? 'error-banner'}>
      <View style={[styles.errorDot, { backgroundColor: c.danger }]} />
      <Text style={[styles.errorText, { color: c.danger }]} numberOfLines={2}>
        {message}
      </Text>
    </View>
  );
}

// ---------- Style sheet (geometry only — colors come from useColors) ----------
const styles = StyleSheet.create({
  eyebrow: {
    ...TextStyles.label,
    fontFamily: F.bodySemibold,
  },
  screenTitle: {
    ...TextStyles.h2,
    marginTop: Space.xs,
  },
  screenSub: {
    ...TextStyles.body,
    marginTop: Space.sm,
    maxWidth: 560,
  },
  card: {
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  btnText: {
    ...TextStyles.label,
    fontSize: 12,
    letterSpacing: 1.2,
  },
  label: {
    ...TextStyles.label,
    marginBottom: Space.sm,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.sm,
    borderWidth: 1,
    minHeight: 52,
  },
  input: {
    flex: 1,
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
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm + 2,
  },
  errorDot: { width: 6, height: 6, borderRadius: 3 },
  errorText: {
    ...TextStyles.bodySmall,
    flex: 1,
  },

  // Modal / Dialog
  modalScrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Space.lg,
  },
  modalSheet: {
    width: '100%',
    maxWidth: 420,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Space.lg,
    gap: Space.md,
  },
  modalTitle: {
    ...TextStyles.h4,
    fontFamily: F.heading,
  },
  modalMsg: {
    ...TextStyles.body,
    lineHeight: 22,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Space.sm,
    justifyContent: 'flex-end',
    marginTop: Space.sm,
  },
});

// Re-export the static palette for keys that don't change between themes
// (primary, cyan, etc) and components that already access them directly.
export { C };

// ---------- Confirm modal (themed, works on web + native) ----------
interface VxConfirmProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function VxConfirm({
  open,
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  variant = 'danger',
  busy,
  onConfirm,
  onCancel,
}: VxConfirmProps) {
  const c = useColors();
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.modalScrim} onPress={onCancel}>
        <View
          style={[styles.modalSheet, { backgroundColor: c.surface, borderColor: c.border }]}
          onStartShouldSetResponder={() => true}
        >
          <Text style={[styles.modalTitle, { color: c.text }]}>{title}</Text>
          <Text style={[styles.modalMsg, { color: c.textMuted }]}>{message}</Text>
          <View style={styles.modalActions}>
            <VxButton
              label={cancelLabel}
              variant="secondary"
              onPress={onCancel}
              disabled={busy}
            />
            <VxButton
              label={confirmLabel}
              variant={variant}
              onPress={onConfirm}
              busy={busy}
            />
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

// ---------- Alert modal (themed, single OK button) ----------
interface VxAlertProps {
  open: boolean;
  title: string;
  message: string;
  okLabel?: string;
  onClose: () => void;
}

export function VxAlert({ open, title, message, okLabel = 'OK', onClose }: VxAlertProps) {
  const c = useColors();
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalScrim} onPress={onClose}>
        <View
          style={[styles.modalSheet, { backgroundColor: c.surface, borderColor: c.border }]}
          onStartShouldSetResponder={() => true}
        >
          <Text style={[styles.modalTitle, { color: c.text }]}>{title}</Text>
          <Text style={[styles.modalMsg, { color: c.textMuted }]}>{message}</Text>
          <View style={styles.modalActions}>
            <VxButton label={okLabel} variant="primary" onPress={onClose} fullWidth />
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

// ---------- Hook: returns a confirm dialog trigger ----------
export function useConfirm() {
  const [state, setState] = useState<{
    open: boolean;
    title: string;
    message: string;
    variant: 'danger' | 'primary';
    confirmLabel: string;
    resolve: ((v: boolean) => void) | null;
  }>({ open: false, title: '', message: '', variant: 'danger', confirmLabel: 'Delete', resolve: null });

  const confirm = useCallback(
    (title: string, message: string, opts?: { variant?: 'danger' | 'primary'; confirmLabel?: string }) =>
      new Promise<boolean>((resolve) => {
        setState({
          open: true,
          title,
          message,
          variant: opts?.variant ?? 'danger',
          confirmLabel: opts?.confirmLabel ?? 'Delete',
          resolve,
        });
      }),
    [],
  );

  const handleConfirm = () => {
    state.resolve?.(true);
    setState((s) => ({ ...s, open: false }));
  };
  const handleCancel = () => {
    state.resolve?.(false);
    setState((s) => ({ ...s, open: false }));
  };

  const ConfirmDialog = (
    <VxConfirm
      open={state.open}
      title={state.title}
      message={state.message}
      variant={state.variant}
      confirmLabel={state.confirmLabel}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  );

  return { confirm, ConfirmDialog };
}
