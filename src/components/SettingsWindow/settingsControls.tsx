import React from 'react';
import { readDocumentOs } from '@/services/ui/appMenuModel';
import { ResetGlyph } from './settingsIcons';

/**
 * Shared building blocks for every Settings pane (and the Assistant tab, which uses the same
 * `.settings-*` classes): one card style, one row layout, one switch, select, slider and button.
 */

interface SettingsPaneProps {
  title: string;
  subtitle?: string;
  onHeaderMouseDown?: (event: React.MouseEvent<HTMLElement>) => void;
  children: React.ReactNode;
}

export const SettingsPane: React.FC<SettingsPaneProps> = ({ title, subtitle, onHeaderMouseDown, children }) => (
  <div className="settings-pane">
    <header className="settings-pane-header" onMouseDown={onHeaderMouseDown}>
      <h2 className="settings-content-title">{title}</h2>
      {subtitle ? <p className="settings-pane-subtitle">{subtitle}</p> : null}
    </header>
    <div className="settings-main-scroll">
      <div className="settings-content">{children}</div>
    </div>
  </div>
);

interface SettingsGroupProps {
  title: string;
  footer?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

export const SettingsGroup: React.FC<SettingsGroupProps> = ({ title, footer, className, children }) => (
  <section className={`settings-group${className ? ` ${className}` : ''}`}>
    <h3 className="settings-group-title">{title}</h3>
    <div className="settings-group-body">{children}</div>
    {footer ? <p className="settings-group-footer">{footer}</p> : null}
  </section>
);

interface SettingsRowProps {
  label: string;
  description?: React.ReactNode;
  /** id of the control the label names. */
  htmlFor?: string;
  /** Status line under the description (saved, failed, …). */
  status?: string | null;
  /** Right-hand control; with `stacked`, it sits under the text at full width. */
  control?: React.ReactNode;
  stacked?: boolean;
  disabled?: boolean;
  className?: string;
  /** Extra content under the row text (e.g. a chosen folder). */
  children?: React.ReactNode;
}

export const SettingsRow: React.FC<SettingsRowProps> = ({
  label,
  description,
  htmlFor,
  status,
  control,
  stacked = false,
  disabled = false,
  className,
  children,
}) => {
  const classes = ['settings-item'];
  if (stacked) classes.push('settings-item-stacked');
  if (disabled) classes.push('is-disabled');
  if (className) classes.push(className);

  return (
    <div className={classes.join(' ')}>
      <div className="settings-item-info">
        {htmlFor
          ? <label className="settings-item-label" htmlFor={htmlFor}>{label}</label>
          : <span className="settings-item-label">{label}</span>}
        {description ? <p className="settings-item-description">{description}</p> : null}
        {children}
        {status ? <p className="settings-inline-status" role="status">{status}</p> : null}
      </div>
      {control ? <div className="settings-item-control">{control}</div> : null}
    </div>
  );
};

interface SettingsSwitchProps {
  checked: boolean;
  label: string;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}

/** macOS-style switch; the accent color fills it when on. */
export const SettingsSwitch: React.FC<SettingsSwitchProps> = ({ checked, label, disabled = false, onChange }) => (
  <label className="settings-switch">
    <input
      type="checkbox"
      role="switch"
      aria-label={label}
      checked={checked}
      disabled={disabled}
      onChange={(event) => onChange(event.target.checked)}
    />
    <span className="settings-switch-track">
      <span className="settings-switch-thumb" />
    </span>
  </label>
);

interface SettingsSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  children: React.ReactNode;
}

export const SettingsSelect: React.FC<SettingsSelectProps> = ({ className, children, ...props }) => (
  <select {...props} className={`settings-select${className ? ` ${className}` : ''}`}>
    {children}
  </select>
);

export const rangeFillStyle = (value: number, min: number, max: number): React.CSSProperties => {
  const normalized = ((value - min) / (max - min)) * 100;
  return {
    '--settings-range-percent': `${Math.max(0, Math.min(100, normalized))}%`,
  } as React.CSSProperties;
};

interface SettingsSliderProps {
  label: string;
  valueText: string;
  icon?: React.ReactNode;
  min: number;
  max: number;
  step: number;
  value: number;
  disabled?: boolean;
  description?: string;
  /** Fires on every movement (drag preview). */
  onInput?: (value: number) => void;
  /** Fires on change (React `onChange`, also every movement). */
  onChange?: (value: number) => void;
  /** Fires when the drag ends (pointer up, key up, blur). */
  onCommit?: () => void;
  onReset?: () => void;
  resetLabel?: string;
}

export const SettingsSlider: React.FC<SettingsSliderProps> = ({
  label,
  valueText,
  icon,
  min,
  max,
  step,
  value,
  disabled = false,
  description,
  onInput,
  onChange,
  onCommit,
  onReset,
  resetLabel,
}) => (
  <div className={`settings-item settings-slider-row${disabled ? ' is-disabled' : ''}`}>
    <div className="settings-slider-header">
      <span className="settings-item-label">{label}</span>
      <span className="settings-slider-value">{valueText}</span>
    </div>
    {description ? <p className="settings-item-description">{description}</p> : null}
    <div className="settings-slider-control">
      {icon ? <span className="settings-slider-icon" aria-hidden="true">{icon}</span> : null}
      <input
        className="settings-range"
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        style={rangeFillStyle(value, min, max)}
        onInput={onInput ? (event) => onInput(Number(event.currentTarget.value)) : undefined}
        onChange={(event) => onChange?.(Number(event.target.value))}
        onPointerUp={onCommit}
        onKeyUp={onCommit}
        onBlur={onCommit}
      />
      {onReset ? (
        <button
          type="button"
          className="settings-slider-reset"
          aria-label={resetLabel ?? `Reset ${label.toLowerCase()}`}
          title="Reset to default"
          onClick={onReset}
        >
          <ResetGlyph />
        </button>
      ) : null}
    </div>
  </div>
);

interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
}

interface SettingsSegmentedProps<T extends string> {
  ariaLabel: string;
  options: ReadonlyArray<SegmentedOption<T>>;
  value: T;
  disabled?: boolean;
  onChange: (value: T) => void;
}

export function SettingsSegmented<T extends string>({
  ariaLabel,
  options,
  value,
  disabled = false,
  onChange,
}: SettingsSegmentedProps<T>): React.ReactElement {
  return (
    <div className="settings-segmented" role="group" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`settings-segmented-option${option.value === value ? ' is-selected' : ''}`}
          aria-pressed={option.value === value}
          disabled={disabled}
          onClick={() => {
            if (option.value !== value) onChange(option.value);
          }}
        >
          {option.icon ? <span className="settings-segmented-icon" aria-hidden="true">{option.icon}</span> : null}
          <span>{option.label}</span>
        </button>
      ))}
    </div>
  );
}

const MAC_KEY_SYMBOLS: Record<string, string> = {
  Cmd: '⌘',
  Shift: '⇧',
  Ctrl: '⌃',
  Alt: '⌥',
  Option: '⌥',
};

/**
 * Split a shortcut label ("Cmd + Shift + R", "Ctrl + D / Ctrl + U") into keycaps.
 * macOS shows modifier symbols; Windows and Linux show Ctrl for the primary modifier.
 */
export const shortcutKeyGroups = (shortcut: string, os: string = readDocumentOs()): string[][] => (
  shortcut.split(' / ').map((combo) => combo.split(' + ').map((key) => {
    if (os === 'macos') {
      return MAC_KEY_SYMBOLS[key] ?? key;
    }
    return key === 'Cmd' ? 'Ctrl' : key;
  }))
);

export const Keycaps: React.FC<{ shortcut: string }> = ({ shortcut }) => {
  const groups = shortcutKeyGroups(shortcut);
  return (
    <span className="shortcut-key">
      {groups.map((keys, groupIndex) => (
        <React.Fragment key={groupIndex}>
          {groupIndex > 0 ? <span className="shortcut-key-or">or</span> : null}
          <span className="shortcut-key-combo">
            {keys.map((key, keyIndex) => <kbd key={keyIndex} className="settings-kbd">{key}</kbd>)}
          </span>
        </React.Fragment>
      ))}
    </span>
  );
};
