// components/dashboard/animated-counter.tsx
"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  value: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
}

export function AnimatedCounter({ value, duration = 800, suffix = "", prefix = "" }: Props) {
  const [display, setDisplay] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    startRef.current = null;
    const start = 0;
    const end = value;

    function step(timestamp: number) {
      if (!startRef.current) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + (end - start) * eased));
      if (progress < 1) rafRef.current = requestAnimationFrame(step);
    }

    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);

  return (
    <span>
      {prefix}{display.toLocaleString()}{suffix}
    </span>
  );
}
