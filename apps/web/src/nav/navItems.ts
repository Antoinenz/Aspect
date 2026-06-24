import {
  mdiHomeOutline, mdiStarOutline, mdiViewGridOutline,
  mdiMapMarkerRadiusOutline, mdiCogOutline,
} from '@mdi/js';

export type Section = 'home' | 'favorites' | 'rooms' | 'map' | 'settings' | 'admin';

export interface NavDestination {
  id: Section;
  label: string;
  icon: string;
  /** Canonical URL path for this destination. */
  path: string;
}

/** Primary destinations (top of the sidebar / left of the bottom bar). */
export const NAV_ITEMS: NavDestination[] = [
  { id: 'home', label: 'Home', icon: mdiHomeOutline, path: '/home' },
  { id: 'favorites', label: 'Favourites', icon: mdiStarOutline, path: '/favourites' },
  { id: 'rooms', label: 'Rooms', icon: mdiViewGridOutline, path: '/rooms' },
  { id: 'map', label: 'Map', icon: mdiMapMarkerRadiusOutline, path: '/map' },
];

/** Settings is pinned to the bottom of the sidebar. */
export const SETTINGS_ITEM: NavDestination = {
  id: 'settings', label: 'Settings', icon: mdiCogOutline, path: '/settings',
};

export const ALL_DESTINATIONS: NavDestination[] = [...NAV_ITEMS, SETTINGS_ITEM];

/**
 * Map of the URL paths the app navigates between. Order matters: it drives
 * the slide direction (forward vs backward) for entrance animations.
 *
 * Sub-routes get a half-step rank so going /rooms → /rooms/kitchen feels
 * "deeper" (forward) and the reverse feels backward, even though both share
 * the Rooms nav slot.
 */
const PAGE_RANKS: { match: (p: string) => boolean; rank: number }[] = [
  { match: (p) => p === '/' || p.startsWith('/home'), rank: 0 },
  { match: (p) => p.startsWith('/favourites'), rank: 1 },
  { match: (p) => p === '/rooms', rank: 2 },
  { match: (p) => p.startsWith('/rooms/'), rank: 2.5 },
  { match: (p) => p.startsWith('/map'), rank: 3 },
  { match: (p) => p === '/settings', rank: 4 },
  { match: (p) => p === '/admin', rank: 4.5 },
  { match: (p) => p.startsWith('/admin/'), rank: 4.75 },
];

export function pageRank(pathname: string): number {
  return PAGE_RANKS.find((r) => r.match(pathname))?.rank ?? 0;
}

/** Which top-level nav item should be highlighted for this pathname. */
export function activeSectionFor(pathname: string): Section | null {
  if (pathname === '/' || pathname.startsWith('/home')) return 'home';
  if (pathname.startsWith('/favourites')) return 'favorites';
  if (pathname.startsWith('/rooms')) return 'rooms';
  if (pathname.startsWith('/map')) return 'map';
  if (pathname.startsWith('/settings')) return 'settings';
  if (pathname.startsWith('/admin')) return 'admin';
  return null;
}
