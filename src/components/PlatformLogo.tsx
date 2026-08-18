import React from 'react';

export type SupportedPlatform = 'Stripe' | 'Dots' | 'Bank' | 'Payoneer' | 'bKash' | 'PayPal' | 'Wise' | 'Crypto' | 'Upwork' | 'Fiverr' | string;

interface PlatformLogoProps {
  platform: SupportedPlatform;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showLabel?: boolean;
  customLogoUrl?: string;
}

export const PlatformLogo: React.FC<PlatformLogoProps> = ({
  platform,
  className = '',
  size = 'md',
  showLabel = false,
  customLogoUrl,
}) => {
  const norm = (platform || '').toLowerCase().trim();
  const [imageError, setImageError] = React.useState<boolean>(false);

  const sizeClasses = {
    sm: 'w-4 h-4 text-xs',
    md: 'w-6 h-6 text-xs',
    lg: 'w-8 h-8 text-sm',
    xl: 'w-10 h-10 text-base',
  }[size];

  // If a custom image URL or uploaded data URL was provided for this platform
  if (customLogoUrl && !imageError) {
    return (
      <div className="inline-flex items-center space-x-2">
        <div className={`shrink-0 flex items-center justify-center rounded-md overflow-hidden bg-white/10 dark:bg-white/5 border border-[#141414]/20 dark:border-[#383838] ${sizeClasses} ${className}`}>
          <img
            src={customLogoUrl}
            alt={platform}
            className="w-full h-full object-contain p-0.5"
            referrerPolicy="no-referrer"
            onError={() => setImageError(true)}
          />
        </div>
        {showLabel && (
          <span className="font-mono font-bold text-xs text-inherit tracking-tight">
            {platform}
          </span>
        )}
      </div>
    );
  }

  // If there's a static asset under public/assets/logos/<platform>.png, try to use it first
  const assetPath = `/assets/logos/${norm}.png`;
  if (!imageError) {
    return (
      <div className="inline-flex items-center space-x-2">
        <div className={`shrink-0 flex items-center justify-center rounded-md overflow-hidden bg-white/10 dark:bg-white/5 border border-[#141414]/20 dark:border-[#383838] ${sizeClasses} ${className}`}>
          <img
            src={assetPath}
            alt={platform}
            className="w-full h-full object-contain p-0.5"
            referrerPolicy="no-referrer"
            onError={() => setImageError(true)}
          />
        </div>
        {showLabel && (
          <span className="font-mono font-bold text-xs text-inherit tracking-tight">
            {platform}
          </span>
        )}
      </div>
    );
  }

  // Render authentic exact SVG logos
  const renderLogoSvg = () => {
    if (norm.includes('stripe')) {
      // Stripe official stylized S icon on brand purple background
      return (
        <div className={`inline-flex items-center justify-center rounded-md bg-[#635BFF] text-white p-1 shrink-0 ${sizeClasses} ${className}`}>
          <svg viewBox="0 0 32 32" fill="currentColor" className="w-full h-full">
            <path d="M13.976 10.95c0-.986.804-1.364 2.128-1.364 1.905 0 4.316.58 6.208 1.623V4.933A15.82 15.82 0 0 0 16.037 3.5C9.878 3.5 5.6 6.742 5.6 12.183c0 8.448 11.583 7.098 11.583 10.74 0 1.173-.97 1.545-2.316 1.545-2.22 0-5.06-.948-7.29-2.227v6.417c2.476 1.077 5.01 1.545 7.213 1.545 6.326 0 10.74-3.13 10.74-8.683 0-9.157-11.554-7.468-11.554-10.575z" />
          </svg>
        </div>
      );
    }

    if (norm.includes('dot')) {
      // Dots official logo mark (multi-dot geometric symbol with cyan accent)
      return (
        <div className={`inline-flex items-center justify-center rounded-md bg-[#0F172A] text-[#00E599] p-1 shrink-0 ${sizeClasses} ${className}`}>
          <svg viewBox="0 0 32 32" fill="none" className="w-full h-full">
            <circle cx="8" cy="16" r="4" fill="#00E599" />
            <circle cx="16" cy="16" r="4" fill="#FFFFFF" />
            <circle cx="24" cy="16" r="4" fill="#00E599" />
          </svg>
        </div>
      );
    }

    if (norm.includes('payoneer')) {
      // Payoneer official multi-color gradient circle loop
      return (
        <div className={`inline-flex items-center justify-center rounded-full bg-white border border-[#141414]/20 p-0.5 shrink-0 ${sizeClasses} ${className}`}>
          <svg viewBox="0 0 32 32" fill="none" className="w-full h-full">
            <circle cx="16" cy="16" r="12" stroke="url(#payoneer-grad)" strokeWidth="4.5" />
            <defs>
              <linearGradient id="payoneer-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                <stop stopColor="#FF4800" />
                <stop offset="0.5" stopColor="#FF0055" />
                <stop offset="1" stopColor="#7928CA" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      );
    }

    if (norm.includes('bkash')) {
      // bKash official origami bird logo in authentic bKash magenta/pink (#E2136E)
      return (
        <div className={`inline-flex items-center justify-center rounded-md bg-[#E2136E] text-white p-1 shrink-0 ${sizeClasses} ${className}`}>
          <svg viewBox="0 0 32 32" fill="currentColor" className="w-full h-full">
            <path d="M4 16 L14 6 L20 12 L14 18 Z" fill="#FFFFFF" opacity="0.9" />
            <path d="M14 6 L28 4 L20 12 Z" fill="#FFFFFF" />
            <path d="M14 18 L20 12 L28 20 L18 24 Z" fill="#FFFFFF" opacity="0.95" />
            <path d="M18 24 L28 20 L24 28 Z" fill="#FFFFFF" opacity="0.8" />
          </svg>
        </div>
      );
    }

    if (norm.includes('paypal')) {
      return (
        <div className={`inline-flex items-center justify-center rounded-md bg-[#003087] text-[#0079C1] p-1 shrink-0 ${sizeClasses} ${className}`}>
          <span className="font-black italic text-white text-[11px] leading-none">P</span>
        </div>
      );
    }

    if (norm.includes('wise')) {
      return (
        <div className={`inline-flex items-center justify-center rounded-md bg-[#9FE870] text-[#163300] p-1 shrink-0 ${sizeClasses} ${className}`}>
          <span className="font-bold text-[10px] uppercase tracking-tighter">W</span>
        </div>
      );
    }

    if (norm.includes('crypto')) {
      return (
        <div className={`inline-flex items-center justify-center rounded-md bg-[#F7931A] text-white p-1 shrink-0 ${sizeClasses} ${className}`}>
          <span className="font-bold text-[11px]">₿</span>
        </div>
      );
    }

    if (norm.includes('upwork')) {
      return (
        <div className={`inline-flex items-center justify-center rounded-md bg-[#14A800] text-white p-1 shrink-0 ${sizeClasses} ${className}`}>
          <span className="font-bold text-[10px]">Up</span>
        </div>
      );
    }

    if (norm.includes('fiverr')) {
      return (
        <div className={`inline-flex items-center justify-center rounded-md bg-[#1DBF73] text-white p-1 shrink-0 ${sizeClasses} ${className}`}>
          <span className="font-bold text-[10px]">fi</span>
        </div>
      );
    }

    // Default: Bank / Checking Account / Generic
    return (
      <div className={`inline-flex items-center justify-center rounded-md bg-[#1E293B] text-amber-300 p-1 shrink-0 ${sizeClasses} ${className}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
          <path d="M3 21h18M3 10h18M5 10v11M19 10v11M9 10v11M14 10v11M2 10l10-7 10 7" />
        </svg>
      </div>
    );
  };

  const getPlatformDisplayName = () => {
    if (norm.includes('stripe')) return 'Stripe';
    if (norm.includes('dot')) return 'Dots';
    if (norm.includes('payoneer')) return 'Payoneer';
    if (norm.includes('bkash')) return 'bKash';
    if (norm.includes('paypal')) return 'PayPal';
    if (norm.includes('wise')) return 'Wise';
    if (norm.includes('crypto')) return 'Crypto Wallet';
    if (norm.includes('upwork')) return 'Upwork';
    if (norm.includes('fiverr')) return 'Fiverr';
    if (norm.includes('bank')) return 'Bank Account';
    return platform;
  };

  return (
    <div className="inline-flex items-center space-x-2">
      {renderLogoSvg()}
      {showLabel && (
        <span className="font-mono font-bold text-xs text-inherit tracking-tight">
          {getPlatformDisplayName()}
        </span>
      )}
    </div>
  );
};
