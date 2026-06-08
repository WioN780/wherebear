"use client";

import React, { useState, useEffect } from "react";
import { GlassCard } from "@/shared/components/GlassCard";
import { GlassButton } from "@/shared/components/GlassButton";
import {
  AlertCircle,
  RotateCcw,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ZoomIn,
  ZoomOut,
  CheckCircle,
} from "lucide-react";

interface StreetViewContainerProps {
  lat: number;
  lng: number;
  onControlsReady?: () => void;
}

export const StreetViewContainer: React.FC<StreetViewContainerProps> = ({
  lat,
  lng,
  onControlsReady,
}) => {
  const [heading, setHeading] = useState(0);
  const [pitch, setPitch] = useState(0);
  const [fov, setFov] = useState(90); // Default field of view (zoom)

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
  const isKeyPlaceholder =
    !apiKey ||
    apiKey === "your-google-maps-api-key" ||
    apiKey.includes("placeholder");

  useEffect(() => {
    if (onControlsReady) onControlsReady();
  }, [onControlsReady]);

  // Handle key controls for pan/zoom
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowLeft":
        case "a":
          setHeading((prev) => (prev - 15 + 360) % 360);
          break;
        case "ArrowRight":
        case "d":
          setHeading((prev) => (prev + 15) % 360);
          break;
        case "ArrowUp":
        case "w":
          setPitch((prev) => Math.min(80, prev + 10));
          break;
        case "ArrowDown":
        case "s":
          setPitch((prev) => Math.max(-80, prev - 10));
          break;
        case "+":
        case "=":
          setFov((prev) => Math.max(30, prev - 10));
          break;
        case "-":
          setFov((prev) => Math.min(120, prev + 10));
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const resetView = () => {
    setHeading(0);
    setPitch(0);
    setFov(90);
  };

  const embedUrl = `https://www.google.com/maps/embed/v1/streetview?key=${apiKey}&location=${lat},${lng}&heading=${heading}&pitch=${pitch}&fov=${fov}`;

  return (
    <div className="relative w-full h-full bg-zinc-950 flex items-center justify-center overflow-hidden">
      {isKeyPlaceholder ? (
        // Beautiful fallback message for developers
        <div className="flex flex-col items-center justify-center p-6 w-full max-w-lg z-10 text-center select-text">
          <GlassCard className="p-8 border-yellow-500/20 bg-zinc-950/80 shadow-[0_0_50px_rgba(234,179,8,0.05)]">
            <div className="flex justify-center mb-4">
              <AlertCircle
                size={48}
                className="text-yellow-500 animate-pulse"
              />
            </div>
            <h2 className="text-xl font-bold text-white mb-2 tracking-wide">
              Google Maps API Key Required
            </h2>
            <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
              Street View requires a Google Cloud API Key with the{" "}
              <span className="text-yellow-500 font-mono text-xs">
                Maps Embed API
              </span>{" "}
              enabled. Configure it in your local{" "}
              <span className="text-zinc-200 font-mono text-xs">.env</span>{" "}
              file.
            </p>

            <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6 text-left font-mono text-xs text-zinc-300">
              <span className="text-zinc-500"># In .env:</span>
              <br />
              NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="AIzaSy..."
            </div>

            <div className="flex flex-col gap-3">
              <div className="text-xs text-zinc-500">
                You can still place markers and play the game in Demo Mode
                below!
              </div>
              <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3 text-left flex items-start gap-2">
                <CheckCircle
                  size={16}
                  className="text-indigo-400 mt-0.5 shrink-0"
                />
                <div>
                  <div className="text-xs font-semibold text-indigo-200">
                    Current Mock Location
                  </div>
                  <div className="text-[10px] text-indigo-400 font-mono">
                    Lat: {lat.toFixed(4)}, Lng: {lng.toFixed(4)}
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      ) : (
        // Actual Google Maps Street View Iframe - Wrapped in a cropping container
        <div className="absolute inset-0 overflow-hidden flex justify-center items-center pointer-events-none">
          <div className="w-[120%] h-[110%] shrink-0 pointer-events-auto">
            <iframe
              title="WhereBear Street View Panorama"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="eager"
              allowFullScreen
              src={embedUrl}
              className="w-full h-full"
            />
          </div>
        </div>
      )}

      {/* Floating Panorama Control Panel Overlay */}
      {!isKeyPlaceholder && (
        <div className="absolute bottom-6 left-6 z-20 flex flex-col gap-2">
          <GlassCard className="p-3 flex items-center gap-2 bg-zinc-950/50 backdrop-blur-md rounded-xl border border-white/5">
            <GlassButton
              variant="ghost"
              size="sm"
              className="p-1.5"
              onClick={() => setHeading((prev) => (prev - 30 + 360) % 360)}
              title="Pan Left (Arrow Left)"
            >
              <ArrowLeft size={16} />
            </GlassButton>
            <div className="flex flex-col gap-1">
              <GlassButton
                variant="ghost"
                size="sm"
                className="p-1.5"
                onClick={() => setPitch((prev) => Math.min(80, prev + 15))}
                title="Tilt Up (Arrow Up)"
              >
                <ArrowUp size={16} />
              </GlassButton>
              <GlassButton
                variant="ghost"
                size="sm"
                className="p-1.5"
                onClick={() => setPitch((prev) => Math.max(-80, prev - 15))}
                title="Tilt Down (Arrow Down)"
              >
                <ArrowDown size={16} />
              </GlassButton>
            </div>
            <GlassButton
              variant="ghost"
              size="sm"
              className="p-1.5"
              onClick={() => setHeading((prev) => (prev + 30) % 360)}
              title="Pan Right (Arrow Right)"
            >
              <ArrowRight size={16} />
            </GlassButton>

            <div className="w-[1px] h-8 bg-white/10 mx-1"></div>

            <GlassButton
              variant="ghost"
              size="sm"
              className="p-1.5"
              onClick={() => setFov((prev) => Math.max(30, prev - 15))}
              title="Zoom In"
            >
              <ZoomIn size={16} />
            </GlassButton>
            <GlassButton
              variant="ghost"
              size="sm"
              className="p-1.5"
              onClick={() => setFov((prev) => Math.min(120, prev + 15))}
              title="Zoom Out"
            >
              <ZoomOut size={16} />
            </GlassButton>

            <div className="w-[1px] h-8 bg-white/10 mx-1"></div>

            <GlassButton
              variant="ghost"
              size="sm"
              className="p-1.5 text-zinc-400 hover:text-white"
              onClick={resetView}
              title="Reset View (R)"
            >
              <RotateCcw size={16} />
            </GlassButton>
          </GlassCard>
        </div>
      )}
    </div>
  );
};
