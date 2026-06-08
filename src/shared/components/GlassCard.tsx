"use client";

import React from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/shared/lib/utils";

interface GlassCardProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className,
  glow = false,
  ...props
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/40 backdrop-blur-xl",
        "shadow-[0_8px_32px_0_rgba(0,0,0,0.5)]",
        glow &&
          "before:absolute before:-inset-px before:-z-10 before:rounded-2xl before:bg-gradient-to-r before:from-indigo-500/15 before:to-purple-500/15 before:blur-lg",
        className,
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
};
