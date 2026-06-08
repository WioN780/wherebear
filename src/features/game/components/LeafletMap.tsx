"use client";

import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { cn } from "@/shared/lib/utils";
import { GlassButton } from "@/shared/components/GlassButton";
import { Compass, Maximize2, Minimize2 } from "lucide-react";

interface LeafletMapProps {
  guess: { lat: number; lng: number } | null;
  actual: { lat: number; lng: number } | null;
  onGuessSelect: (lat: number, lng: number) => void;
  onSubmitGuess: () => void;
  isSubmitted: boolean;
  className?: string;
  isExpanded: boolean;
  setIsExpanded: (val: boolean) => void;
}

export default function LeafletMap({
  guess,
  actual,
  onGuessSelect,
  onSubmitGuess,
  isSubmitted,
  className,
  isExpanded,
  setIsExpanded,
}: LeafletMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const guessMarkerRef = useRef<L.Marker | null>(null);
  const actualMarkerRef = useRef<L.Marker | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);

  // Custom premium animated icons using CSS
  const guessIcon = L.divIcon({
    html: `
      <div class="relative flex items-center justify-center">
        <div class="absolute w-6 h-6 bg-indigo-500/40 rounded-full animate-ping"></div>
        <div class="relative w-4 h-4 bg-indigo-500 rounded-full border-2 border-white shadow-[0_0_10px_rgba(99,102,241,0.8)] flex items-center justify-center">
          <div class="w-1.5 h-1.5 bg-white rounded-full"></div>
        </div>
      </div>
    `,
    className: "custom-marker-guess",
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

  const actualIcon = L.divIcon({
    html: `
      <div class="relative flex items-center justify-center">
        <div class="absolute w-6 h-6 bg-emerald-500/40 rounded-full animate-pulse"></div>
        <div class="relative w-4 h-4 bg-emerald-500 rounded-full border-2 border-white shadow-[0_0_10px_rgba(16,185,129,0.8)] flex items-center justify-center">
          <div class="w-1.5 h-1.5 bg-white rounded-full"></div>
        </div>
      </div>
    `,
    className: "custom-marker-actual",
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Create Map (centered globally)
    const map = L.map(mapContainerRef.current, {
      center: [20, 0],
      zoom: 1.5,
      zoomControl: false,
      minZoom: 1,
      maxBounds: [
        [-90, -180],
        [90, 180],
      ],
    });

    // Add CartoDB Dark Matter tiles (Sleek premium dark mode)
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 20,
      },
    ).addTo(map);

    // Zoom Controls in custom position
    L.control
      .zoom({
        position: "bottomleft",
      })
      .addTo(map);

    // Click listener to place marker
    map.on("click", (e: L.LeafletMouseEvent) => {
      if (isSubmitted) return;
      const { lat, lng } = e.latlng;
      onGuessSelect(lat, lng);
    });

    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [onGuessSelect, isSubmitted]);

  // Handle guess marker placement
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (guess) {
      if (guessMarkerRef.current) {
        guessMarkerRef.current.setLatLng(guess);
      } else {
        guessMarkerRef.current = L.marker(guess, { icon: guessIcon }).addTo(
          map,
        );
      }
    } else {
      if (guessMarkerRef.current) {
        guessMarkerRef.current.remove();
        guessMarkerRef.current = null;
      }
    }
  }, [guess, guessIcon]);

  // Handle results state: draw correct location marker, connecting line, and zoom bounds
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (isSubmitted && guess && actual) {
      // 1. Draw Correct/Actual location marker
      if (actualMarkerRef.current) {
        actualMarkerRef.current.setLatLng(actual);
      } else {
        actualMarkerRef.current = L.marker(actual, { icon: actualIcon }).addTo(
          map,
        );
      }

      // 2. Draw polyline connecting guess and actual
      if (polylineRef.current) {
        polylineRef.current.remove();
      }
      polylineRef.current = L.polyline([guess, actual], {
        color: "#6366f1",
        weight: 3,
        dashArray: "6, 6",
        opacity: 0.8,
      }).addTo(map);

      // 3. Fit bounds to show both pins
      const bounds = L.latLngBounds([guess, actual]);
      map.fitBounds(bounds, {
        padding: [50, 50],
        maxZoom: 10,
        animate: true,
        duration: 1.5,
      });
    } else {
      // Reset actual marker & lines if not submitted
      if (actualMarkerRef.current) {
        actualMarkerRef.current.remove();
        actualMarkerRef.current = null;
      }
      if (polylineRef.current) {
        polylineRef.current.remove();
        polylineRef.current = null;
      }
    }
  }, [isSubmitted, guess, actual, actualIcon]);

  // Auto-resize map container on expansion
  useEffect(() => {
    setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize({ animate: true });
        // Recenter on guess if expanded
        if (guess && !isSubmitted) {
          mapRef.current.panTo(guess);
        }
      }
    }, 300); // Wait for transition
  }, [isExpanded, guess, isSubmitted]);

  return (
    <div className={cn("relative w-full h-full flex flex-col", className)}>
      <div ref={mapContainerRef} className="w-full flex-grow rounded-2xl" />

      {/* Expanded / Collapse toggler */}
      <GlassButton
        onClick={(e) => {
          e.stopPropagation();
          setIsExpanded(!isExpanded);
        }}
        size="sm"
        variant="secondary"
        className="absolute top-3 right-3 z-[1000] p-1.5 rounded-lg bg-zinc-950/65"
      >
        {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
      </GlassButton>

      {/* HUD controls inside map */}
      {guess && !isSubmitted && (
        <div className="absolute bottom-3 right-3 z-[1000] flex gap-2">
          <GlassButton
            onClick={(e) => {
              e.stopPropagation();
              onSubmitGuess();
            }}
            variant="primary"
            size="sm"
            className="shadow-xl"
          >
            <Compass size={14} className="animate-spin-slow" />
            Submit Guess
          </GlassButton>
        </div>
      )}
    </div>
  );
}
