"use client";
import React, { useId } from "react";

/** Piano với thân hộp + phím trắng/đen, đổ bóng & highlight */
export const Piano = ({ className }: { className?: string }) => {
  const gid = useId(); // đảm bảo id defs là duy nhất
  const bodyGrad = `piano-body-${gid}`;
  const glossGrad = `piano-gloss-${gid}`;
  const shadow = `piano-shadow-${gid}`;

  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <defs>
        {/* Bóng đổ mềm dưới case */}
        <filter id={shadow} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="1.2" stdDeviation="1.2" floodOpacity="0.25" />
        </filter>

        {/* Thân hộp: từ currentColor nhạt → đậm */}
        <linearGradient id={bodyGrad} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.35" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.85" />
        </linearGradient>

        {/* Lớp bóng phản chiếu trên nắp */}
        <linearGradient id={glossGrad} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* CASE */}
      <g filter={`url(#${shadow})`}>
        <rect x="3" y="5" width="18" height="14" rx="2.5" fill={`url(#${bodyGrad})`} />
        <rect x="3.5" y="5.5" width="17" height="13" rx="2" fill="none" stroke="currentColor" strokeOpacity=".35" />
        {/* Nắp trên (gloss) */}
        <path d="M4 6.2h16c.8 0 1.2.9.6 1.5-2.2 2.1-5.5 3.3-9.6 3.3S7.2 9.8 4.6 7.7C4 7.2 4 6.2 4 6.2Z" fill={`url(#${glossGrad})`} />
      </g>

      {/* Bảng phím */}
      <g transform="translate(0,0)">
        {/* nền phím trắng */}
        <rect x="4" y="8.8" width="16" height="8.8" rx="1" fill="#fff" />
        {/* vạch phân cách phím trắng */}
        {Array.from({ length: 6 }).map((_, i) => {
          const x = 4 + (i + 1) * (16 / 7);
          return <rect key={i} x={x - 0.35} y="8.9" width="0.7" height="8.6" fill="#000" opacity=".08" />;
        })}
        {/* phím đen (nhô ngắn) – pattern piano thực tế: 2-3 theo quãng */}
        {[
          4 + (16 / 7) * 0.7,
          4 + (16 / 7) * 1.7,
          4 + (16 / 7) * 3.2,
          4 + (16 / 7) * 4.2,
          4 + (16 / 7) * 5.2,
        ].map((x, i) => (
          <rect
            key={`b${i}`}
            x={x}
            y="8.9"
            width="1.4"
            height="5.2"
            rx=".3"
            fill="#111827"
          />
        ))}
        {/* mép case trên bàn phím */}
        <rect x="4" y="8.4" width="16" height="0.9" fill="currentColor" opacity=".35" />
      </g>
    </svg>
  );
};
