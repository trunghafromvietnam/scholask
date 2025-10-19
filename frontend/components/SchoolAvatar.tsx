"use client";
import { useState } from "react";
import Image from "next/image";

const getGradient = (name: string) => {
  const gradients = [
    "from-blue-500 to-indigo-600",
    "from-green-500 to-emerald-600",
    "from-purple-500 to-violet-600",
    "from-red-500 to-rose-600",
    "from-amber-500 to-orange-600",
  ];
  const charCodeSum = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return gradients[charCodeSum % gradients.length];
};

const getInitials = (name: string) => {
  const words = name.split(' ');
  if (words.length > 1) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

export default function SchoolAvatar({
  src,
  name,
  className = "w-10 h-10",
}: {
  src?: string | null;
  name: string;
  className?: string;
}) {
  const [hasError, setHasError] = useState(false);
  const showFallback = !src || hasError;

  if (showFallback) {
    return (
      <div
        className={`${className} rounded-full flex items-center justify-center font-bold text-white bg-gradient-to-br ${getGradient(name)}`}
      >
        {getInitials(name)}
      </div>
    );
  }

  return (
    <Image
      src={src} 
      alt={`${name} logo`}
      width={40}
      height={40}
      className={`${className} rounded-full bg-slate-200 object-cover`}
      onError={() => setHasError(true)} 
    />
  );
}
