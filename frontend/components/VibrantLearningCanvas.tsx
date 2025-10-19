"use client";
import { motion } from "framer-motion";

const Blob = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 200 200" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="blobGradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgba(139, 92, 246, 0.15)" />
          <stop offset="100%" stopColor="rgba(59, 130, 246, 0.15)" />
        </linearGradient>
      </defs>
      <path fill="url(#blobGradient)">
        <animate
          attributeName="d" dur="15s" repeatCount="indefinite"
          values="M44.8,-61.8C56.3,-53,62.2,-37.6,67.7,-22.4C73.2,-7.1,78.4,8,74.4,20.4C70.3,32.8,57.1,42.5,43.2,52.5C29.4,62.5,14.7,72.9,-0.4,73.6C-15.5,74.3,-31,65.3,-44.2,54.7C-57.3,44.1,-68.1,31.9,-72.9,17.2C-77.6,2.5,-76.3,-14.6,-69.9,-29.3C-63.5,-44,-52,-56.2,-38.4,-64.6C-24.8,-73.1,-12.4,-77.9,1.6,-80.2C15.7,-82.4,31.3,-82,44.8,-61.8Z; M47.6,-64.2C61.1,-55.9,71.8,-41.6,75.3,-26.3C78.7,-11,74.9,5.4,68.8,20.1C62.7,34.9,54.3,47.9,42.4,58.3C30.6,68.8,15.3,76.7,0.3,76.2C-14.7,75.6,-29.5,66.6,-42.8,56C-56,45.3,-67.7,33,-73.6,17.7C-79.4,2.4,-79.5,-15.9,-72.2,-30.2C-64.9,-44.5,-50.3,-54.7,-36.1,-63.3C-22,-71.8,-11,-78.8,3.4,-83.6C17.8,-88.5,35.6,-91.1,47.6,-64.2Z; M44.8,-61.8C56.3,-53,62.2,-37.6,67.7,-22.4C73.2,-7.1,78.4,8,74.4,20.4C70.3,32.8,57.1,42.5,43.2,52.5C29.4,62.5,14.7,72.9,-0.4,73.6C-15.5,74.3,-31,65.3,-44.2,54.7C-57.3,44.1,-68.1,31.9,-72.9,17.2C-77.6,2.5,-76.3,-14.6,-69.9,-29.3C-63.5,-44,-52,-56.2,-38.4,-64.6C-24.8,-73.1,-12.4,-77.9,1.6,-80.2C15.7,-82.4,31.3,-82,44.8,-61.8Z;"
        />
      </path>
    </svg>
);

export default function VibrantLearningCanvas() {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden">
      <motion.div className="absolute -left-32 top-16 w-[400px] h-[400px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><Blob /></motion.div>
      <motion.div className="absolute -right-28 top-48 w-[320px] h-[320px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}><Blob /></motion.div>
    </div>
  );
}