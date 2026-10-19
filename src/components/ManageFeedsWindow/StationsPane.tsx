import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EmojiSubmenu } from '@/components/common/EmojiPicker/EmojiSubmenu';
import {
  DragHandleGlyph,
  FeedsGlyph,
  PencilGlyph,
  PlusGlyph,
  StationsGlyph,
  TrashGlyph,
} from '@/components/SettingsWindow/settingsIcons';
import type { Tag } from '@/types/tag';
import {
  feedSiteLabel,
  matchesFeedSearch,
  moveItem,
  pluralize,
  reorderById,
  sortFeeds,
} from './manageFeedsModel';
import { Dialog, EmptyState, FeedIcon, SearchField } from './ManageFeedsControls';
import type { ManageFeedsLibraryApi } from './useManageFeedsLibrary';

interface DragState {
  name: string;
  overName: string | null;
  placement: 'before' | 'after';
}

/* ── Station feeds picker ────────────────────────────────────────────────── */

export const StationFeedsDialog: React.FC<{
  station: Tag;
  library: ManageFeedsLibraryApi;
  onClose: () => void;
}> = ({ station, library, onClose }) => {
  const [query, setQuery] = useState('');
  const [chosen, setChosen] = useState<ReadonlySet<string>>(() => new Set(station.feedIds));
  const [saving, setSaving] = useState(false);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const feeds = useMemo(() => sortFeeds(library.feeds, 'name'), [library.feeds]);
  const visible = useMemo(
    () => feeds.filter((feed) => matchesFeedSearch(feed, [], query)),
    [feeds, query],
  );

  const save = async () => {
    setSaving(true);
    try {
      const ordered = [
        ...station.feedIds.filter((id) => chosen.has(id)),
        ...feeds.map((feed) => feed.id).filter((id) => chosen.has(id) && !station.feedIds.includes(id)),
      ];
      if (await library.setStationFeeds(station.name, ordered)) onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      title={`Feeds in ${station.emoji ? `${station.emoji} ` : ''}${station.name}`}
      description={`${pluralize(chosen.size, 'feed')} chosen. A feed can be in several stations.`}
      onClose={onClose}
      busy={saving}
      wide
      initialFocusRef={searchRef}
      footer={(
        <>
          <button type="button" className="settings-action-button" onClick={onClose} disabled={saving}>Cancel</button>
          <button
            type="button"
            className="settings-action-button settings-action-button-primary"
            onClick={() => { void save(); }}
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </>
      )}
    >
      <SearchField value={query} placeholder="Search feeds" inputRef={searchRef} onChange={setQuery} />
      {library.feeds.length === 0 ? (
        <p className="mf-hint">No feeds yet. Add feeds first, then group them here.</p>
      ) : visible.length === 0 ? (
        <p className="mf-hint">No feeds match “{query.trim()}”.</p>
      ) : (
        <div className="mf-picker" role="group" aria-label="Feeds">
          {visible.map((feed) => (
            <label key={feed.id} className="mf-picker-row">
              <input
                type="checkbox"
                checked={chosen.has(feed.id)}
                onChange={(event) => setChosen((current) => {
                  const next = new Set(current);
                  if (event.target.checked) next.add(feed.id);
                  else next.delete(feed.id);
                  return next;
                })}
              />
              <FeedIcon feed={feed} />
              <span className="mf-picker-title">{feed.title}</span>
              <span className="mf-picker-site">{feedSiteLabel(feed.url)}</span>
            </label>
          ))}
        </div>
      )}
    </Dialog>
  );
};

/* ── Delete station ──────────────────────────────────────────────────────── */

export const DeleteStationDialog: React.FC<{
  station: Tag;
  onDelete: (withFeeds: boolean) => Promise<boolean>;
  onClose: () => void;
}> = ({ station, onDelete, onClose }) => {
  const [busy, setBusy] = useState(false);
  const cancelRef = useRef<HTMLButtonElement | null>(null);
  const hasFeeds = station.feedIds.length > 0;
  const run = (withFeeds: boolean) => {
    setBusy(true);
    void onDelete(withFeeds).then((done) => {
      if (done) onClose();
    }).finally(() => setBusy(false));
  };
  return (
    <Dialog
      title={`Delete “${station.name}”?`}
      description={hasFeeds ? (
        <>
          <p>Its {pluralize(station.feedIds.length, 'feed')} stay in your library, outside any station.</p>
          <p>To also remove feeds that are only in this station, with their articles, choose Delete Station and Feeds. Feeds that are in other stations are kept.</p>
        </>
      ) : 'This station has no feeds.'}
      onClose={onClose}
      busy={busy}
      initialFocusRef={cancelRef}
      footer={(
        <>
          {hasFeeds ? (
            <button
              type="button"
              className="settings-action-button mf-button-destructive mf-footer-leading"
              disabled={busy}
              onClick={() => run(true)}
            >
              Delete Station and Feeds
            </button>
          ) : null}
          <button ref={cancelRef} type="button" className="settings-action-button" onClick={onClose} disabled={busy}>Cancel</button>
          <button
            type="button"
            className="settings-action-button mf-button-destructive-filled"
            disabled={busy}
            onClick={() => run(false)}
          >
            {busy ? 'Deleting…' : 'Delete Station'}
          </button>
        </>
      )}
    />
  );
};

/* ── Pane ────────────────────────────────────────────────────────────────── */

interface StationsPaneProps {
  library: ManageFeedsLibraryApi;
  revealStationName: string | null;
  onRevealHandled: () => void;
}

export const StationsPane: React.FC<StationsPaneProps> = ({ library, revealStationName, onRevealHandled }) => {
  const { stations, status } = library;
  const [focusedName, setFocusedName] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<{ name: string; draft: string } | null>(null);
  const [emojiFor, setEmojiFor] = useState<{ name: string; anchor: HTMLElement } | null>(null);
  const [feedsFor, setFeedsFor] = useState<string | null>(null);
  const [deleteFor, setDeleteFor] = useState<string | null>(null);
  const [flashName, setFlashName] = useState<string | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const [dragView, setDragView] = useState<DragState | null>(null);
  const rowRefs = useRef(new Map<string, HTMLLIElement>());
  const names = useMemo(() => stations.map((station) => station.name), [stations]);
  const stationByName = useMemo(() => new Map(stations.map((station) => [station.name, station])), [stations]);

  const focusRow = useCallback((name: string) => {
    setFocusedName(name);
    const node = rowRefs.current.get(name);
    node?.focus({ preventScroll: true });
    node?.scrollIntoView?.({ block: 'nearest' });
  }, []);

  useEffect(() => {
    if (!revealStationName || status !== 'ready') return;
    onRevealHandled();
    if (!stationByName.has(revealStationName)) return;
    setFocusedName(revealStationName);
    const node = rowRefs.current.get(revealStationName);
    node?.scrollIntoView?.({ block: 'center' });
    node?.focus({ preventScroll: true });
    setFlashName(revealStationName);
    const timer = window.setTimeout(() => setFlashName(null), 900);
    return () => window.clearTimeout(timer);
  }, [onRevealHandled, revealStationName, stationByName, status]);

  useEffect(() => {
    if (!emojiFor) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target || emojiFor.anchor.contains(target) || target.closest('.emoji-submenu, .mf-emoji-clear')) return;
      setEmojiFor(null);
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [emojiFor]);

  const commitRename = async () => {
    if (!renaming) return;
    const { name, draft } = renaming;
    setRenaming(null);
    const done = await library.renameStation(name, draft);
    focusRow(done && draft.trim() ? draft.trim() : name);
  };

  const createStation = async () => {
    const name = await library.createStation();
    if (name) {
      setRenaming({ name, draft: name });
      setFocusedName(name);
    }
  };

  const moveStation = (name: string, delta: number) => {
    const index = names.indexOf(name);
    const next = moveItem(names, index, index + delta);
    if (next !== names) void library.reorderStations(next);
  };

  const handleListKeyDown = (event: React.KeyboardEvent<HTMLUListElement>) => {
    if (renaming || names.length === 0) return;
    const target = event.target as HTMLElement;
    if (target.tagName.toLowerCase() === 'input') return;
    const index = focusedName ? names.indexOf(focusedName) : -1;
    if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && event.altKey && focusedName) {
      event.preventDefault();
      moveStation(focusedName, event.key === 'ArrowDown' ? 1 : -1);
      return;
    }
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        focusRow(names[Math.min(names.length - 1, index + 1)]);
        return;
      case 'ArrowUp':
        event.preventDefault();
        focusRow(names[Math.max(0, index - 1)]);
        return;
      case 'Enter':
        if (focusedName) {
          event.preventDefault();
          setRenaming({ name: focusedName, draft: focusedName });
        }
        return;
      case 'Delete':
      case 'Backspace':
        if (focusedName) {
          event.preventDefault();
          setDeleteFor(focusedName);
        }
        return;
      default:
    }
  };

  const updateDrag = (next: DragState | null) => {
    dragRef.current = next;
    setDragView(next);
  };

  const feedsStation = feedsFor ? stationByName.get(feedsFor) ?? null : null;
  const deleteStation = deleteFor ? stationByName.get(deleteFor) ?? null : null;
  const tabStop = focusedName && stationByName.has(focusedName) ? focusedName : names[0] ?? null;

  const renderList = () => {
    if (status === 'loading' && stations.length === 0) {
      return <div className="mf-loading" role="status">Loading stations…</div>;
    }
    if (stations.length === 0) {
      return (
        <EmptyState
          icon={<StationsGlyph />}
          title="No stations yet"
          message="Stations group feeds by topic, like News or Design. Each one gets a place in the sidebar."
          action={(
            <button type="button" className="settings-action-button settings-action-button-primary" onClick={() => { void createStation(); }}>
              <PlusGlyph />
              New Station
            </button>
          )}
        />
      );
    }
    return (
      <ul className="mf-list" aria-label="Stations" onKeyDown={handleListKeyDown}>
        {stations.map((station) => {
          const isRenaming = renaming?.name === station.name;
          const isDropBefore = dragView?.overName === station.name && dragView.placement === 'before' && dragView.name !== station.name;
          const isDropAfter = dragView?.overName === station.name && dragView.placement === 'after' && dragView.name !== station.name;
          return (
            <li
              key={station.name}
              ref={(node) => {
                if (node) rowRefs.current.set(station.name, node);
                else rowRefs.current.delete(station.name);
              }}
              tabIndex={tabStop === station.name ? 0 : -1}
              aria-label={`${station.name}, ${pluralize(station.feedIds.length, 'feed')}`}
              aria-description="Press Return to rename, Option-Up or Option-Down to move."
              className={[
                'mf-row',
                'mf-station-row',
                focusedName === station.name ? 'is-focused' : '',
                flashName === station.name ? 'is-flashing' : '',
                dragView?.name === station.name ? 'is-dragging' : '',
                isDropBefore ? 'is-drop-before' : '',
                isDropAfter ? 'is-drop-after' : '',
              ].filter(Boolean).join(' ')}
              data-station-name={station.name}
              onFocus={(event) => {
                if (event.target === event.currentTarget) setFocusedName(station.name);
              }}
              onClick={() => setFocusedName(station.name)}
              onDoubleClick={() => setFeedsFor(station.name)}
              onDragOver={(event) => {
                const drag = dragRef.current;
                if (!drag || drag.name === station.name) return;
                event.preventDefault();
                const rect = event.currentTarget.getBoundingClientRect();
                const placement = event.clientY >= rect.top + rect.height / 2 ? 'after' : 'before';
                if (drag.overName !== station.name || drag.placement !== placement) {
                  updateDrag({ ...drag, overName: station.name, placement });
                }
              }}
              onDrop={(event) => {
                event.preventDefault();
                const drag = dragRef.current;
                updateDrag(null);
                if (!drag?.overName || drag.overName === drag.name) return;
                const next = reorderById(names, drag.name, drag.overName, drag.placement, (name) => name);
                if (next !== names) void library.reorderStations(next);
              }}
            >
              <span
                className="mf-drag-handle"
                draggable
                aria-hidden="true"
                title="Drag to reorder"
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = 'move';
                  event.dataTransfer.setData('text/plain', station.name);
                  updateDrag({ name: station.name, overName: station.name, placement: 'before' });
                }}
                onDragEnd={() => updateDrag(null)}
              >
                <DragHandleGlyph />
              </span>
              <button
                type="button"
                tabIndex={-1}
                className={`mf-station-emoji${station.emoji ? '' : ' is-empty'}`}
                aria-label={station.emoji ? `Change emoji for ${station.name}` : `Choose an emoji for ${station.name}`}
                title={station.emoji ? 'Change emoji' : 'Choose an emoji'}
                onClick={(event) => {
                  event.stopPropagation();
                  const anchor = event.currentTarget;
                  setEmojiFor((current) => (current?.name === station.name ? null : { name: station.name, anchor }));
                }}
              >
                {station.emoji || <StationsGlyph />}
              </button>
              <div className="mf-row-main">
                {isRenaming ? (
                  <input
                    className="mf-input mf-inline-input"
                    aria-label="Station name"
                    value={renaming.draft}
                    autoFocus
                    onFocus={(event) => event.currentTarget.select()}
                    onChange={(event) => setRenaming({ name: station.name, draft: event.target.value })}
                    onBlur={() => { void commitRename(); }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        void commitRename();
                      } else if (event.key === 'Escape') {
                        event.preventDefault();
                        event.stopPropagation();
                        setRenaming(null);
                        focusRow(station.name);
                      }
                    }}
                  />
                ) : (
                  <div className="mf-row-title">{station.name}</div>
                )}
              </div>
              <div className="mf-row-stat">
                {station.feedIds.length}
                <span className="mf-row-stat-unit">{station.feedIds.length === 1 ? 'feed' : 'feeds'}</span>
              </div>
              <div className="mf-row-actions">
                <button
                  type="button"
                  tabIndex={-1}
                  className="settings-icon-button mf-row-action"
                  aria-label={`Choose feeds for ${station.name}`}
                  title="Choose feeds"
                  onClick={(event) => {
                    event.stopPropagation();
                    setFeedsFor(station.name);
                  }}
                >
                  <FeedsGlyph />
                </button>
                <button
                  type="button"
                  tabIndex={-1}
                  className="settings-icon-button mf-row-action"
                  aria-label={`Rename ${station.name}`}
                  title="Rename"
                  onClick={(event) => {
                    event.stopPropagation();
                    setRenaming({ name: station.name, draft: station.name });
                  }}
                >
                  <PencilGlyph />
                </button>
                <button
                  type="button"
                  tabIndex={-1}
                  className="settings-icon-button mf-row-action is-destructive"
                  aria-label={`Delete station ${station.name}`}
                  title="Delete"
                  onClick={(event) => {
                    event.stopPropagation();
                    setDeleteFor(station.name);
                  }}
                >
                  <TrashGlyph />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <div className="mf-pane-body" data-pane="stations">
      <div className="mf-toolbar">
        <p className="mf-toolbar-note">
          {stations.length > 0 ? 'Drag to set the sidebar order. Double-click a station to choose its feeds.' : ' '}
        </p>
        <button
          type="button"
          className="settings-action-button settings-action-button-primary"
          onClick={() => { void createStation(); }}
        >
          <PlusGlyph />
          New Station
        </button>
      </div>
      <div className="mf-list-scroll">{renderList()}</div>

      <EmojiSubmenu
        isOpen={!!emojiFor}
        anchorEl={emojiFor?.anchor ?? null}
        position="right"
        onEmojiSelect={(emoji) => {
          const name = emojiFor?.name;
          setEmojiFor(null);
          if (name) void library.setStationEmoji(name, emoji);
        }}
        onClose={() => setEmojiFor(null)}
        onMouseEnter={() => {}}
        onMouseLeave={() => {}}
        selectedEmoji={emojiFor ? stationByName.get(emojiFor.name)?.emoji : undefined}
      />
      {emojiFor && stationByName.get(emojiFor.name)?.emoji ? (
        <button
          type="button"
          className="mf-emoji-clear"
          style={{
            left: emojiFor.anchor.getBoundingClientRect().left,
            top: emojiFor.anchor.getBoundingClientRect().bottom + 6,
          }}
          onClick={() => {
            const name = emojiFor.name;
            setEmojiFor(null);
            void library.setStationEmoji(name, '');
          }}
        >
          Remove Emoji
        </button>
      ) : null}

      {feedsStation ? (
        <StationFeedsDialog
          key={feedsStation.name}
          station={feedsStation}
          library={library}
          onClose={() => setFeedsFor(null)}
        />
      ) : null}

      {deleteStation ? (
        <DeleteStationDialog
          station={deleteStation}
          onClose={() => setDeleteFor(null)}
          onDelete={(withFeeds) => library.deleteStation(deleteStation.name, { withFeeds })}
        />
      ) : null}
    </div>
  );
};

