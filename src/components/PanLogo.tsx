import React from 'react';

interface PanLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'emblem' | 'horizontal' | 'full' | 'flag';
  className?: string;
  showSubtitle?: boolean;
}

// Pre-computed 32-ray sun points centered at (100, 100)
// 16 long rays (r=74), 16 intermediate rays (r=62), inner radius r=30
const generateSunRays = () => {
  const rays: string[] = [];
  const cx = 100;
  const cy = 100;
  const innerR = 30;
  const totalRays = 32;
  const angleStep = (2 * Math.PI) / totalRays;
  const baseHalfWidth = angleStep * 0.45;

  for (let i = 0; i < totalRays; i++) {
    const angle = i * angleStep;
    const outerR = i % 2 === 0 ? 74 : 63;
    const tipX = cx + outerR * Math.cos(angle);
    const tipY = cy + outerR * Math.sin(angle);

    const b1X = cx + innerR * Math.cos(angle - baseHalfWidth);
    const b1Y = cy + innerR * Math.sin(angle - baseHalfWidth);

    const b2X = cx + innerR * Math.cos(angle + baseHalfWidth);
    const b2Y = cy + innerR * Math.sin(angle + baseHalfWidth);

    rays.push(`${tipX.toFixed(2)},${tipY.toFixed(2)} ${b1X.toFixed(2)},${b1Y.toFixed(2)} ${b2X.toFixed(2)},${b2Y.toFixed(2)}`);
  }
  return rays;
};

const SUN_RAYS = generateSunRays();

export const PanLogo: React.FC<PanLogoProps> = ({
  size = 'md',
  variant = 'horizontal',
  className = '',
  showSubtitle = true,
}) => {
  const sizeClasses = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20',
  };

  const textSizes = {
    xs: { title: 'text-xs', sub: 'text-[9px]' },
    sm: { title: 'text-sm', sub: 'text-[10px]' },
    md: { title: 'text-base', sub: 'text-[11px]' },
    lg: { title: 'text-xl', sub: 'text-xs' },
    xl: { title: 'text-2xl', sub: 'text-sm' },
  };

  // The official emblem of Partai PAN (white 32-ray radiant sun on royal blue background)
  const renderEmblemSvg = () => (
    <svg
      viewBox="0 0 200 200"
      className={`${sizeClasses[size]} shrink-0 rounded-xl shadow-xs`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Royal Blue Background (Warna Biru Khas Partai PAN #004D9D) */}
      <rect width="200" height="200" rx="28" fill="#004D9D" />
      
      {/* Outer subtle border */}
      <rect x="2" y="2" width="196" height="196" rx="26" stroke="#2563EB" strokeWidth="2" strokeOpacity="0.6" />

      {/* 32 Shining White Sun Rays */}
      <g fill="#FFFFFF">
        {SUN_RAYS.map((points, idx) => (
          <polygon key={idx} points={points} />
        ))}
      </g>

      {/* Central Solid White Sun Disk */}
      <circle cx="100" cy="100" r="32" fill="#FFFFFF" />

      {/* Central Blue Ring Detail in PAN Sun */}
      <circle cx="100" cy="100" r="14" fill="#004D9D" />
      <circle cx="100" cy="100" r="7" fill="#FFFFFF" />
    </svg>
  );

  if (variant === 'emblem') {
    return <div className={`inline-flex items-center ${className}`}>{renderEmblemSvg()}</div>;
  }

  if (variant === 'flag') {
    return (
      <div className={`inline-flex flex-col items-center bg-[#004D9D] p-3 rounded-2xl text-white shadow-md ${className}`}>
        <svg viewBox="0 0 200 200" className="w-16 h-16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g fill="#FFFFFF">
            {SUN_RAYS.map((points, idx) => (
              <polygon key={idx} points={points} />
            ))}
          </g>
          <circle cx="100" cy="100" r="32" fill="#FFFFFF" />
          <circle cx="100" cy="100" r="14" fill="#004D9D" />
          <circle cx="100" cy="100" r="7" fill="#FFFFFF" />
        </svg>
        <div className="mt-1 text-center">
          <span className="font-black text-xl tracking-wider text-white">PAN</span>
          {showSubtitle && (
            <span className="block text-[9px] font-bold text-blue-100 tracking-tight uppercase">
              Partai Amanat Nasional
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      {renderEmblemSvg()}
      <div className="flex flex-col justify-center leading-tight">
        <div className="flex items-center gap-1.5">
          <span className={`font-black tracking-tight text-blue-900 ${textSizes[size].title}`}>
            PARTAI PAN
          </span>
          <span className="px-1.5 py-0.5 rounded bg-blue-600 text-white font-extrabold text-[10px] tracking-wide uppercase">
            RELAWAN
          </span>
        </div>
        {showSubtitle && (
          <span className={`font-medium text-slate-500 tracking-tight ${textSizes[size].sub}`}>
            Partai Amanat Nasional
          </span>
        )}
      </div>
    </div>
  );
};
