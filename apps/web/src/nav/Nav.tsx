import type { ReactElement } from 'react';
import { Sidebar } from './Sidebar.js';
import { BottomBar } from './BottomBar.js';

/**
 * Renders both navigation surfaces; CSS shows the sidebar on >=md and the
 * bottom bar on <md. URL-driven — neither takes any props.
 */
export function Nav(): ReactElement {
  return (
    <>
      <Sidebar />
      <BottomBar />
    </>
  );
}
