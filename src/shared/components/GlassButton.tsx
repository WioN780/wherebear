"use client";

import React from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/shared/lib/utils";

interface GlassButtonProps extends HTMLMotionProps<"button"> {
  children: React.ReactNode;
  className?: string;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
}

export const GlassButton: React.FC<GlassButtonProps> = ({
  children,
  className,
  variant = "secondary",
  size = "md",
  ...props
}) => {
  const sizeClasses = {
    sm: "px-3 py-1.5 text-xs rounded-lg",
    md: "px-4 py-2 text-sm rounded-xl",
    lg: "px-6 py-3 text-base rounded-2xl",
  };

  const variantClasses = {
    primary: [
      "bg-gradient-to-r from-indigo-500/80 to-purple-500/80 text-white font-medium",
      "border border-white/20 shadow-[0_0_15px_rgba(99,102,241,0.3)]",
      "hover:from-indigo-500 hover:to-purple-500 hover:shadow-[0_0_20px_rgba(99,102,241,0.5)]",
    ].join(" "),
    secondary: [
      "bg-white/5 text-zinc-200 border border-white/10",
      "hover:bg-white/10 hover:text-white hover:border-white/20",
      "shadow-[0_4px_12px_rgba(0,0,0,0.1)]",
    ].join(" "),
    danger: [
      "bg-red-500/10 text-red-200 border border-red-500/20",
      "hover:bg-red-500/20 hover:text-white hover:border-red-500/40",
    ].join(" "),
    ghost: [
      "bg-transparent text-zinc-400 border border-transparent",
      "hover:bg-white/5 hover:text-zinc-200",
    ].join(" "),
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02, y: -1 }}
      whileTap={{ scale: 0.98, y: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 15 }}
      className={cn(
        "inline-flex items-center justify-center gap-2 cursor-pointer transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 disabled:opacity-50 disabled:pointer-events-none",
        sizeClasses[size],
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {children}
    </motion.button>
  );
};
