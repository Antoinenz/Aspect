import { create } from 'zustand';

const KEY = 'aspect-fav-rooms';

const load = (): string[] => {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') as string[]; }
  catch { return []; }
};

interface RoomFavState {
  favRooms: Set<string>;
  isFav: (areaId: string) => boolean;
  toggle: (areaId: string) => void;
}

export const useRoomFavourites = create<RoomFavState>((set, get) => ({
  favRooms: new Set(load()),
  isFav: (areaId) => get().favRooms.has(areaId),
  toggle: (areaId) => {
    const next = new Set(get().favRooms);
    if (next.has(areaId)) next.delete(areaId); else next.add(areaId);
    localStorage.setItem(KEY, JSON.stringify([...next]));
    set({ favRooms: next });
  },
}));
