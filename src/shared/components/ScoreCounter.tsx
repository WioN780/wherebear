"use client";

import React, { useEffect, useState } from "react";
import { animate } from "framer-motion";
import { cn } from "@/shared/lib/utils";

interface ScoreCounterProps {
  value: number;
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
}

export const ScoreCounter: React.FC<ScoreCounterProps> = ({
  value,
  duration = 1.2,
  className,
  prefix = "",
  suffix = "",
}) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    // Reset back to 0 or current starting value if needed,
    // and animate to the target value
    const controls = animate(0, value, {
      duration,
      ease: [0.16, 1, 0.3, 1], // Custom cubic-bezier for a smooth deceleration feel
      onUpdate: (latest) => {
        setDisplayValue(Math.round(latest));
      },
    });

    return () => controls.stop();
  }, [value, duration]);

  return (
    <span className={cn("font-mono tabular-nums text-white", className)}>
      {prefix}
      {displayValue.toLocaleString()}
      {suffix}
    </span>
  );
};
