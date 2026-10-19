import React, { useEffect, useRef, useState } from 'react';
import { DragHandleGlyph, EyeGlyph, EyeSlashGlyph } from '@/components/SettingsWindow/settingsIcons';
import { SettingsSwitch } from '@/components/SettingsWindow/settingsControls';
import type { SmartViewId } from '@/constants';
import { moveItem, reorderById, type LibraryItemRow } from './manageFeedsModel';
import type { ManageFeedsLibraryApi } from './useManageFeedsLibrary';

interface LibraryPaneProps {
  library: ManageFeedsLibraryApi;
  revealItemId: SmartViewId | null;
  onRevealHandled: () => void;
}

/** Sidebar Library items (Unread, All, Saved…): order and visibility. */
export const LibraryPane: React.FC<LibraryPaneProps> = ({ library, revealItemId, onRevealHandled }) => {
  const { libraryItems } = library;
  const [drag, setDrag] = useState<{ id: string; overId: string | null; placement: 'before' | 'after' } | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);
  const rowRefs = useRef(new Map<string, HTMLLIElement>());

  useEffect(() => {
    if (!revealItemId || library.status !== 'ready') return;
    onRevealHandled();
    const node = rowRefs.current.get(revealItemId);
    node?.scrollIntoView?.({ block: 'center' });
    node?.focus({ preventScroll: true });
    setFlashId(revealItemId);
    const timer = window.setTimeout(() => setFlashId(null), 900);
    return () => window.clearTimeout(timer);
  }, [library.status, onRevealHandled, revealItemId]);

  const save = (items: LibraryItemRow[]) => {
    void library.setLibraryItems(items);
  };

  const move = (id: string, delta: number) => {
    const index = libraryItems.findIndex((item) => item.id === id);
    const next = moveItem(libraryItems, index, index + delta);
    if (next !== libraryItems) {
      save(next);
      window.setTimeout(() => rowRefs.current.get(id)?.focus(), 0);
    }
  };

  return (
    <div className="mf-pane-body" data-pane="library">
      <div className="mf-toolbar">
        <p className="mf-toolbar-note">Choose which views appear under Library in the sidebar, and their order. Drag or press Option-↑/↓ to move a view.</p>
      </div>
      <div className="mf-list-scroll">
        <ul className="mf-list mf-list-card" aria-label="Library items">
          {libraryItems.map((item) => (
            <li
              key={item.id}
              ref={(node) => {
                if (node) rowRefs.current.set(item.id, node);
                else rowRefs.current.delete(item.id);
              }}
              tabIndex={0}
              aria-label={`${item.label}, ${item.visible ? 'shown' : 'hidden'}`}
              aria-description="Option-Up or Option-Down to move."
              className={[
                'mf-row',
                'mf-library-row',
                item.visible ? '' : 'is-hidden-item',
                flashId === item.id ? 'is-flashing' : '',
                drag?.id === item.id ? 'is-dragging' : '',
                drag?.overId === item.id && drag.id !== item.id ? `is-drop-${drag.placement}` : '',
              ].filter(Boolean).join(' ')}
              onKeyDown={(event) => {
                if (event.target !== event.currentTarget) return;
                if (event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
                  event.preventDefault();
                  move(item.id, event.key === 'ArrowDown' ? 1 : -1);
                } else if (event.key === ' ' || event.key === 'Enter') {
                  event.preventDefault();
                  save(libraryItems.map((entry) => (entry.id === item.id ? { ...entry, visible: !entry.visible } : entry)));
                }
              }}
              onDragOver={(event) => {
                if (!drag || drag.id === item.id) return;
                event.preventDefault();
                const rect = event.currentTarget.getBoundingClientRect();
                const placement = event.clientY >= rect.top + rect.height / 2 ? 'after' : 'before';
                if (drag.overId !== item.id || drag.placement !== placement) {
                  setDrag({ ...drag, overId: item.id, placement });
                }
              }}
              onDrop={(event) => {
                event.preventDefault();
                const current = drag;
                setDrag(null);
                if (!current?.overId || current.overId === current.id) return;
                const next = reorderById(libraryItems, current.id, current.overId, current.placement, (entry) => entry.id);
                if (next !== libraryItems) save(next);
              }}
            >
              <span
                className="mf-drag-handle"
                draggable
                aria-hidden="true"
                title="Drag to reorder"
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = 'move';
                  event.dataTransfer.setData('text/plain', item.id);
                  setDrag({ id: item.id, overId: item.id, placement: 'before' });
                }}
                onDragEnd={() => setDrag(null)}
              >
                <DragHandleGlyph />
              </span>
              <span className="mf-library-visibility" aria-hidden="true">
                {item.visible ? <EyeGlyph /> : <EyeSlashGlyph />}
              </span>
              <div className="mf-row-main">
                <div className="mf-row-title">{item.label}</div>
              </div>
              <span className="mf-library-state" aria-hidden="true">{item.visible ? 'Shown' : 'Hidden'}</span>
              <SettingsSwitch
                checked={item.visible}
                label={`Show ${item.label} in the sidebar`}
                onChange={(visible) => save(libraryItems.map((entry) => (entry.id === item.id ? { ...entry, visible } : entry)))}
              />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
