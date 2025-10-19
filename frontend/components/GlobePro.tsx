"use client";
import React, { useId } from "react";

type GlobeProps = {
  className?: string;           // w-*, h-* Tailwind
  spin?: boolean;               // quay chậm
  ocean?: string;               // màu đại dương
  land?: string;                // màu lục địa
  grid?: string;                // màu lưới kinh/vĩ tuyến
  title?: string;               // a11y
};


export const Globe: React.FC<GlobeProps> = ({
  className,
  spin = true,
  ocean = "#2563eb", // blue-600
  land = "#22c55e",  // green-500
  grid = "rgba(255,255,255,0.55)",
  title = "Globe",
}) => {
  const uid = useId().replace(/:/g, "");
  const clipId = `globe-clip-${uid}`;
  const oceanGrad = `ocean-grad-${uid}`;
  const landGrad = `land-grad-${uid}`;
  const specGrad = `spec-grad-${uid}`;
  const atmoGrad = `atmo-grad-${uid}`;
  const shadow = `globe-shadow-${uid}`;
  const atmoBlur = `atmo-blur-${uid}`;

  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden={title ? undefined : true} role="img">
      {title ? <title>{title}</title> : null}
      <defs>
        {/* Bóng tổng thể */}
        <filter id={shadow} x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="1.4" stdDeviation="1.4" floodOpacity="0.28" />
        </filter>

        {/* Đại dương: radial từ sáng → đậm */}
        <radialGradient id={oceanGrad} cx="35%" cy="30%" r="70%">
          <stop offset="0%"  stopColor={ocean} stopOpacity="0.85" />
          <stop offset="70%" stopColor={ocean} stopOpacity="1" />
          <stop offset="100%" stopColor={ocean} stopOpacity="1" />
        </radialGradient>

        {/* Lục địa: subtle shading (sáng → tối) */}
        <linearGradient id={landGrad} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={land} />
          <stop offset="60%"  stopColor={land} />
          <stop offset="100%" stopColor="#14532d" stopOpacity="0.85" />
        </linearGradient>

        {/* Specular highlight (chấm sáng) */}
        <radialGradient id={specGrad} cx="30%" cy="25%" r="25%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="40%" stopColor="#ffffff" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>

        {/* Hào quang khí quyển */}
        <radialGradient id={atmoGrad} cx="50%" cy="50%" r="50%">
          <stop offset="60%" stopColor="#60a5fa" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#60a5fa" stopOpacity="0" />
        </radialGradient>
        <filter id={atmoBlur}>
          <feGaussianBlur stdDeviation="1.4" />
        </filter>

        {/* Cắt mọi chi tiết trong hình tròn */}
        <clipPath id={clipId}>
          <circle cx="12" cy="12" r="9" />
        </clipPath>
      </defs>

      {/* Vòng quầng khí quyển bên ngoài */}
      <g filter={`url(#${shadow})`}>
        <circle cx="12" cy="12" r="10" fill={`url(#${atmoGrad})`} filter={`url(#${atmoBlur})`} />
      </g>

      {/* Đế đại dương */}
      <circle cx="12" cy="12" r="9" fill={`url(#${oceanGrad})`} filter={`url(#${shadow})`} />

      {/* Nội dung quay: lục địa + lưới (bị clip trong địa cầu) */}
      <g clipPath={`url(#${clipId})`} transform="translate(0,0)">
        <g transform="rotate(0 12 12)">
          {/* Nếu spin=true, quay chậm 20s/vòng */}
          {spin && (
            <animateTransform
              attributeName="transform"
              attributeType="XML"
              type="rotate"
              from="0 12 12"
              to="360 12 12"
              dur="20s"
              repeatCount="indefinite"
            />
          )}

          {/* Lục địa (một vài mảng khối gần đúng) */}
          <g fill={`url(#${landGrad})`} stroke="#0f172a" strokeOpacity="0.1" strokeWidth="0.2">
            {/* Âu-Á-phi gần đúng */}
            <path d="M8 7 C9.5 6.2, 11.5 6, 13 6.6 C14.6 7.2, 15.8 8.2, 16.2 9.2 C16.6 10.2, 16 11, 15.2 11.4 C14.2 11.8, 13.2 11.6, 12.2 11.1 C11.7 10.9, 11.3 10.8, 10.7 11.2 C9.9 11.7, 9.4 12.6, 8.6 13 C7.7 13.5, 6.6 13.3, 6 12.6 C5.2 11.6, 5.8 10.4, 6.6 9.6 C7.1 9.1, 7.3 8.8, 7.5 8.3 C7.7 7.8, 7.6 7.4, 8 7 Z" />
            {/* Bắc Mỹ gần đúng */}
            <path d="M4.5 9.5 C5.5 8.5, 6.8 8.2, 8 8.4 C8.8 8.6, 9.3 9.1, 9.6 9.7 C10 10.5, 9.7 11.4, 9 11.9 C8.4 12.3, 7.7 12.4, 7 12.3 C6 12.2, 5.2 11.8, 4.8 11.1 C4.3 10.4, 4.1 9.9, 4.5 9.5 Z" />
            {/* Nam Mỹ gần đúng */}
            <path d="M8.8 13.2 C9.5 13.8, 9.8 14.6, 9.7 15.6 C9.6 16.4, 9.1 17.2, 8.5 17.7 C7.9 18.2, 7.1 18.1, 6.7 17.5 C6.2 16.8, 6.4 16.1, 6.9 15.4 C7.3 14.9, 7.7 14.5, 8 14.1 C8.3 13.7, 8.4 13.4, 8.8 13.2 Z" />
            {/* Úc gần đúng */}
            <path d="M15.6 15.6 C16.4 15.3, 17.3 15.5, 17.9 16.1 C18.4 16.7, 18.3 17.4, 17.7 17.8 C17 18.2, 16.1 18, 15.6 17.4 C15.2 16.9, 15 16.2, 15.6 15.6 Z" />
          </g>

          {/* Lưới kinh tuyến/vĩ tuyến */}
          <g stroke={grid} strokeWidth="0.25" fill="none">
            {/* vĩ tuyến */}
            {[ -60, -30, 0, 30, 60 ].map((lat) => (
              <ellipse key={`lat-${lat}`} cx="12" cy="12" rx={9 * Math.cos((Math.abs(lat) * Math.PI)/180)} ry={9 * Math.cos(0)} transform={`rotate(0 12 12) translate(0 0)`} opacity={lat === 0 ? 0.5 : 0.28} />
            ))}
            {/* kinh tuyến */}
            {[ 0, 30, 60, 90, 120, 150 ].map((lon) => (
              <ellipse key={`lon-${lon}`} cx="12" cy="12" rx="9" ry={9 * Math.cos(0)} transform={`rotate(${lon} 12 12)`} opacity={lon === 0 ? 0.5 : 0.28} />
            ))}
          </g>
        </g>
      </g>

      {/* Specular highlight */}
      <circle cx="8.2" cy="7.6" r="3.2" fill={`url(#${specGrad})`} />
    </svg>
  );
};

export default Globe;
