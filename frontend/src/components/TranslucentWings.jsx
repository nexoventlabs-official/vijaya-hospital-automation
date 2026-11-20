import React from 'react';

export default function TranslucentWings() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
      {/* Left Wing Cluster */}
      <div className="absolute -left-24 top-12 w-[420px] h-[640px] hidden sm:block">
        {/* Sky/Cyan Tile */}
        <div
          className="absolute w-64 h-64 rounded-[48px] bg-brand-sky/20 dark:bg-brand-sky/15 backdrop-blur-xl border border-white/40 shadow-glow-blue animate-float-slow"
          style={{
            transform: 'rotate(-16deg)',
            top: '20px',
            left: '-20px',
          }}
        />
        {/* Capability Violet Tile */}
        <div
          className="absolute w-56 h-56 rounded-[44px] bg-brand-violet/25 dark:bg-brand-violet/20 backdrop-blur-xl border border-white/30 shadow-glow-violet animate-float-reverse"
          style={{
            transform: 'rotate(-12deg)',
            top: '200px',
            left: '40px',
            animationDelay: '1s',
          }}
        />
        {/* Soft Pink / Berry Tile */}
        <div
          className="absolute w-44 h-44 rounded-[36px] bg-rose-400/20 backdrop-blur-lg border border-white/30"
          style={{
            transform: 'rotate(-20deg)',
            top: '380px',
            left: '-10px',
            animationDelay: '2s',
          }}
        />
      </div>

      {/* Right Wing Cluster */}
      <div className="absolute -right-24 top-10 w-[420px] h-[640px] hidden sm:block">
        {/* Warm Gold / Yellow Tile */}
        <div
          className="absolute w-64 h-64 rounded-[48px] bg-brand-yellow/30 dark:bg-brand-yellow/15 backdrop-blur-xl border border-white/40 shadow-glow-yellow animate-float-slow"
          style={{
            transform: 'rotate(15deg)',
            top: '40px',
            right: '-10px',
            animationDelay: '0.5s',
          }}
        />
        {/* Action Blue Tile */}
        <div
          className="absolute w-56 h-56 rounded-[44px] bg-brand-blue/20 dark:bg-brand-blue/15 backdrop-blur-xl border border-white/30 shadow-glow-blue animate-float-reverse"
          style={{
            transform: 'rotate(18deg)',
            top: '220px',
            right: '50px',
            animationDelay: '1.5s',
          }}
        />
        {/* Lime / Mint Tile */}
        <div
          className="absolute w-48 h-48 rounded-[38px] bg-emerald-400/20 backdrop-blur-lg border border-white/30"
          style={{
            transform: 'rotate(12deg)',
            top: '390px',
            right: '0px',
            animationDelay: '2.5s',
          }}
        />
      </div>
    </div>
  );
}

