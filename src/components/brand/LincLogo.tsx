import type { CSSProperties, ImgHTMLAttributes } from 'react';
import lincLogoUrl from '../../assets/brand/linc-logo-primary.png';

interface LincLogoProps
  extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt' | 'width' | 'height'> {
  size?: number | string;
  label?: string;
}

export default function LincLogo({
  size = 44,
  label,
  className,
  style,
  ...imageProps
}: LincLogoProps) {
  const dimensions: CSSProperties = {
    width: size,
    height: size,
    flex: '0 0 auto',
    objectFit: 'contain',
    objectPosition: 'center',
    ...style,
  };

  return (
    <img
      src={lincLogoUrl}
      alt={label || ''}
      aria-hidden={label ? undefined : true}
      draggable={false}
      decoding="async"
      className={className}
      style={dimensions}
      {...imageProps}
    />
  );
}
