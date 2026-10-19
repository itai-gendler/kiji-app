import defaultAppIconPreview from '@/assets/images/kiji-logo.png';
import defaultDarkAppIconPreview from '@/assets/images/kiji-logo-dark.png';
import rippleAppIconPreview from '@/assets/images/kiji-logo-ripple.png';
import rippleDarkAppIconPreview from '@/assets/images/kiji-logo-ripple-dark.png';

export type SystemAppIconVariant =
  | 'light'
  | 'dark'
  | 'ripple'
  | 'ripple-dark';

export interface SystemAppIconState {
  iconPath: string | null;
  previewDataUrl: string | null;
  hasCustomIcon: boolean;
  iconVariant: SystemAppIconVariant;
}

// Must match the Rust `SystemAppIconVariant::default()` and `bundle.icon` (icons-ripple).
export const DEFAULT_SYSTEM_APP_ICON_VARIANT: SystemAppIconVariant = 'ripple';

export const APP_ICON_VARIANT_OPTIONS: ReadonlyArray<{
  value: SystemAppIconVariant;
  label: string;
  source: string;
}> = [
  { value: 'ripple', label: 'Ripple', source: rippleAppIconPreview },
  { value: 'ripple-dark', label: 'Ripple Dark', source: rippleDarkAppIconPreview },
  { value: 'light', label: 'Light', source: defaultAppIconPreview },
  { value: 'dark', label: 'Dark', source: defaultDarkAppIconPreview },
];

export const getDefaultAppIconPreview = (variant: SystemAppIconVariant): string => (
  APP_ICON_VARIANT_OPTIONS.find((option) => option.value === variant)?.source
    ?? rippleAppIconPreview
);
