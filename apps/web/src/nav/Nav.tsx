import type { ReactElement } from 'react';
import { Sidebar } from './Sidebar.js';
import { BottomBar } from './BottomBar.js';
import type { Section } from './navItems.js';

/** Renders both; CSS shows the sidebar on >=md and the bottom bar on <md. */
export function Nav({ section, onNavigate }: { section: Section; onNavigate: (s: Section) => void }): ReactElement {
  return (
    <>
      <Sidebar section={section} onNavigate={onNavigate} />
      <BottomBar section={section} onNavigate={onNavigate} />
    </>
  );
}
