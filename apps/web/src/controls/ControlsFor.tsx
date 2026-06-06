import type { ReactElement } from 'react';
import type { EntityState } from '@aspect/shared';
import { domainOf } from '../domain/entities.js';
import { LightControls } from './LightControls.js';
import { CoverControls } from './CoverControls.js';
import { ClimateControls } from './ClimateControls.js';
import { ToggleControls } from './ToggleControls.js';
import { QuickAction } from './QuickAction.js';
import { HelperControls } from './HelperControls.js';
import { MediaPlayerControls } from './MediaPlayerControls.js';

/** Renders the right control set for an entity's domain, or null if read-only. */
export function ControlsFor({ entity }: { entity: EntityState }): ReactElement | null {
  switch (domainOf(entity.entityId)) {
    case 'light':
      return <LightControls entity={entity} />;
    case 'cover':
      return <CoverControls entity={entity} />;
    case 'climate':
      return <ClimateControls entity={entity} />;
    case 'switch':
    case 'fan':
    case 'lock':
      return <ToggleControls entity={entity} />;
    case 'scene':
    case 'script':
    case 'automation':
    case 'button':
      return <QuickAction entity={entity} />;
    case 'select':
    case 'number':
      return <HelperControls entity={entity} />;
    case 'media_player':
      return <MediaPlayerControls entity={entity} />;
    default:
      return null;
  }
}
