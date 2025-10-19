"use client";
import { motion, MotionProps } from "framer-motion";
import React from "react";
import { Piano as PianoIconPro } from "./PianoPro";
import { Rocket as RocketIconPro } from "./RocketPro";
import { Globe as GlobeIconPro } from "./GlobePro";

// -----------------------------------------------------------------------------
//  ANIMATION VARIANTS (Các mẫu chuyển động) 

/** Hiệu ứng trôi nổi nhẹ nhàng, xoay nhẹ */
const float = (duration = 8, delay = 0): MotionProps => ({
  animate: {
    y: [0, -20, 0],
    rotate: [0, 5, 0],
    scale: [1, 1.08, 1],
  },
  transition: {
    duration,
    delay,
    repeat: Infinity,
    ease: "easeInOut",
  },
});

/** Hiệu ứng lắc lư và tỏa sáng nhẹ */
const swayAndPulse = (duration = 12, delay = 0): MotionProps => ({
  animate: {
    x: [0, 8, -8, 0],
    scale: [1, 1.05, 1, 0.95, 1],
    rotate: [0, -2, 2, 0],
  },
  transition: {
    duration,
    delay,
    repeat: Infinity,
    ease: "easeInOut",
  },
});

/** Hiệu ứng xoay liên tục */
const spin = (duration = 20, delay = 0): MotionProps => ({
  animate: {
    rotate: [0, 360],
  },
  transition: {
    duration,
    delay,
    repeat: Infinity,
    ease: "linear",
  },
});

/** Hiệu ứng bay lên */
const fly = (duration = 15, delay = 0): MotionProps => ({
  animate: {
    y: [0, -30, 0],
    x: [0, 10, 0],
    scale: [1, 1.1, 1],
  },
  transition: {
    duration,
    delay,
    repeat: Infinity,
    ease: "easeInOut",
  },
});

// -----------------------------------------------------------------------------
//  SVG COMPONENTS (Các thành phần đồ họa) 

const Blob = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 200 200" className={className} aria-hidden="true">
    <defs>
      <linearGradient id="blobGradient" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="rgba(139, 92, 246, 0.15)" />
        <stop offset="100%" stopColor="rgba(59, 130, 246, 0.15)" />
      </linearGradient>
    </defs>
    <path
      fill="url(#blobGradient)"
      d="M44.8,-61.8C56.3,-53,62.2,-37.6,67.7,-22.4C73.2,-7.1,78.4,8,74.4,20.4C70.3,32.8,57.1,42.5,43.2,52.5C29.4,62.5,14.7,72.9,-0.4,73.6C-15.5,74.3,-31,65.3,-44.2,54.7C-57.3,44.1,-68.1,31.9,-72.9,17.2C-77.6,2.5,-76.3,-14.6,-69.9,-29.3C-63.5,-44,-52,-56.2,-38.4,-64.6C-24.8,-73.1,-12.4,-77.9,1.6,-80.2C15.7,-82.4,31.3,-82,44.8,-61.8Z"
    >
      <animate
        attributeName="d"
        dur="20s"
        repeatCount="indefinite"
        values="
          M44.8,-61.8C56.3,-53,62.2,-37.6,67.7,-22.4C73.2,-7.1,78.4,8,74.4,20.4C70.3,32.8,57.1,42.5,43.2,52.5C29.4,62.5,14.7,72.9,-0.4,73.6C-15.5,74.3,-31,65.3,-44.2,54.7C-57.3,44.1,-68.1,31.9,-72.9,17.2C-77.6,2.5,-76.3,-14.6,-69.9,-29.3C-63.5,-44,-52,-56.2,-38.4,-64.6C-24.8,-73.1,-12.4,-77.9,1.6,-80.2C15.7,-82.4,31.3,-82,44.8,-61.8Z;
          M47.6,-64.2C61.1,-55.9,71.8,-41.6,75.3,-26.3C78.7,-11,74.9,5.4,68.8,20.1C62.7,34.9,54.3,47.9,42.4,58.3C30.6,68.8,15.3,76.7,0.3,76.2C-14.7,75.6,-29.5,66.6,-42.8,56C-56,45.3,-67.7,33,-73.6,17.7C-79.4,2.4,-79.5,-15.9,-72.2,-30.2C-64.9,-44.5,-50.3,-54.7,-36.1,-63.3C-22,-71.8,-11,-78.8,3.4,-83.6C17.8,-88.5,35.6,-91.1,47.6,-64.2Z;
          M44.8,-61.8C56.3,-53,62.2,-37.6,67.7,-22.4C73.2,-7.1,78.4,8,74.4,20.4C70.3,32.8,57.1,42.5,43.2,52.5C29.4,62.5,14.7,72.9,-0.4,73.6C-15.5,74.3,-31,65.3,-44.2,54.7C-57.3,44.1,-68.1,31.9,-72.9,17.2C-77.6,2.5,-76.3,-14.6,-69.9,-29.3C-63.5,-44,-52,-56.2,-38.4,-64.6C-24.8,-73.1,-12.4,-77.9,1.6,-80.2C15.7,-82.4,31.3,-82,44.8,-61.8Z
        "
      />
    </path>
  </svg>
);

/** Component Icon cơ bản, có thể tái sử dụng */
const Icon = ({ d, className }: { d: string; className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path fill="currentColor" d={d} />
  </svg>
);

// -----------------------------------------------------------------------------
//  CUSTOM SVG COMPONENTS (Các thành phần đồ họa đặc biệt)

/** Sao Thổ với vành đai */
const Saturn = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <circle cx="12" cy="12" r="4" fill="currentColor" />
    <ellipse cx="12" cy="12" rx="8" ry="2" fill="currentColor" opacity="0.6" transform="rotate(30 12 12)" />
  </svg>
);

/** Cuốn sách floating */
const FloatingBook = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path d="M19 2H8a2 2 0 00-2 2v12a2 2 0 002 2h11a1 1 0 001-1V3a1 1 0 00-1-1z" fill="currentColor" opacity="0.9"/>
    <path d="M16 2H5a2 2 0 00-2 2v12a2 2 0 002 2h11V4a2 2 0 00-2-2z" fill="currentColor" opacity="0.7"/>
    <path d="M8 6h8M8 10h6" stroke="white" strokeWidth="0.5" fill="none"/>
  </svg>
);

// -----------------------------------------------------------------------------
//  ICON DATA & CONFIG (Dữ liệu và cấu hình Icon) 

const icons = {
  // Ngôi sao
  STAR: "M12 2l2.9 5.9 6.6.9-4.8 4.7 1.1 6.5L12 17.8 6.2 20l1.1-6.5L2.5 8.8l6.6-.9L12 2z",
  // Quả địa cầu
  GLOBE: "M12 2a10 10 0 100 20 10 10 0 000-20zm1 17.93V18h-2v1.93A8.001 8.001 0 014.07 13H6v-2H4.07A8.001 8.001 0 0111 4.07V6h2V4.07A8.001 8.001 0 0119.93 11H18v2h1.93A8.001 8.001 0 0113 19.93z",
  // Cây bút
  PEN: "M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41L18.37 3.3a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.84z",
};

// -----------------------------------------------------------------------------
//  ICON CONFIGURATION (Cấu hình icon)

interface IconConfig {
  id: string;
  component: React.ComponentType<{ className?: string }>;
  pos: React.CSSProperties;
  size: string;
  color: string;
  anim: MotionProps;
}

const learningIcons: IconConfig[] = [
  // Ngôi sao lớn - trung tâm
  { 
    id: 'star', 
    component: ({ className }) => <Icon d={icons.STAR} className={className} />,
    pos: { top: '12%', left: '10%' }, 
    size: 'w-12 h-12', 
    color: 'text-yellow-400', 
    anim: swayAndPulse(8, 0.1) 
  },
  // Quả địa cầu - xoay liên tục
  {
    id: "globe",
    component: ({ className }) => <GlobeIconPro className={className} spin={true} />, 
    pos: { top: "10%", right: "15%" },
    size: "w-16 h-16",                   
    color: "text-emerald-400",           
    anim: spin(25, 0.5),
  },
  // Cây bút - trôi nổi nhẹ
  { 
    id: 'pen', 
    component: ({ className }) => <Icon d={icons.PEN} className={className} />,
    pos: { bottom: '15%', left: '12%' }, 
    size: 'w-10 h-10', 
    color: 'text-rose-500', 
    anim: float(10, 0.5) 
  },
  // Đàn Piano - lắc lư
  { 
    id: "piano",
    component: PianoIconPro,                                  
    pos: { bottom: "30%", right: "20%" },
    size: "w-16 h-16",                                    
    color: "text-neutral-700",                             
    anim: swayAndPulse(15, 0.7),
  },
  // Tên lửa - bay lên
  { 
    id: 'rocket', 
    component: RocketIconPro,
    pos: { top: '60%', left: '8%' }, 
    size: 'w-20 h-20', 
    color: 'text-orange-500', 
    anim: fly(12, 0.2) 
  },
  // Sao Thổ - xoay với vành đai
  { 
    id: 'saturn', 
    component: Saturn,
    pos: { top: '35%', right: '8%' }, 
    size: 'w-20 h-20', 
    color: 'text-amber-400', 
    anim: spin(30, 0.4) 
  },
  // Cuốn sách lớn - trôi nổi chính giữa
  { 
    id: 'book', 
    component: FloatingBook,
    pos: { top: '40%', left: '20%', transform: 'translate(-50%, -50%)' }, 
    size: 'w-20 h-20', 
    color: 'text-blue-500', 
    anim: float(14, 0) 
  },
  // Ngôi sao nhỏ phụ
  { 
    id: 'star-small-1', 
    component: ({ className }) => <Icon d={icons.STAR} className={className} />,
    pos: { top: '25%', left: '25%' }, 
    size: 'w-6 h-6', 
    color: 'text-yellow-300', 
    anim: swayAndPulse(6, 0.8) 
  },
  { 
    id: 'star-small-2', 
    component: ({ className }) => <Icon d={icons.STAR} className={className} />,
    pos: { bottom: '35%', right: '30%' }, 
    size: 'w-5 h-5', 
    color: 'text-yellow-200', 
    anim: swayAndPulse(7, 1.2) 
  },
];

// -----------------------------------------------------------------------------
//  MAIN COMPONENT (Component chính) 
// -----------------------------------------------------------------------------

export default function VibrantLearningCanvas() {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      
      {/* --- Các khối nền mềm mại --- */}
      <motion.div
        className="absolute -left-40 top-20 w-[500px] h-[500px] opacity-60"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 2, ease: "easeOut" }}
      >
        <Blob />
      </motion.div>
      <motion.div
        className="absolute -right-32 bottom-20 w-[400px] h-[400px] opacity-50"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 2, delay: 0.5, ease: "easeOut" }}
      >
        <Blob />
      </motion.div>

      {/* --- Các icon học tập trôi nổi --- */}
      {learningIcons.map((icon) => {
      const IconComponent = icon.component;
      return (
        <motion.div
          key={icon.id}
          className="absolute opacity-90 drop-shadow-lg"
          style={icon.pos}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
        >
          {/* lớp trong: chuyển động lặp lại */}
          <motion.div {...icon.anim}>
            {/* truyền size + color TRỰC TIẾP vào svg */}
            <IconComponent className={`${icon.size} ${icon.color}`} />
          </motion.div>
        </motion.div>
      );
    })}

      {/* --- Các hạt lấp lánh nhỏ --- */}
      {[...Array(30)].map((_, i) => (
        <motion.span
          key={`particle-${i}`}
          className="absolute rounded-full"
          style={{
            left: `${(i * 29) % 100}%`,
            top: `${(i * 19) % 100}%`,
            width: `${3 + (i % 4)}px`,
            height: `${3 + (i % 4)}px`,
            backgroundColor: i % 3 === 0 ? 'rgba(251, 191, 36, 0.8)' : 
                           i % 3 === 1 ? 'rgba(139, 92, 246, 0.7)' : 
                           'rgba(59, 130, 246, 0.6)',
          }}
          animate={{
            y: [-10, 10, -10],
            opacity: [0.4, 1, 0.4],
            scale: [0.7, 1.3, 0.7]
          }}
          transition={{
            duration: 4 + (i % 5),
            delay: i * 0.15,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}