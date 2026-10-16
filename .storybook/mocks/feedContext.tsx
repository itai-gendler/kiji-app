import type { ReactNode } from 'react';
import { getThemeDebugState } from '../../src/stories/themeDebugRuntime';

export function FeedProvider({ children }: { children: ReactNode }) {
  return children;
}

export function useFeedNavigation() {
  return getThemeDebugState().navigation;
}

export function useFeedCollectionArticles() {
  return getThemeDebugState().collection;
}

export function useFeedCollectionLoading() {
  return getThemeDebugState().collection;
}

export function useFeedCollectionActions() {
  return getThemeDebugState().actions;
}

export function useFeedCollection() {
  return {
    ...useFeedCollectionArticles(),
    ...useFeedCollectionLoading(),
    ...useFeedCollectionActions(),
  };
}

export function useFeedOverlay() {
  return getThemeDebugState().overlay;
}

export function useFeedUI() {
  return getThemeDebugState().ui;
}

export function useFeedUIActions() {
  return getThemeDebugState().ui;
}

export function useFeedFaviconRefreshed() {
  return getThemeDebugState().ui.feedFaviconRefreshed;
}

export function useFeed() {
  return {
    ...useFeedNavigation(),
    ...useFeedCollection(),
    ...useFeedOverlay(),
    ...useFeedUI(),
  };
}

