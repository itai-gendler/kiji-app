import { invokeCommand } from "./core";

export type AssistantClientId =
  | "claude-desktop"
  | "claude-code"
  | "cursor"
  | "vscode"
  | "codex"
  | "url"
  | "command";

export type AssistantListenerState =
  | { state: "off" }
  | { state: "starting" }
  | { state: "ready" }
  | { state: "error"; message: string };

export interface AssistantSettingsView {
  enabled: boolean;
  shareCurrentArticle: boolean;
  /** `null` = every station. */
  sharedStations: string[] | null;
  includeUnstationedFeeds: boolean;
  shareSavedArticles: boolean;
  shareNotesAndHighlights: boolean;
  /** Write tools (mark read, star, save). Off by default. */
  allowChanges: boolean;
  httpEnabled: boolean;
  httpPort: number;
}

export type AssistantSettingsPatch = Partial<AssistantSettingsView>;

export interface AssistantConnectedClient {
  name: string;
  transport: "local" | "url";
  connectedAt: string;
  lastUsedAt?: string;
  lastAction?: string;
}

export interface AssistantStatus {
  settings: AssistantSettingsView;
  local: AssistantListenerState;
  http: AssistantListenerState;
  clients: AssistantConnectedClient[];
}

export interface AssistantClientSetup {
  client: AssistantClientId;
  text: string;
  hint: string;
  hasInstallLink: boolean;
}

export type CurrentArticleKind = "feed" | "saved" | "temporary";

export interface CurrentArticlePayload {
  kind: CurrentArticleKind;
  hash?: string;
  savedId?: string;
  title?: string;
  link?: string;
  feedTitle?: string;
  author?: string;
  publishedDate?: string;
  bodyHtml?: string;
  readerMode?: boolean;
}

export async function getStatus(): Promise<AssistantStatus> {
  return invokeCommand<AssistantStatus>("assistant_get_status");
}

export async function updateSettings(patch: AssistantSettingsPatch): Promise<AssistantStatus> {
  return invokeCommand<AssistantStatus>("assistant_update_settings", { patch });
}

export async function resetAccess(): Promise<AssistantStatus> {
  return invokeCommand<AssistantStatus>("assistant_reset_access");
}

export async function getClientSetup(client: AssistantClientId): Promise<AssistantClientSetup> {
  return invokeCommand<AssistantClientSetup>("assistant_get_client_setup", { client });
}

export async function openClientLink(client: AssistantClientId): Promise<void> {
  return invokeCommand<void>("assistant_open_client_link", { client });
}

export async function writeExtension(path: string): Promise<void> {
  return invokeCommand<void>("assistant_write_extension", { path });
}

/** Native event (payload: boolean) when current-article sharing turns on/off. */
export const CURRENT_ARTICLE_SHARING_EVENT = "assistant-current-article-sharing";

export async function getCurrentArticleSharing(): Promise<boolean> {
  return invokeCommand<boolean>("assistant_current_article_sharing");
}

export async function setCurrentArticle(article: CurrentArticlePayload): Promise<void> {
  return invokeCommand<void>("assistant_set_current_article", { article });
}

export async function clearCurrentArticle(): Promise<void> {
  return invokeCommand<void>("assistant_clear_current_article");
}
