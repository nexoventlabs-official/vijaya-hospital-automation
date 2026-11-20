import React from 'react';

export default function PairedHeading({
  eyebrow,
  headline,
  description,
  badge,
  align = 'left',
  size = 'standard', // 'hero' | 'standard' | 'compact'
  className = '',
}) {
  const isCentered = align === 'center';

  return (
    <div className={`space-y-2 ${isCentered ? 'text-center mx-auto max-w-3xl' : ''} ${className}`}>
      {badge && (
        <div className={`inline-flex items-center gap-2 mb-2 ${isCentered ? 'justify-center' : ''}`}>
          {badge}
        </div>
      )}

      {eyebrow && (
        <div
          className={`font-medium tracking-tight text-muted dark:text-dark-muted ${
            size === 'hero'
              ? 'text-2xl sm:text-3xl md:text-[40px] leading-tight'
              : size === 'compact'
              ? 'text-base sm:text-lg'
              : 'text-xl sm:text-2xl md:text-[28px] leading-snug'
          }`}
        >
          {eyebrow}
        </div>
      )}

      {headline && (
        <h1
          className={`font-medium tracking-tight text-ink dark:text-white ${
            size === 'hero'
              ? 'text-4xl sm:text-5xl md:text-[56px] lg:text-[64px] leading-[1.05]'
              : size === 'compact'
              ? 'text-2xl sm:text-3xl'
              : 'text-3xl sm:text-4xl md:text-[42px] leading-[1.12]'
          }`}
        >
          {headline}
        </h1>
      )}

      {description && (
        <p className="text-muted dark:text-dark-muted text-base sm:text-lg max-w-2xl mt-2 leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
}

