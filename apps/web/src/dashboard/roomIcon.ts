import {
  mdiSofaOutline, mdiFridgeOutline, mdiBedOutline, mdiDesk, mdiShower,
  mdiGarage, mdiStairs, mdiTree, mdiDoorOpen, mdiHomeOutline,
} from '@mdi/js';

const ROOM_ICONS: { match: RegExp; path: string }[] = [
  { match: /living|lounge|sofa|tv/i, path: mdiSofaOutline },
  { match: /kitchen|dining/i, path: mdiFridgeOutline },
  { match: /bed|master/i, path: mdiBedOutline },
  { match: /office|study|desk/i, path: mdiDesk },
  { match: /bath|shower|toilet|wc/i, path: mdiShower },
  { match: /garage/i, path: mdiGarage },
  { match: /hall|stair|landing/i, path: mdiStairs },
  { match: /garden|yard|outdoor|patio/i, path: mdiTree },
  { match: /entr|porch|door/i, path: mdiDoorOpen },
];

/** Best-guess MDI icon for a room/area name. */
export function roomIcon(name: string): string {
  for (const { match, path } of ROOM_ICONS) if (match.test(name)) return path;
  return mdiHomeOutline;
}
