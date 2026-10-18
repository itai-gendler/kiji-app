export interface ReleaseDownloadOption {
  id: string;
  platform: string;
  label: string;
  detail?: string;
  fileType?: string;
  fileName: string;
  version: string;
  url: string;
  size?: number;
}

/** One group of release notes ("New", "Improved", "Fixed"), plain text items. */
export interface ReleaseNotesSection {
  title: string;
  items: string[];
}

/** `release.json` `notes`, generated from the confirmed CHANGELOG.md section. */
export interface ReleaseNotes {
  summary?: string;
  sections: ReleaseNotesSection[];
  /** Website locales (`zh-Hans`, `ja`); the app UI is English and reads the top level. */
  translations?: Record<string, { summary?: string; sections: ReleaseNotesSection[] }>;
}

export interface ReleaseManifest {
  productName?: string;
  version: string;
  tag?: string;
  date?: string;
  notesUrl?: string;
  updatesFeedUrl?: string;
  checksumsUrl?: string;
  notes?: ReleaseNotes;
  downloadOptions?: ReleaseDownloadOption[];
}

export interface UpdateAvailability {
  currentVersion: string;
  latestVersion: string;
  releasedAt?: string;
  summary: string;
  /** What changed, grouped; empty for manifests published before notes existed. */
  sections: ReleaseNotesSection[];
  downloadUrl: string;
  notesUrl?: string;
}

/** Payload for the shared About / update secondary window. */
export interface UpdateWindowPayload {
  currentVersion: string;
  /**
   * When true (About / Check for Updates), the window fetches the release
   * manifest on open and shows a loading state until the check settles.
   */
  checkOnOpen?: boolean;
  /** Prefill when the caller already knows an update is available (sidebar). */
  update?: UpdateAvailability | null;
}

export type UpdateCheckResult =
  | { status: 'available'; availability: UpdateAvailability }
  | { status: 'up-to-date'; currentVersion: string }
  | { status: 'error'; message?: string };
