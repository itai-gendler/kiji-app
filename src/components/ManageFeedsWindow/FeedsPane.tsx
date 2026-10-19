import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EmojiSubmenu } from '@/components/common/EmojiPicker/EmojiSubmenu';
import {
  CloseGlyph,
  FeedsGlyph,
  MinusGlyph,
  PencilGlyph,
  PlusGlyph,
  SearchGlyph,
  SmileGlyph,
  StationsGlyph,
  TrashGlyph,
  WarningGlyph,
} from '@/components/SettingsWindow/settingsIcons';
import type { Feed } from '@/services/feeds/feedsManager';
import { isArticleListSearchShortcut, keybindingService } from '@/services/shortcuts/shortcutService';
import {
  describeFeedStatus,
  feedSiteLabel,
  filterFeeds,
  formatAddedDate,
  needsAttention,
  pluralize,
  sortFeeds,
  type FeedFilterKey,
  type FeedSortKey,
} from './manageFeedsModel';
import { Dialog, EmptyState, FeedIcon, PopoverMenu, SearchField, type MenuOption } from './ManageFeedsControls';
import type { FeedEdits, ManageFeedsLibraryApi } from './useManageFeedsLibrary';

const FILTERS: ReadonlyArray<{ id: FeedFilterKey; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'attention', label: 'Can’t Update' },
  { id: 'unstationed', label: 'No Station' },
];

const SORTS: ReadonlyArray<{ id: FeedSortKey; label: string }> = [
  { id: 'recent', label: 'Recently Added' },
  { id: 'name', label: 'Name' },
  { id: 'articles', label: 'Most Articles' },
  { id: 'status', label: 'Status' },
];

const isEditableTarget = (target: EventTarget | null): boolean => (
  target instanceof HTMLElement
  && (target.isContentEditable || ['input', 'textarea', 'select'].includes(target.tagName.toLowerCase()))
);

interface FeedRowProps {
  feed: Feed;
  stationNames: string[];
  isSelected: boolean;
  isFocused: boolean;
  isTabStop: boolean;
  isFlashing: boolean;
  selectionMode: boolean;
  now: number;
  rowRef: (feedId: string, node: HTMLLIElement | null) => void;
  onRowClick: (feedId: string, event: React.MouseEvent) => void;
  onToggle: (feedId: string) => void;
  onEdit: (feedId: string) => void;
  onDelete: (feedId: string) => void;
  onFocusRow: (feedId: string) => void;
}

const FeedRow = React.memo<FeedRowProps>(({
  feed,
  stationNames,
  isSelected,
  isFocused,
  isTabStop,
  isFlashing,
  selectionMode,
  now,
  rowRef,
  onRowClick,
  onToggle,
  onEdit,
  onDelete,
  onFocusRow,
}) => {
  const status = describeFeedStatus(feed, now);
  const articleCount = feed.articleCount ?? 0;
  return (
    <li
      ref={(node) => rowRef(feed.id, node)}
      id={`mf-feed-${feed.id}`}
      role="option"
      aria-selected={isSelected}
      tabIndex={isTabStop ? 0 : -1}
      className={[
        'mf-row',
        'mf-feed-row',
        isSelected ? 'is-selected' : '',
        isFocused ? 'is-focused' : '',
        isFlashing ? 'is-flashing' : '',
        selectionMode ? 'is-selection-mode' : '',
      ].filter(Boolean).join(' ')}
      data-feed-id={feed.id}
      onClick={(event) => onRowClick(feed.id, event)}
      onDoubleClick={() => onEdit(feed.id)}
      onFocus={() => onFocusRow(feed.id)}
    >
      <span className="mf-row-check">
        <input
          type="checkbox"
          tabIndex={-1}
          checked={isSelected}
          aria-label={`Select ${feed.title}`}
          onClick={(event) => event.stopPropagation()}
          onChange={() => onToggle(feed.id)}
        />
      </span>
      <FeedIcon feed={feed} />
      <div className="mf-row-main">
        <div className="mf-row-title">{feed.title || feedSiteLabel(feed.url)}</div>
        <div className="mf-row-meta">
          <span className="mf-row-site">{feedSiteLabel(feed.url)}</span>
          {stationNames.map((name) => (
            <span key={name} className="mf-chip">{name}</span>
          ))}
        </div>
      </div>
      <div className="mf-row-stat" title={`${pluralize(articleCount, 'article')}${feed.unreadCount ? `, ${feed.unreadCount} unread` : ''}`}>
        {articleCount.toLocaleString('en-US')}
        <span className="mf-row-stat-unit">{articleCount === 1 ? 'article' : 'articles'}</span>
      </div>
      <div className={`mf-status is-${status.health}`} title={status.detail}>
        {status.health === 'failing'
          ? <span className="mf-status-icon" aria-hidden="true"><WarningGlyph /></span>
          : <span className="mf-status-dot" aria-hidden="true" />}
        <span className="mf-status-label">{status.label}</span>
      </div>
      <div className="mf-row-actions">
        <button
          type="button"
          tabIndex={-1}
          className="settings-icon-button mf-row-action"
          aria-label={`Edit ${feed.title}`}
          title="Edit"
          onClick={(event) => {
            event.stopPropagation();
            onEdit(feed.id);
          }}
        >
          <PencilGlyph />
        </button>
        <button
          type="button"
          tabIndex={-1}
          className="settings-icon-button mf-row-action is-destructive"
          aria-label={`Delete ${feed.title}`}
          title="Delete"
          onClick={(event) => {
            event.stopPropagation();
            onDelete(feed.id);
          }}
        >
          <TrashGlyph />
        </button>
      </div>
    </li>
  );
});
FeedRow.displayName = 'FeedRow';

/* ── Feed editor ─────────────────────────────────────────────────────────── */

interface FeedEditorDialogProps {
  feed: Feed;
  stationOptions: string[];
  stationNames: string[];
  onSave: (edits: FeedEdits, stationNames: string[]) => Promise<boolean>;
  onDelete: () => void;
  onClose: () => void;
}

export const FeedEditorDialog: React.FC<FeedEditorDialogProps> = ({
  feed,
  stationOptions,
  stationNames,
  onSave,
  onDelete,
  onClose,
}) => {
  const [title, setTitle] = useState(feed.title);
  const [url, setUrl] = useState(feed.url);
  const [emoji, setEmoji] = useState(feed.emoji ?? '');
  const [selectedStations, setSelectedStations] = useState<string[]>(stationNames);
  const [saving, setSaving] = useState(false);
  const [emojiAnchor, setEmojiAnchor] = useState<HTMLElement | null>(null);
  const titleRef = useRef<HTMLInputElement | null>(null);
  const status = describeFeedStatus(feed);
  const canSave = title.trim().length > 0 && url.trim().length > 0 && !saving;

  useEffect(() => {
    if (!emojiAnchor) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target || emojiAnchor.contains(target) || target.closest('.emoji-submenu')) return;
      setEmojiAnchor(null);
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [emojiAnchor]);

  const submit = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const saved = await onSave({ title, url, emoji }, selectedStations);
      if (saved) onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      title="Edit Feed"
      onClose={onClose}
      busy={saving}
      wide
      initialFocusRef={titleRef}
      footer={(
        <>
          <button type="button" className="settings-action-button mf-button-destructive mf-footer-leading" onClick={onDelete} disabled={saving}>
            <TrashGlyph />
            Delete Feed…
          </button>
          <button type="button" className="settings-action-button" onClick={onClose} disabled={saving}>Cancel</button>
          <button
            type="button"
            className="settings-action-button settings-action-button-primary"
            onClick={() => { void submit(); }}
            disabled={!canSave}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </>
      )}
    >
      <form
        className="mf-form"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <div className="mf-form-identity">
          <button
            type="button"
            className="mf-emoji-button"
            aria-label="Change icon"
            title={emoji ? 'Change emoji' : 'Choose an emoji'}
            onClick={(event) => setEmojiAnchor(emojiAnchor ? null : event.currentTarget)}
          >
            <FeedIcon feed={{ ...feed, emoji: emoji || undefined }} size="large" />
          </button>
          <div className="mf-form-identity-text">
            <label className="mf-field-label" htmlFor="mf-feed-title">Name</label>
            <input
              ref={titleRef}
              id="mf-feed-title"
              className="mf-input"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
            {emoji ? (
              <button type="button" className="mf-link-button" onClick={() => setEmoji('')}>
                Use the site icon
              </button>
            ) : (
              <button type="button" className="mf-link-button" onClick={(event) => setEmojiAnchor(event.currentTarget)}>
                <SmileGlyph />
                Choose an emoji
              </button>
            )}
          </div>
        </div>
        <label className="mf-field-label" htmlFor="mf-feed-url">Feed address</label>
        <input
          id="mf-feed-url"
          className="mf-input"
          value={url}
          spellCheck={false}
          inputMode="url"
          onChange={(event) => setUrl(event.target.value)}
        />
        <fieldset className="mf-fieldset">
          <legend className="mf-field-label">Stations</legend>
          {stationOptions.length === 0 ? (
            <p className="mf-hint">No stations yet. Create one in the Stations tab.</p>
          ) : (
            <div className="mf-checklist">
              {stationOptions.map((name) => (
                <label key={name} className="mf-check-row">
                  <input
                    type="checkbox"
                    checked={selectedStations.includes(name)}
                    onChange={(event) => setSelectedStations((current) => (
                      event.target.checked ? [...current, name] : current.filter((entry) => entry !== name)
                    ))}
                  />
                  <span>{name}</span>
                </label>
              ))}
            </div>
          )}
        </fieldset>
        <div className={`mf-status-card is-${status.health}`}>
          <span className="mf-status-card-icon" aria-hidden="true">
            {status.health === 'failing' ? <WarningGlyph /> : <FeedsGlyph />}
          </span>
          <div>
            <p className="mf-status-card-title">{status.health === 'failing' ? 'Can’t update this feed' : status.label}</p>
            <p className="mf-hint">
              {status.health === 'failing' ? status.detail : null}
              {status.health !== 'failing' ? `${pluralize(feed.articleCount ?? 0, 'article')}${feed.createdAt ? ` · Added ${formatAddedDate(feed.createdAt)}` : ''}` : null}
            </p>
          </div>
        </div>
        <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
      </form>
      <EmojiSubmenu
        isOpen={!!emojiAnchor}
        anchorEl={emojiAnchor}
        position="right"
        onEmojiSelect={(value) => {
          setEmoji(value);
          setEmojiAnchor(null);
        }}
        onClose={() => setEmojiAnchor(null)}
        onMouseEnter={() => {}}
        onMouseLeave={() => {}}
        selectedEmoji={emoji || undefined}
      />
    </Dialog>
  );
};

/* ── Delete confirmation ─────────────────────────────────────────────────── */

export const DeleteFeedsDialog: React.FC<{
  feeds: Feed[];
  onConfirm: () => Promise<void>;
  onClose: () => void;
}> = ({ feeds, onConfirm, onClose }) => {
  const [busy, setBusy] = useState(false);
  const cancelRef = useRef<HTMLButtonElement | null>(null);
  const title = feeds.length === 1 ? `Delete “${feeds[0].title}”?` : `Delete ${feeds.length} feeds?`;
  return (
    <Dialog
      title={title}
      description={feeds.length === 1
        ? 'Its articles are removed too. Articles you saved stay in Saved.'
        : 'Their articles are removed too. Articles you saved stay in Saved.'}
      onClose={onClose}
      busy={busy}
      initialFocusRef={cancelRef}
      footer={(
        <>
          <button ref={cancelRef} type="button" className="settings-action-button" onClick={onClose} disabled={busy}>Cancel</button>
          <button
            type="button"
            className="settings-action-button mf-button-destructive-filled"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              void onConfirm().finally(() => setBusy(false));
            }}
          >
            {busy ? 'Deleting…' : 'Delete'}
          </button>
        </>
      )}
    />
  );
};

/* ── Pane ────────────────────────────────────────────────────────────────── */

interface FeedsPaneProps {
  library: ManageFeedsLibraryApi;
  revealFeedId: string | null;
  onRevealHandled: () => void;
  onAddFeed: () => void;
  isActive: boolean;
}

export const FeedsPane: React.FC<FeedsPaneProps> = ({ library, revealFeedId, onRevealHandled, onAddFeed, isActive }) => {
  const { feeds, stations, stationsByFeedId, status } = library;
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FeedFilterKey>('all');
  const [sort, setSort] = useState<FeedSortKey>('recent');
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set());
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [anchorId, setAnchorId] = useState<string | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteIds, setDeleteIds] = useState<string[] | null>(null);
  const [menu, setMenu] = useState<{ kind: 'add' | 'remove'; anchor: HTMLElement } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const searchRef = useRef<HTMLInputElement | null>(null);
  const rowRefs = useRef(new Map<string, HTMLLIElement>());

  const visibleFeeds = useMemo(
    () => sortFeeds(filterFeeds(feeds, filter, query, stationsByFeedId), sort),
    [feeds, filter, query, sort, stationsByFeedId],
  );
  const visibleIds = useMemo(() => visibleFeeds.map((feed) => feed.id), [visibleFeeds]);
  const feedById = useMemo(() => new Map(feeds.map((feed) => [feed.id, feed])), [feeds]);
  const attentionCount = useMemo(() => feeds.filter(needsAttention).length, [feeds]);
  const unstationedCount = useMemo(
    () => feeds.filter((feed) => (stationsByFeedId.get(feed.id)?.length ?? 0) === 0).length,
    [feeds, stationsByFeedId],
  );
  const filterCounts: Record<FeedFilterKey, number> = {
    all: feeds.length,
    attention: attentionCount,
    unstationed: unstationedCount,
  };

  // Relative times ("5 min ago") refresh with the data, not on a timer loop.
  useEffect(() => {
    setNow(Date.now());
  }, [feeds]);

  // Drop selections for feeds that were deleted (here or in the main window).
  useEffect(() => {
    setSelected((current) => {
      if (current.size === 0) return current;
      const next = new Set([...current].filter((id) => feedById.has(id)));
      return next.size === current.size ? current : next;
    });
    if (editingId && !feedById.has(editingId)) setEditingId(null);
  }, [editingId, feedById]);

  const rowRef = useCallback((feedId: string, node: HTMLLIElement | null) => {
    if (node) rowRefs.current.set(feedId, node);
    else rowRefs.current.delete(feedId);
  }, []);

  const focusRow = useCallback((feedId: string) => {
    setFocusedId(feedId);
    const node = rowRefs.current.get(feedId);
    node?.focus({ preventScroll: true });
    node?.scrollIntoView?.({ block: 'nearest' });
  }, []);

  // Reveal a feed picked from the sidebar ("Edit feed").
  useEffect(() => {
    if (!revealFeedId || status !== 'ready') return;
    if (!feedById.has(revealFeedId)) {
      onRevealHandled();
      return;
    }
    if (!visibleIds.includes(revealFeedId)) {
      setQuery('');
      setFilter('all');
      return;
    }
    setSelected(new Set([revealFeedId]));
    setAnchorId(revealFeedId);
    setFocusedId(revealFeedId);
    const node = rowRefs.current.get(revealFeedId);
    node?.scrollIntoView?.({ block: 'center' });
    node?.focus({ preventScroll: true });
    setFlashId(revealFeedId);
    const timer = window.setTimeout(() => setFlashId(null), 900);
    onRevealHandled();
    return () => window.clearTimeout(timer);
  }, [feedById, onRevealHandled, revealFeedId, status, visibleIds]);

  useEffect(() => {
    if (!isActive) return;
    return keybindingService.register({
      type: 'keydown',
      priority: 30,
      handler: (event: KeyboardEvent) => {
        if (isArticleListSearchShortcut(event)) {
          event.preventDefault();
          searchRef.current?.focus();
          searchRef.current?.select();
          return;
        }
        if (event.key === 'Escape' && selected.size > 0 && !isEditableTarget(event.target)) {
          event.preventDefault();
          event.stopPropagation();
          setSelected(new Set());
        }
      },
    });
  }, [isActive, selected.size]);

  const toggle = useCallback((feedId: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(feedId)) next.delete(feedId);
      else next.add(feedId);
      return next;
    });
    setAnchorId(feedId);
  }, []);

  const selectRange = useCallback((fromId: string | null, toId: string, additive: boolean) => {
    const from = fromId ? visibleIds.indexOf(fromId) : -1;
    const to = visibleIds.indexOf(toId);
    if (to < 0) return;
    const start = from < 0 ? to : Math.min(from, to);
    const end = from < 0 ? to : Math.max(from, to);
    setSelected((current) => {
      const next = additive ? new Set(current) : new Set<string>();
      for (const id of visibleIds.slice(start, end + 1)) next.add(id);
      return next;
    });
  }, [visibleIds]);

  const handleRowClick = useCallback((feedId: string, event: React.MouseEvent) => {
    setFocusedId(feedId);
    if (event.shiftKey) {
      selectRange(anchorId, feedId, event.metaKey || event.ctrlKey);
      return;
    }
    if (event.metaKey || event.ctrlKey || selected.size > 0) {
      toggle(feedId);
      return;
    }
    setSelected(new Set([feedId]));
    setAnchorId(feedId);
  }, [anchorId, selectRange, selected.size, toggle]);

  const handleListKeyDown = (event: React.KeyboardEvent<HTMLUListElement>) => {
    if (isEditableTarget(event.target) || visibleIds.length === 0) return;
    const index = focusedId ? visibleIds.indexOf(focusedId) : -1;
    const moveTo = (nextIndex: number) => {
      const clamped = Math.max(0, Math.min(visibleIds.length - 1, nextIndex));
      const nextId = visibleIds[clamped];
      event.preventDefault();
      focusRow(nextId);
      if (event.shiftKey) {
        selectRange(anchorId ?? focusedId ?? nextId, nextId, false);
      }
    };
    switch (event.key) {
      case 'ArrowDown':
        moveTo(index + 1);
        return;
      case 'ArrowUp':
        moveTo(index < 0 ? 0 : index - 1);
        return;
      case 'Home':
        moveTo(0);
        return;
      case 'End':
        moveTo(visibleIds.length - 1);
        return;
      case ' ':
        if (focusedId) {
          event.preventDefault();
          toggle(focusedId);
        }
        return;
      case 'Enter':
        if (focusedId) {
          event.preventDefault();
          setEditingId(focusedId);
        }
        return;
      case 'Delete':
      case 'Backspace': {
        const ids = selected.size > 0 ? [...selected] : (focusedId ? [focusedId] : []);
        if (ids.length > 0) {
          event.preventDefault();
          setDeleteIds(ids);
        }
        return;
      }
      case 'a':
        if (event.metaKey || event.ctrlKey) {
          event.preventDefault();
          setSelected(new Set(visibleIds));
        }
        return;
      default:
    }
  };

  const selectedIds = useMemo(() => [...selected], [selected]);
  const editingFeed = editingId ? feedById.get(editingId) ?? null : null;
  const deleteFeedsList = (deleteIds ?? []).map((id) => feedById.get(id)).filter((feed): feed is Feed => !!feed);
  const tabStopId = focusedId && visibleIds.includes(focusedId) ? focusedId : visibleIds[0] ?? null;

  const menuOptions: MenuOption[] = useMemo(() => {
    if (!menu) return [];
    if (menu.kind === 'add') {
      return stations.map((station) => ({
        id: station.name,
        label: station.emoji ? `${station.emoji} ${station.name}` : station.name,
        onSelect: () => {
          setMenu(null);
          void library.addFeedsToStation(selectedIds, station.name);
        },
      }));
    }
    const names = new Set(selectedIds.flatMap((id) => stationsByFeedId.get(id) ?? []));
    return stations.filter((station) => names.has(station.name)).map((station) => ({
      id: station.name,
      label: station.emoji ? `${station.emoji} ${station.name}` : station.name,
      onSelect: () => {
        setMenu(null);
        void library.removeFeedsFromStation(selectedIds, station.name);
      },
    }));
  }, [library, menu, selectedIds, stations, stationsByFeedId]);

  const renderList = () => {
    if (status === 'loading' && feeds.length === 0) {
      return <div className="mf-loading" role="status">Loading feeds…</div>;
    }
    if (status === 'error') {
      return (
        <EmptyState
          icon={<WarningGlyph />}
          title="Couldn’t load your feeds"
          message="Try again in a moment."
          action={<button type="button" className="settings-action-button" onClick={library.reload}>Try Again</button>}
        />
      );
    }
    if (feeds.length === 0) {
      return (
        <EmptyState
          icon={<FeedsGlyph />}
          title="No feeds yet"
          message="Add a site or feed link, or import a list from another reader."
          action={(
            <button type="button" className="settings-action-button settings-action-button-primary" onClick={onAddFeed}>
              <PlusGlyph />
              Add Feed…
            </button>
          )}
        />
      );
    }
    if (visibleFeeds.length === 0) {
      return (
        <EmptyState
          icon={<SearchGlyph />}
          title={query ? `No feeds match “${query.trim()}”` : 'Nothing here'}
          message={filter === 'attention' ? 'Every feed is updating normally.' : filter === 'unstationed' ? 'Every feed is in a station.' : undefined}
          action={(query || filter !== 'all') ? (
            <button type="button" className="settings-action-button" onClick={() => { setQuery(''); setFilter('all'); }}>
              Show All Feeds
            </button>
          ) : undefined}
        />
      );
    }
    return (
      <ul
        className="mf-list"
        role="listbox"
        aria-multiselectable="true"
        aria-label="Feeds"
        onKeyDown={handleListKeyDown}
      >
        {visibleFeeds.map((feed) => (
          <FeedRow
            key={feed.id}
            feed={feed}
            stationNames={stationsByFeedId.get(feed.id) ?? []}
            isSelected={selected.has(feed.id)}
            isFocused={focusedId === feed.id}
            isTabStop={tabStopId === feed.id}
            isFlashing={flashId === feed.id}
            selectionMode={selected.size > 0}
            now={now}
            rowRef={rowRef}
            onRowClick={handleRowClick}
            onToggle={toggle}
            onEdit={setEditingId}
            onDelete={(id) => setDeleteIds([id])}
            onFocusRow={setFocusedId}
          />
        ))}
      </ul>
    );
  };

  return (
    <div className="mf-pane-body" data-pane="feeds">
      <div className="mf-toolbar">
        <SearchField
          value={query}
          placeholder="Search feeds"
          inputRef={searchRef}
          onChange={setQuery}
        />
        <div className="settings-segmented mf-filter" role="group" aria-label="Show">
          {FILTERS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`settings-segmented-option${filter === option.id ? ' is-selected' : ''}`}
              aria-pressed={filter === option.id}
              onClick={() => setFilter(option.id)}
            >
              <span>{option.label}</span>
              <span className={`mf-count${option.id === 'attention' && attentionCount > 0 ? ' is-alert' : ''}`}>{filterCounts[option.id]}</span>
            </button>
          ))}
        </div>
        <select
          className="settings-select mf-sort"
          aria-label="Sort feeds by"
          value={sort}
          onChange={(event) => setSort(event.target.value as FeedSortKey)}
        >
          {SORTS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
        </select>
      </div>

      <div className="mf-list-scroll">{renderList()}</div>

      {selected.size > 0 ? (
        <div className="mf-bulkbar" role="toolbar" aria-label="Selected feeds">
          <span className="mf-bulkbar-count">{pluralize(selected.size, 'feed')} selected</span>
          <span className="mf-bulkbar-spacer" />
          <button
            type="button"
            className="settings-action-button"
            disabled={stations.length === 0}
            aria-haspopup="menu"
            aria-expanded={menu?.kind === 'add'}
            onClick={(event) => setMenu(menu?.kind === 'add' ? null : { kind: 'add', anchor: event.currentTarget })}
          >
            <StationsGlyph />
            Add to Station
          </button>
          <button
            type="button"
            className="settings-action-button"
            disabled={!selectedIds.some((id) => (stationsByFeedId.get(id)?.length ?? 0) > 0)}
            aria-haspopup="menu"
            aria-expanded={menu?.kind === 'remove'}
            onClick={(event) => setMenu(menu?.kind === 'remove' ? null : { kind: 'remove', anchor: event.currentTarget })}
          >
            <MinusGlyph />
            Remove from Station
          </button>
          <button
            type="button"
            className="settings-action-button mf-button-destructive"
            onClick={() => setDeleteIds(selectedIds)}
          >
            <TrashGlyph />
            Delete…
          </button>
          <button
            type="button"
            className="settings-icon-button"
            aria-label="Clear selection"
            title="Clear selection"
            onClick={() => setSelected(new Set())}
          >
            <CloseGlyph />
          </button>
        </div>
      ) : null}

      {menu ? (
        <PopoverMenu
          anchorEl={menu.anchor}
          label={menu.kind === 'add' ? 'Add to station' : 'Remove from station'}
          options={menuOptions}
          emptyText="No stations"
          placement="above"
          onClose={() => setMenu(null)}
        />
      ) : null}

      {editingFeed ? (
        <FeedEditorDialog
          key={editingFeed.id}
          feed={editingFeed}
          stationOptions={stations.map((station) => station.name)}
          stationNames={stationsByFeedId.get(editingFeed.id) ?? []}
          onClose={() => setEditingId(null)}
          onDelete={() => {
            setEditingId(null);
            setDeleteIds([editingFeed.id]);
          }}
          onSave={async (edits, stationNames) => {
            const saved = await library.updateFeed(editingFeed.id, edits);
            if (!saved) return false;
            return library.setFeedStations(editingFeed.id, stationNames);
          }}
        />
      ) : null}

      {deleteIds && deleteFeedsList.length > 0 ? (
        <DeleteFeedsDialog
          feeds={deleteFeedsList}
          onClose={() => setDeleteIds(null)}
          onConfirm={async () => {
            const ids = deleteFeedsList.map((feed) => feed.id);
            const deleted = await library.deleteFeeds(ids);
            if (deleted) {
              setDeleteIds(null);
              setEditingId((current) => (current && ids.includes(current) ? null : current));
              setSelected((current) => new Set([...current].filter((id) => !ids.includes(id))));
            }
          }}
        />
      ) : null}
    </div>
  );
};
