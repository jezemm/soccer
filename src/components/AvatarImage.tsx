import React, { useId } from 'react';
import { AvatarConfig, getAvataaarsUrl, getDefaultAvatarConfig } from '../lib/constants';

// Shirt path in SVG coordinate space (264×280 viewBox).
// Clothing group has transform="translate(0, 170)" — it is a sibling of Body, not nested inside it.
// Local shirt path + (0, 170) offset gives absolute SVG coords:
const SHIRT_SVG_PATH =
  'M165.96,199.29 ' +
  'C202.94,202.32 232,233.29 232,271.05 ' +
  'L232,280 L32,280 L32,271.05 ' +
  'C32,232.95 61.59,201.76 99.05,199.22 ' +
  'C99.02,199.59 99,199.97 99,200.35 ' +
  'C99,212.21 113.998461,221.83 132.5,221.83 ' +
  'C151.001539,221.83 166,212.21 166,200.35 ' +
  'C166,199.99 165.986723,199.64 165.960472,199.29 Z';

// Avatar circle: Circle group translate(12,40) + circle center(120,120) = (132,160) r=120
const CIRCLE_CX = 132;
const CIRCLE_CY = 160;
const CIRCLE_R = 120;

const EMJSC_RED = '#e31e24';

// Vertical red stripes — shirt x range: 32–232 (200px wide, centered at 132)
// 5 stripes width=24, gap=16, period=40; 8px white margin each side
const STRIPE_RECTS = [40, 80, 120, 160, 200].map(x => ({ x, w: 24 }));

function JerseyOverlay() {
  const uid = useId().replace(/:/g, '');
  const cId = `jc${uid}`;
  const sId = `js${uid}`;
  return (
    <svg
      viewBox="0 0 264 280"
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden="true"
    >
      <defs>
        <clipPath id={cId}>
          <circle cx={CIRCLE_CX} cy={CIRCLE_CY} r={CIRCLE_R} />
        </clipPath>
        <clipPath id={sId}>
          <path d={SHIRT_SVG_PATH} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${cId})`}>
        <g clipPath={`url(#${sId})`}>
          {STRIPE_RECTS.map(({ x, w }) => (
            <rect key={x} x={x} y="0" width={w} height="280" fill={EMJSC_RED} />
          ))}
        </g>
      </g>
    </svg>
  );
}

interface AvatarImageProps {
  config?: Partial<AvatarConfig> | null;
  photoUrl?: string | null;
  fallbackName?: string;
  alt?: string;
  className?: string;
}

export function AvatarImage({ config, photoUrl, fallbackName, alt = 'Avatar', className = '' }: AvatarImageProps) {
  const effectiveConfig: Partial<AvatarConfig> | null =
    (config && Object.keys(config).length > 0) ? config
    : fallbackName ? getDefaultAvatarConfig(fallbackName)
    : null;

  const isJersey = effectiveConfig?.clotheType === 'EMJSCJersey';

  const src: string = (() => {
    if (effectiveConfig) return getAvataaarsUrl(effectiveConfig);
    if (photoUrl) return photoUrl;
    return '';
  })();

  if (!src) return null;

  if (isJersey) {
    return (
      <div className={`relative inline-block overflow-hidden ${className}`} style={{ lineHeight: 0 }}>
        <img src={src} alt={alt} className="w-full h-full" />
        <JerseyOverlay />
      </div>
    );
  }

  return <img src={src} alt={alt} className={className} />;
}
