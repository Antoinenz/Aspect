import { mdiTelevision, mdiSpeaker, mdiSoundbar, mdiAmplifier } from '@mdi/js';
import type { ClassifyContext, MediaKind, Rule } from './types.js';

const MEDIA_NAME_PATTERNS: ReadonlyArray<readonly [RegExp, MediaKind]> = [
  [/sound\s?bar/i, 'soundbar'],
  [/receiver|amplifier|\bamp\b/i, 'receiver'],
  [/speaker/i, 'speaker'],
  [/\btv\b|television/i, 'tv'],
];

export const DEVICE_CLASS_RULES: Rule[] = [];

export const NAME_RULES: Rule[] = MEDIA_NAME_PATTERNS.map(([re, kind]) => ({
  kind,
  test: (ctx: ClassifyContext) => ctx.domain === 'media_player' && re.test(ctx.name),
}));

export const FALLBACK_RULES: Rule[] = [
  { kind: 'media_generic', test: (ctx) => ctx.domain === 'media_player' },
];

export const ICONS: Record<MediaKind, string> = {
  tv: mdiTelevision,
  speaker: mdiSpeaker,
  soundbar: mdiSoundbar,
  receiver: mdiAmplifier,
  media_generic: mdiSpeaker,
};
