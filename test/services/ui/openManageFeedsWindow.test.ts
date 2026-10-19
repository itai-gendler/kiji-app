import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

vi.mock('@tauri-apps/api/window', () => ({ getCurrentWindow: vi.fn() }));
vi.mock('@/services/system/appUpdateService', () => ({ openAboutWindow: vi.fn() }));
vi.mock('@/services/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

import { appToastService } from '@/services/ui/appToastService';
import { dispatchAppMenuAction } from '@/services/ui/dispatchAppMenuAction';
import {
  MANAGE_FEEDS_WINDOW_OPEN_FAILED_TOAST,
  openManageFeedsWindow,
} from '@/services/ui/openManageFeedsWindow';

const setApi = (value: unknown) => {
  Object.defineProperty(window, 'kijiAPI', { configurable: true, value });
};

describe('openManageFeedsWindow', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    setApi(undefined);
  });

  it('opens the window with the row to reveal', async () => {
    const openManageFeeds = vi.fn().mockResolvedValue(undefined);
    setApi({ openManageFeeds });
    await openManageFeedsWindow({ kind: 'station', id: 'News' });
    expect(openManageFeeds).toHaveBeenCalledWith({ kind: 'station', id: 'News' });
  });

  it('shows plain copy when the window cannot open', async () => {
    setApi({ openManageFeeds: vi.fn().mockRejectedValue(new Error('WindowLabelAlreadyExists')) });
    const show = vi.spyOn(appToastService, 'show');
    await openManageFeedsWindow();
    expect(show).toHaveBeenCalledWith(MANAGE_FEEDS_WINDOW_OPEN_FAILED_TOAST);
    expect(MANAGE_FEEDS_WINDOW_OPEN_FAILED_TOAST).not.toMatch(/window label|exists|error/i);
  });

  it('routes the Windows/Linux menu item to the window', async () => {
    const openManageFeeds = vi.fn().mockResolvedValue(undefined);
    setApi({ openManageFeeds });
    await dispatchAppMenuAction({ type: 'openManageFeeds' });
    expect(openManageFeeds).toHaveBeenCalledWith(null);
  });

  it('keeps every sidebar entry point on the separate window (no in-list edit view)', () => {
    const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');
    for (const path of [
      'src/components/Sidebar/BottomWidget.tsx',
      'src/components/Sidebar/FeedList.tsx',
      'src/components/Sidebar/TagManager.tsx',
      'src/components/Sidebar/SmartViews.tsx',
      'src/hooks/useAppEffects.ts',
    ]) {
      const source = read(path);
      expect(source, path).toContain('openManageFeedsWindow');
      expect(source, path).not.toMatch(/openFeedEditView\(/);
    }
    expect(read('src/components/MainArea/MainArea.tsx')).not.toContain('FeedEditView');
  });
});
