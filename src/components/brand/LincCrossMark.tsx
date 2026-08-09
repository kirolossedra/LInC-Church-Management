import type { CSSProperties, SVGProps } from 'react';

export type LincCrossPalette = 'wine' | 'night' | 'ivory';

interface LincCrossMarkProps extends Omit<SVGProps<SVGSVGElement>, 'color'> {
  size?: number | string;
  palette?: LincCrossPalette;
  title?: string;
}

const PALETTES: Record<
  LincCrossPalette,
  { background: string; cross: string; accent: string }
> = {
  wine: {
    background: '#8b1e1e',
    cross: '#fffaf1',
    accent: '#f2a900',
  },
  night: {
    background: '#1b0d0d',
    cross: '#fffaf1',
    accent: '#f2a900',
  },
  ivory: {
    background: '#fffaf1',
    cross: '#681919',
    accent: '#c98400',
  },
};

export default function LincCrossMark({
  size = 44,
  palette = 'wine',
  title,
  className,
  style,
  ...svgProps
}: LincCrossMarkProps) {
  const colors = PALETTES[palette];
  const dimensions: CSSProperties = {
    width: size,
    height: size,
    flex: '0 0 auto',
    ...style,
  };

  return (
    <svg
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
      className={className}
      style={dimensions}
      {...svgProps}
    >
      <circle cx="32" cy="32" r="31" fill={colors.background} />
      <circle
        cx="32"
        cy="32"
        r="27.25"
        fill="none"
        stroke={colors.accent}
        strokeWidth="1.5"
        opacity="0.72"
      />
      <path
        fill={colors.cross}
        d="M28.25 12.75C28.25 10.68 29.93 9 32 9s3.75 1.68 3.75 3.75V24.5h10.5c2.07 0 3.75 1.68 3.75 3.75S48.32 32 46.25 32h-10.5v19.25C35.75 53.32 34.07 55 32 55s-3.75-1.68-3.75-3.75V32h-10.5C15.68 32 14 30.32 14 28.25s1.68-3.75 3.75-3.75h10.5V12.75Z"
      />
    </svg>
  );
}
