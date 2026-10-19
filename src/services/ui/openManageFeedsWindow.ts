import { logger } from '@/services/logger';
import { appToastService } from '@/services/ui/appToastService';
import type { ManageFeedsTarget } from '@/types/manageFeeds';

export const MANAGE_FEEDS_WINDOW_OPEN_FAILED_TOAST = 'Couldn’t open Manage Feeds. Try again.';

/**
 * Open Manage Feeds from the sidebar button, row menus, Cmd/Ctrl+E or the app menu.
 * `target` names the feed, station or library item to reveal. The main window keeps its
 * selection and article list; the separate window edits the library beside it.
 */
export async function openManageFeedsWindow(target?: ManageFeedsTarget): Promise<void> {
  if (!window.kijiAPI?.openManageFeeds) {
    return;
  }
  try {
    await window.kijiAPI.openManageFeeds(target ?? null);
  } catch (error) {
    logger.error('ManageFeeds', 'Failed to open manage feeds window', { error, target });
    appToastService.show(MANAGE_FEEDS_WINDOW_OPEN_FAILED_TOAST);
  }
}
