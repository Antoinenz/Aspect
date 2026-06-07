import type { CSSProperties, ReactNode } from 'react';
import { SQUIRCLE } from './tokens.js';

/**
 * iOS-style continuous-corner container. Uses CSS `corner-shape: superellipse`
 * where supported (Chrome/Edge) and degrades to a normal rounded radius on
 * Safari/Firefox until those ship it. `border-radius` is always set so the
 * shape is correct everywhere; the superellipse just squares the curve.
 */
export function Squircle({
  radius = 24,
  className,
  style,
  children,
  ...rest
}: {
  radius?: number;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
} & React.HTMLAttributes<HTMLDivElement>): React.ReactElement {
  const squircleStyle = {
    borderRadius: `${radius}px`,
    cornerShape: `superellipse(${SQUIRCLE})`,
    ...style,
  } as CSSProperties;
  return (
    <div className={className} style={squircleStyle} {...rest}>
      {children}
    </div>
  );
}
