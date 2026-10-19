import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { keybindingService } from '@/services/shortcuts/shortcutService';
import {
  hydrateSidebarFavicons,
  needsSidebarFavicon,
  type SidebarFaviconEntry,
} from '@/services/favicons/sidebarFaviconCache';
import type { Feed } from '@/services/feeds/feedsManager';
import { logger } from '@/services/logger';
import { CloseGlyph, FeedsGlyph, SearchGlyph } from '@/components/SettingsWindow/settingsIcons';

/** Portals mount inside the window root so sheets and menus inherit its theme tokens. */
const portalRoot = (): HTMLElement => (
  document.querySelector<HTMLElement>('.manage-feeds-window') ?? document.body
);

/* ── Search field ─────────────────────────────────────────────────────────── */

interface SearchFieldProps {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  inputRef?: React.Ref<HTMLInputElement>;
  ariaLabel?: string;
}

export const SearchField: React.FC<SearchFieldProps> = ({ value, placeholder, onChange, inputRef, ariaLabel }) => (
  <div className="mf-search">
    <span className="mf-search-icon" aria-hidden="true"><SearchGlyph /></span>
    <input
      ref={inputRef}
      type="search"
      className="mf-search-input"
      value={value}
      placeholder={placeholder}
      aria-label={ariaLabel ?? placeholder}
      spellCheck={false}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && value) {
          event.preventDefault();
          event.stopPropagation();
          onChange('');
        }
      }}
    />
    {value ? (
      <button
        type="button"
        className="mf-search-clear"
        aria-label="Clear search"
        onClick={() => onChange('')}
      >
        <CloseGlyph />
      </button>
    ) : null}
  </div>
);

/* ── Feed icon (emoji, site icon, or a neutral glyph) ─────────────────────── */

type FeedIconSource = Pick<Feed, 'id' | 'title' | 'emoji' | 'favicon' | 'faviconStored'>;

/**
 * Rows only carry `faviconStored`; the icon hydrates through the shared batched favicon cache
 * (one `feeds_get_favicons` per tick for mounted rows, LRU-bounded), never a full feed read.
 */
export const FeedIcon: React.FC<{ feed: FeedIconSource; size?: 'small' | 'large' }> = ({ feed, size = 'small' }) => {
  const [entry, setEntry] = useState<SidebarFaviconEntry | null>(null);
  const [broken, setBroken] = useState(false);
  const wantsHydration = needsSidebarFavicon(feed);

  useEffect(() => {
    if (!wantsHydration) return;
    let active = true;
    void hydrateSidebarFavicons([feed]).then((hydrated) => {
      if (active) setEntry(hydrated.get(feed.id) ?? null);
    }).catch((error: unknown) => {
      logger.warn('ManageFeeds', 'Failed to load a feed icon', { error, feedId: feed.id });
    });
    return () => {
      active = false;
    };
    // `feed` identity changes on every patch; the id and flags decide whether to hydrate.
  }, [feed.id, wantsHydration]);

  const className = `mf-feed-icon mf-feed-icon-${size}`;
  if (feed.emoji) {
    return <span className={`${className} is-emoji`} aria-hidden="true">{feed.emoji}</span>;
  }
  const favicon = feed.favicon ?? entry?.favicon;
  if (favicon && !broken) {
    return (
      <span className={className} aria-hidden="true">
        <img src={favicon} alt="" draggable={false} onError={() => setBroken(true)} />
      </span>
    );
  }
  return <span className={`${className} is-fallback`} aria-hidden="true"><FeedsGlyph /></span>;
};

/* ── Dialog sheet ─────────────────────────────────────────────────────────── */

const FOCUSABLE = 'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

interface DialogProps {
  title: string;
  description?: React.ReactNode;
  onClose: () => void;
  /** Blocks Esc and backdrop close while work is in flight. */
  busy?: boolean;
  wide?: boolean;
  footer: React.ReactNode;
  children?: React.ReactNode;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
}

/**
 * Sheet over the window, styled like the Settings cards. The backdrop carries `modal-backdrop`
 * so app shortcuts (Esc closes the window, Cmd+F) stand down while it is open.
 */
export const Dialog: React.FC<DialogProps> = ({
  title,
  description,
  onClose,
  busy = false,
  wide = false,
  footer,
  children,
  initialFocusRef,
}) => {
  const titleId = useId();
  const cardRef = useRef<HTMLDivElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const busyRef = useRef(busy);
  busyRef.current = busy;

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const target = initialFocusRef?.current
      ?? cardRef.current?.querySelector<HTMLElement>(FOCUSABLE)
      ?? cardRef.current;
    target?.focus();
    return () => {
      previouslyFocused?.focus?.();
    };
    // Focus once on open.
  }, []);

  useEffect(() => keybindingService.register({
    type: 'keydown',
    capture: true,
    priority: 1500,
    handler: (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (document.querySelector('.emoji-submenu')) return;
      event.preventDefault();
      event.stopPropagation();
      if (!busyRef.current) onCloseRef.current();
    },
  }), []);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab' || !cardRef.current) return;
    const focusables = Array.from(cardRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return createPortal(
    <div
      className="mf-dialog-backdrop modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <div
        ref={cardRef}
        className={`mf-dialog${wide ? ' is-wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <div className="mf-dialog-header">
          <h2 id={titleId} className="mf-dialog-title">{title}</h2>
          {description ? <div className="mf-dialog-description">{description}</div> : null}
        </div>
        {children ? <div className="mf-dialog-body">{children}</div> : null}
        <div className="mf-dialog-footer">{footer}</div>
      </div>
    </div>,
    portalRoot(),
  );
};

/* ── Popover menu ─────────────────────────────────────────────────────────── */

export interface MenuOption {
  id: string;
  label: string;
  icon?: React.ReactNode;
  checked?: boolean;
  disabled?: boolean;
  destructive?: boolean;
  onSelect: () => void;
}

interface PopoverMenuProps {
  anchorEl: HTMLElement;
  label: string;
  options: MenuOption[];
  emptyText?: string;
  onClose: () => void;
  align?: 'start' | 'end';
  placement?: 'below' | 'above';
}

/** Small anchored menu (station pickers, bulk actions). Arrow keys move, Enter picks, Esc closes. */
export const PopoverMenu: React.FC<PopoverMenuProps> = ({
  anchorEl,
  label,
  options,
  emptyText,
  onClose,
  align = 'start',
  placement = 'below',
}) => {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useLayoutEffect(() => {
    const rect = anchorEl.getBoundingClientRect();
    const menu = menuRef.current;
    const width = menu?.offsetWidth ?? 220;
    const height = menu?.offsetHeight ?? 200;
    let left = align === 'end' ? rect.right - width : rect.left;
    left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
    let top = placement === 'above' ? rect.top - height - 6 : rect.bottom + 6;
    if (top + height > window.innerHeight - 8) top = Math.max(8, rect.top - height - 6);
    if (top < 8) top = Math.min(window.innerHeight - height - 8, rect.bottom + 6);
    setPosition({ left, top });
  }, [align, anchorEl, placement, options.length]);

  useEffect(() => {
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"]), [role="menuitemcheckbox"]:not([aria-disabled="true"])')?.focus();
  }, [position === null]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (menuRef.current?.contains(target) || anchorEl.contains(target)) return;
      onCloseRef.current();
    };
    document.addEventListener('mousedown', handlePointerDown);
    const unregister = keybindingService.register({
      type: 'keydown',
      capture: true,
      priority: 1600,
      handler: (event: KeyboardEvent) => {
        if (event.key !== 'Escape') return;
        event.preventDefault();
        event.stopPropagation();
        onCloseRef.current();
        anchorEl.focus();
      },
    });
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      unregister();
    };
  }, [anchorEl]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp' && event.key !== 'Home' && event.key !== 'End') return;
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]:not([aria-disabled="true"])') ?? []);
    if (items.length === 0) return;
    event.preventDefault();
    const index = items.indexOf(document.activeElement as HTMLElement);
    let next = 0;
    if (event.key === 'End') next = items.length - 1;
    else if (event.key === 'ArrowDown') next = index < 0 ? 0 : (index + 1) % items.length;
    else if (event.key === 'ArrowUp') next = index <= 0 ? items.length - 1 : index - 1;
    items[next].focus();
  };

  return createPortal(
    <div
      ref={menuRef}
      className="mf-menu"
      role="menu"
      aria-label={label}
      style={position ? { left: position.left, top: position.top } : { visibility: 'hidden', left: 0, top: 0 }}
      onKeyDown={handleKeyDown}
    >
      {options.length === 0 && emptyText ? <div className="mf-menu-empty">{emptyText}</div> : null}
      {options.map((option) => {
        const isCheckable = option.checked !== undefined;
        return (
          <button
            key={option.id}
            type="button"
            role={isCheckable ? 'menuitemcheckbox' : 'menuitem'}
            aria-checked={isCheckable ? option.checked : undefined}
            aria-disabled={option.disabled || undefined}
            disabled={option.disabled}
            className={`mf-menu-item${option.destructive ? ' is-destructive' : ''}`}
            onClick={() => option.onSelect()}
          >
            <span className="mf-menu-check" aria-hidden="true">{option.checked ? '✓' : ''}</span>
            {option.icon ? <span className="mf-menu-icon" aria-hidden="true">{option.icon}</span> : null}
            <span className="mf-menu-label">{option.label}</span>
          </button>
        );
      })}
    </div>,
    portalRoot(),
  );
};

/* ── Empty state ─────────────────────────────────────────────────────────── */

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  message?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, message, action }) => (
  <div className="mf-empty" role="status">
    <span className="mf-empty-icon" aria-hidden="true">{icon}</span>
    <p className="mf-empty-title">{title}</p>
    {message ? <p className="mf-empty-message">{message}</p> : null}
    {action ? <div className="mf-empty-action">{action}</div> : null}
  </div>
);
