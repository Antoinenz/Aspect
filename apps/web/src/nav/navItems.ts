import {
  mdiHomeOutline, mdiStarOutline, mdiViewGridOutline,
  mdiMapMarkerRadiusOutline, mdiCogOutline,
} from '@mdi/js';

export type Section = 'home' | 'favorites' | 'rooms' | 'map' | 'settings';

export interface NavDestination {
  id: Section;
  label: string;
  icon: string;
}

/** Primary destinations (top of the sidebar / left of the bottom bar). */
export const NAV_ITEMS: NavDestination[] = [
  { id: 'home', label: 'Home', icon: mdiHomeOutline },
  { id: 'favorites', label: 'Favorites', icon: mdiStarOutline },
  { id: 'rooms', label: 'Rooms', icon: mdiViewGridOutline },
  { id: 'map', label: 'Map', icon: mdiMapMarkerRadiusOutline },
];

/** Settings is pinned to the bottom of the sidebar. */
export const SETTINGS_ITEM: NavDestination = {
  id: 'settings', label: 'Settings', icon: mdiCogOutline,
};

export const ALL_DESTINATIONS: NavDestination[] = [...NAV_ITEMS, SETTINGS_ITEM];
