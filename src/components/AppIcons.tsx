import React from 'react';
import { AppCategory } from '../utils/windowManager';

/**
 * Frosted Blue Glass Pane Icon (used in the Windows 11 System Tray and the GlassPane Title Bar,
 * matching the top-left icon in the reference mockup).
 */
export function GlassPaneIcon({
  className = 'w-5 h-5',
  active = true,
}: {
  className?: string;
  active?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="gp-outer" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor={active ? '#93c5fd' : '#94a3b8'} />
          <stop offset="0.5" stopColor={active ? '#3b82f6' : '#64748b'} />
          <stop offset="1" stopColor={active ? '#1d4ed8' : '#475569'} />
        </linearGradient>
        <linearGradient id="gp-shine" x1="3" y1="3" x2="14" y2="14" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffffff" stopOpacity="0.65" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0.08" />
        </linearGradient>
      </defs>
      <rect
        x="2.5"
        y="2.5"
        width="19"
        height="19"
        rx="3.2"
        fill="url(#gp-outer)"
        stroke={active ? '#bfdbfe' : '#cbd5e1'}
        strokeWidth="1.2"
      />
      <path
        d="M4 4H19.5L4 19.5V4Z"
        fill="url(#gp-shine)"
      />
      <line
        x1="12"
        y1="3"
        x2="12"
        y2="21"
        stroke="#0f172a"
        strokeOpacity="0.35"
        strokeWidth="1.4"
      />
      <line
        x1="3"
        y1="12"
        x2="21"
        y2="12"
        stroke="#0f172a"
        strokeOpacity="0.35"
        strokeWidth="1.4"
      />
      <path
        d="M5.5 7.5L8.5 4.5M14.5 19.5L19.5 14.5"
        stroke="#ffffff"
        strokeOpacity="0.75"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Win11StartIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect x="2.5" y="2.5" width="8.5" height="8.5" rx="1.2" fill="#38bdf8" />
      <rect x="13" y="2.5" width="8.5" height="8.5" rx="1.2" fill="#0ea5e9" />
      <rect x="2.5" y="13" width="8.5" height="8.5" rx="1.2" fill="#0284c7" />
      <rect x="13" y="13" width="8.5" height="8.5" rx="1.2" fill="#0369a1" />
    </svg>
  );
}


export function AppWindowIcon({
  appId,
  category,
  className = 'w-8 h-8',
  grayscale = false,
}: {
  appId: string;
  category?: AppCategory;
  className?: string;
  grayscale?: boolean;
}) {
  const filterClass = grayscale ? 'grayscale opacity-65 transition-all duration-200' : 'transition-all duration-200';

  if (appId === 'win-discord') {
    return (
      <svg viewBox="0 0 36 36" className={`${className} ${filterClass}`} aria-hidden="true">
        <circle cx="18" cy="18" r="16" fill="#5865F2" />
        <path
          d="M24.9 12.6C23.5 11.9 22 11.5 20.4 11.3L19.9 12.4C18.9 12.2 17.9 12.2 16.9 12.4L16.4 11.3C14.8 11.5 13.3 11.9 11.9 12.6C9.4 16.3 8.7 19.9 9.1 23.4C10.8 24.7 12.7 25.5 14.7 26.1L15.8 24.5C14.9 24.1 14.1 23.7 13.3 23.2C13.5 23.4 13.8 23.5 14 23.6C16.8 24.9 20.1 24.9 22.8 23.6C23.1 23.5 23.3 23.4 23.5 23.2C22.7 23.7 21.9 24.1 21 24.5L22.1 26.1C24.1 25.5 26 24.7 27.7 23.4C28.2 19.4 27.1 15.8 24.9 12.6ZM15.2 21C14.1 21 13.3 20 13.3 18.8C13.3 17.6 14.1 16.7 15.2 16.7C16.3 16.7 17.1 17.6 17.1 18.8C17.1 20 16.3 21 15.2 21ZM21.6 21C20.5 21 19.7 20 19.7 18.8C19.7 17.6 20.5 16.7 21.6 16.7C22.7 16.7 23.5 17.6 23.5 18.8C23.5 20 22.7 21 21.6 21Z"
          fill="#ffffff"
        />
      </svg>
    );
  }

  if (appId === 'win-firefox') {
    return (
      <svg viewBox="0 0 36 36" className={`${className} ${filterClass}`} aria-hidden="true">
        <defs>
          <radialGradient id="ff-orb" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fde047" />
            <stop offset="45%" stopColor="#f97316" />
            <stop offset="80%" stopColor="#e11d48" />
            <stop offset="100%" stopColor="#7e22ce" />
          </radialGradient>
        </defs>
        <circle cx="18" cy="18" r="16" fill="url(#ff-orb)" />
        <path
          d="M25.5 10.5C23.2 8.7 19.1 8.4 15.8 10.6C12.9 12.5 12 16.8 14.2 19.9C16.3 22.8 20.8 23.3 23.5 21C25.5 19.3 26.5 16.5 25.6 14C24 16 21.5 16.5 19.8 15.1C18.1 13.8 18 11.4 19.5 9.9"
          fill="#fde047"
          fillOpacity="0.92"
        />
        <circle cx="18.8" cy="17.8" r="4.8" fill="#a855f7" fillOpacity="0.7" />
      </svg>
    );
  }

  if (appId === 'win-spotify') {
    return (
      <svg viewBox="0 0 36 36" className={`${className} ${filterClass}`} aria-hidden="true">
        <circle cx="18" cy="18" r="16" fill="#1DB954" />
        <path
          d="M25.4 15.4C20.6 12.9 13.4 12.7 9.2 14C8.4 14.3 7.6 13.8 7.3 13C7.1 12.2 7.5 11.4 8.3 11.1C13.3 9.6 21.4 9.8 26.9 12.7C27.6 13.1 27.9 14 27.5 14.8C27.1 15.4 26.2 15.8 25.4 15.4ZM24.9 20.2C24.3 20.8 23.5 21 22.8 20.5C19 18.2 13.6 17.6 9.9 18.7C9.2 18.9 8.4 18.5 8.2 17.8C8 17.1 8.4 16.3 9.1 16.1C13.5 14.8 19.6 15.5 24.1 18.1C24.8 18.5 25.2 19.5 24.9 20.2ZM22.5 24.6C22 25.1 21.4 25.2 20.9 24.9C17.7 23 13.8 22.5 9.7 23.4C9.1 23.6 8.6 23.1 8.4 22.6C8.3 22 8.7 21.5 9.2 21.3C13.8 20.2 18.3 20.8 22 23.1C22.6 23.5 22.8 24.1 22.5 24.6Z"
          fill="#090D16"
        />
      </svg>
    );
  }

  if (appId === 'win-chrome') {
    return (
      <svg viewBox="0 0 36 36" className={`${className} ${filterClass}`} aria-hidden="true">
        <circle cx="18" cy="18" r="16" fill="#ffffff" />
        <path d="M18 2A16 16 0 0 1 31.8 10H18V2Z" fill="#EA4335" />
        <path d="M6.2 7.2A16 16 0 0 1 18 2V10H9.5L6.2 7.2Z" fill="#EA4335" />
        <path d="M31.8 10A16 16 0 0 1 18 34L23.5 21.5L18 10H31.8Z" fill="#FBBC05" />
        <path d="M18 34A16 16 0 0 1 4.2 10L12.5 21.5L18 34Z" fill="#34A853" />
        <path d="M4.2 10A16 16 0 0 1 6.2 7.2L12.5 18L4.2 10Z" fill="#34A853" />
        <circle cx="18" cy="18" r="7.2" fill="#ffffff" />
        <circle cx="18" cy="18" r="5.6" fill="#4285F4" />
      </svg>
    );
  }

  if (appId === 'win-settings') {
    return (
      <svg viewBox="0 0 36 36" className={`${className} ${filterClass}`} aria-hidden="true">
        <circle cx="18" cy="18" r="15.5" fill="#334155" stroke="#64748b" strokeWidth="1" />
        <path
          d="M16 4H20L20.8 7.6C21.8 8 22.8 8.6 23.6 9.3L27.1 8.1L29.1 11.5L26.4 14C26.7 15 26.9 16 26.9 17.1L30 19L28 22.5L24.5 21.4C23.7 22.1 22.8 22.7 21.8 23.1L21 26.8H17L16.2 23.1C15.2 22.7 14.2 22.1 13.4 21.4L9.9 22.5L7.9 19L10.6 17.1C10.6 16 10.8 15 11.1 14L8.4 11.5L10.4 8.1L13.9 9.3C14.7 8.6 15.7 8 16.7 7.6L16 4Z"
          fill="#94a3b8"
        />
        <circle cx="18.5" cy="16.5" r="5.5" fill="#1e293b" />
        <circle cx="18.5" cy="16.5" r="3.6" fill="#38bdf8" />
      </svg>
    );
  }

  if (appId === 'win-steam' || category === 'gaming') {
    return (
      <svg viewBox="0 0 36 36" className={`${className} ${filterClass}`} aria-hidden="true">
        <defs>
          <linearGradient id="steam-grad" x1="4" y1="4" x2="32" y2="32" gradientUnits="userSpaceOnUse">
            <stop stopColor="#1b2838" />
            <stop offset="0.55" stopColor="#17436b" />
            <stop offset="1" stopColor="#2a6b9c" />
          </linearGradient>
        </defs>
        <circle cx="18" cy="18" r="16" fill="url(#steam-grad)" stroke="#3876a8" strokeWidth="1" />
        <circle cx="22.8" cy="13.8" r="4.6" stroke="#ffffff" strokeWidth="2.4" fill="#1b2838" />
        <circle cx="22.8" cy="13.8" r="1.8" fill="#ffffff" />
        <path
          d="M4.5 22.5L14.5 26.5C15.5 27 17.2 26.5 18 25L23.5 17.8L18.2 13.5L12.5 20.5L3.5 17.2"
          fill="#ffffff"
          fillOpacity="0.92"
        />
        <circle cx="14.5" cy="23.5" r="3.2" fill="#1b2838" stroke="#ffffff" strokeWidth="1.8" />
      </svg>
    );
  }

  // Default Gold Gradient Icon for Unidentified Color Theme Applications (Notepad, Terminal, Calculator, Custom Apps)
  return (
    <svg viewBox="0 0 36 36" className={`${className} ${filterClass}`} aria-hidden="true">
      <defs>
        <linearGradient id="gold-default-orb" x1="2" y1="2" x2="34" y2="34" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="50%" stopColor="#eab308" />
          <stop offset="100%" stopColor="#a16207" />
        </linearGradient>
      </defs>
      <circle cx="18" cy="18" r="16" fill="url(#gold-default-orb)" stroke="#fde047" strokeWidth="1" />
      <rect x="11" y="10" width="14" height="16" rx="2.2" fill="#1c1917" fillOpacity="0.82" />
      <line x1="14" y1="14.5" x2="22" y2="14.5" stroke="#fde047" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="14" y1="18.5" x2="22" y2="18.5" stroke="#fde047" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="14" y1="22.5" x2="19" y2="22.5" stroke="#fde047" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
