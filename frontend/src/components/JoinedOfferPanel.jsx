import React from 'react';
import { Bot, Stethoscope, Plus, CheckCircle2 } from 'lucide-react';

export default function JoinedOfferPanel({
  leftTitle = 'WhatsApp Care Bot',
  leftTagline = 'Instant patient flow on Meta cloud',
  leftIcon: LeftIcon = Bot,
  leftPoints = ['24/7 bilingual booking', 'Automated slot reminders', 'Instant PDF receipts'],
  rightTitle = 'Clinical Console',
  rightTagline = 'Real-time hospital control suite',
  rightIcon: RightIcon = Stethoscope,
  rightPoints = ['Daily doctor schedules', 'One-click postponement', 'Google Sheets long sync'],
  className = '',
}) {
  return (
    <div className={`w-full max-w-[720px] mx-auto my-10 relative ${className}`}>
      <div className="grid grid-cols-1 md:grid-cols-2 rounded-[36px] md:rounded-[50px] overflow-hidden bg-control dark:bg-dark-card border border-stage-gray dark:border-edge shadow-sm relative">
        {/* Left Half */}
        <div className="p-8 sm:p-10 flex flex-col items-center text-center border-b md:border-b-0 md:border-r border-edge/60 relative">
          <div className="w-16 h-16 rounded-[22px] bg-brand-blue text-white flex items-center justify-center shadow-glow-blue mb-4">
            <LeftIcon size={30} />
          </div>
          <h3 className="text-xl sm:text-2xl font-medium text-ink dark:text-white">
            {leftTitle}
          </h3>
          <p className="text-sm text-muted dark:text-dark-muted mt-1 mb-5">
            {leftTagline}
          </p>
          <ul className="text-xs text-muted dark:text-dark-muted space-y-2 text-left w-full max-w-[200px]">
            {leftPoints.map((pt, i) => (
              <li key={i} className="flex items-center gap-2">
                <CheckCircle2 size={13} className="text-brand-blue flex-shrink-0" />
                <span>{pt}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Central Plus Badge */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:flex w-10 h-10 rounded-full bg-white dark:bg-dark-canvas border border-edge text-brand-blue font-bold text-lg items-center justify-center shadow-md z-10">
          <Plus size={18} strokeWidth={3} />
        </div>

        {/* Right Half */}
        <div className="p-8 sm:p-10 flex flex-col items-center text-center relative">
          <div className="w-16 h-16 rounded-[22px] bg-brand-violet text-white flex items-center justify-center shadow-glow-violet mb-4">
            <RightIcon size={30} />
          </div>
          <h3 className="text-xl sm:text-2xl font-medium text-ink dark:text-white">
            {rightTitle}
          </h3>
          <p className="text-sm text-muted dark:text-dark-muted mt-1 mb-5">
            {rightTagline}
          </p>
          <ul className="text-xs text-muted dark:text-dark-muted space-y-2 text-left w-full max-w-[200px]">
            {rightPoints.map((pt, i) => (
              <li key={i} className="flex items-center gap-2">
                <CheckCircle2 size={13} className="text-brand-violet flex-shrink-0" />
                <span>{pt}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

