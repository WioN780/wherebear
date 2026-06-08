"use client";

import React from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/shared/lib/utils";

interface FloatingPanelProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  className?: string;
  draggable?: boolean;
  dragConstraints?:
    | React.RefObject<Element | null>
    | { top?: number; left?: number; right?: number; bottom?: number };
}

export const FloatingPanel: React.FC<FloatingPanelProps> = ({
  children,
  className,
  draggable = false,
  dragConstraints,
  ...props
}) => {
  return (
    <motion.div
      drag={draggable}
      dragMomentum={false}
      dragElastic={0.05}
      dragConstraints={dragConstraints}
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.98 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "rounded-2xl border border-white/10 bg-zinc-950/60 backdrop-blur-xl",
        "shadow-[0_12px_40px_rgba(0,0,0,0.6)] select-none",
        draggable && "cursor-grab active:cursor-grabbing",
        className,
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
};
