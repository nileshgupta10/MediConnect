import React from 'react';

export function MediClanLogo({ className = "w-12 h-12" }) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 120 80" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Left Dark Navy Loop */}
      <path
        d="M 48 24 C 36 12, 16 12, 16 40 C 16 68, 36 68, 48 56 C 54 50, 56 42, 56 40"
        stroke="#002C54"
        strokeWidth="12"
        strokeLinecap="round"
        fill="none"
      />
      {/* Right Bright Teal Loop */}
      <path
        d="M 72 56 C 84 68, 104 68, 104 40 C 104 12, 84 12, 72 24 C 66 30, 64 38, 64 40"
        stroke="#00A8C6"
        strokeWidth="12"
        strokeLinecap="round"
        fill="none"
      />
      {/* Overlapping segment to create the 3D interwoven weave effect */}
      <path
        d="M 48 24 C 44 20, 38 16, 32 16"
        stroke="#002C54"
        strokeWidth="12"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
