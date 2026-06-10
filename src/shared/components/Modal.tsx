"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { GlassButton } from "./GlassButton";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  showCloseButton?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className,
  showCloseButton = true,
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      setMounted(true);
    });
  }, []);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
            className={cn(
              "relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/70 p-6 shadow-[0_24px_50px_-12px_rgba(0,0,0,0.8)] backdrop-blur-2xl",
              className,
            )}
          >
            {/* Header */}
            {(title || showCloseButton) && (
              <div className="mb-4 flex items-center justify-between">
                {title && (
                  <h3 className="text-lg font-semibold text-white tracking-wide">
                    {title}
                  </h3>
                )}
                {showCloseButton && (
                  <GlassButton
                    onClick={onClose}
                    variant="ghost"
                    size="sm"
                    className="p-1 text-zinc-400 hover:text-white"
                  >
                    <X size={16} />
                  </GlassButton>
                )}
              </div>
            )}

            {/* Body */}
            <div className="text-zinc-300">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
};
