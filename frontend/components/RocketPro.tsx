"use client";
import React, { useId } from "react";

/** Rocket có thân capsule, cửa sổ, cánh đuôi & lửa đa lớp */
export const Rocket = ({ className }: { className?: string }) => {
  const gid = useId();
  const bodyGrad = `r-body-${gid}`;
  const flameGrad = `r-flame-${gid}`;
  const flameBlur = `r-flame-blur-${gid}`;
  const shadow = `r-shadow-${gid}`;

  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <defs>
        {/* bóng tổng thể */}
        <filter id={shadow} x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="1.2" stdDeviation="1.2" floodOpacity="0.25" />
        </filter>
        {/* thân: nhạt => đậm theo chiều dọc, ăn currentColor */}
        <linearGradient id={bodyGrad} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity=".45" />
          <stop offset="100%" stopColor="currentColor" stopOpacity=".9" />
        </linearGradient>
        {/* lửa: vàng => cam => đỏ => trong suốt */}
        <linearGradient id={flameGrad} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff3b0" />
          <stop offset="40%" stopColor="#ffd166" />
          <stop offset="75%" stopColor="#ef476f" />
          <stop offset="100%" stopColor="#ef476f" stopOpacity="0" />
        </linearGradient>
        <filter id={flameBlur}>
          <feGaussianBlur stdDeviation="0.8" />
        </filter>
      </defs>

      <g filter={`url(#${shadow})`}>
        {/* Fins (cánh) */}
        <path d="M6 14c-1.4 1.3-2 3-2 5 1.9-.2 3.6-.9 5-2l1.5-1.5-1.5-1.5c-.8-.8-2.2-.8-3 0Z" fill="currentColor" opacity=".85" />
        <path d="M18 14c1.4 1.3 2 3 2 5-1.9-.2-3.6-.9-5-2l-1.5-1.5 1.5-1.5c.8-.8 2.2-.8 3 0Z" fill="currentColor" opacity=".85" />

        {/* Thân capsule */}
        <path
          d="M12 2c3 2 5 5.5 5 9.5 0 2.3-.7 4.5-2 6.5H9c-1.3-2-2-4.2-2-6.5C7 7.5 9 4 12 2Z"
          fill={`url(#${bodyGrad})`}
          stroke="currentColor"
          strokeOpacity=".25"
        />

        {/* Cửa sổ */}
        <circle cx="12" cy="10" r="2.25" fill="#ffffff" />
        <circle cx="12" cy="10" r="2.25" fill="#93c5fd" opacity=".65" />
        <circle cx="12" cy="10" r="2.25" fill="none" stroke="currentColor" strokeOpacity=".35" />
        {/* highlight nhỏ trong kính */}
        <circle cx="11.3" cy="9.5" r=".5" fill="#fff" opacity=".8" />

        {/* Miệng xả lửa */}
        <rect x="9.6" y="16.5" width="4.8" height="1.6" rx=".8" fill="currentColor" opacity=".8" />

        {/* Lửa đa lớp + blur để “mềm” */}
        <g transform="translate(12,18)">
          {/* quầng sáng */}
          <ellipse rx="3.8" ry="1.6" fill="#ffb703" opacity=".35" filter={`url(#${flameBlur})`} />
          {/* tia lửa chính */}
          <path d="M0 0 C -1.6 3.8, -1 5.8, 0 7.8 C 1 5.8, 1.6 3.8, 0 0 Z" fill={`url(#${flameGrad})`}>
            <animate attributeName="d" dur="800ms" repeatCount="indefinite"
              values="
                M0 0 C -1.6 3.8, -1 5.8, 0 7.8 C 1 5.8, 1.6 3.8, 0 0 Z;
                M0 0 C -1.2 4.4, -0.8 6.2, 0 7.2 C 0.8 6.2, 1.2 4.4, 0 0 Z;
                M0 0 C -1.6 3.8, -1 5.8, 0 7.8 C 1 5.8, 1.6 3.8, 0 0 Z
              " />
          </path>
        </g>
      </g>
    </svg>
  );
};
