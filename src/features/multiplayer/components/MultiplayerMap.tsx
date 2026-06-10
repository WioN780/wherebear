"use client";

import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { cn } from "@/shared/lib/utils";
import { GlassButton } from "@/shared/components/GlassButton";
import { Compass, Maximize2, Minimize2 } from "lucide-react";

interface MultiplayerMapProps {
  players: {
    id: string;
    username: string;
    lastGuess: { lat: number; lng: number } | null;
    lastDistance: number | null;
    lastScore: number | null;
  }[];
  actual: { lat: number; lng: number } | null;
  guess: { lat: number; lng: number } | null;
  onGuessSelect: (lat: number, lng: number) => void;
  onSubmitGuess: () => void;
  isSubmitted: boolean;
  className?: string;
  isExpanded: boolean;
  setIsExpanded: (val: boolean) => void;
  currentUserId: string;
}

export default function MultiplayerMap({
  players,
  actual,
  guess,
  onGuessSelect,
  onSubmitGuess,
  isSubmitted,
  className,
  isExpanded,
  setIsExpanded,
  currentUserId,
}: MultiplayerMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  // Single active pre-submission guess marker
  const localGuessMarkerRef = useRef<L.Marker | null>(null);
  const actualMarkerRef = useRef<L.Marker | null>(null);

  // Maps of playerId -> Leaflet elements
  const playerMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const playerPolylinesRef = useRef<Map<string, L.Polyline>>(new Map());

  // Icons
  const guessIcon = React.useMemo(
    () =>
      L.divIcon({
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
      }),
    [],
  );

  const playerIcon = (username: string, isSelf: boolean) =>
    L.divIcon({
      html: `
      <div class="relative flex flex-col items-center">
        <div class="absolute -top-7 px-1.5 py-0.5 bg-zinc-950/80 border ${isSelf ? "border-indigo-400 text-indigo-400 font-bold" : "border-white/10 text-white"} text-[9px] rounded-md shadow-lg truncate max-w-[80px] pointer-events-none">
          ${username}
        </div>
        <div class="relative w-3.5 h-3.5 ${isSelf ? "bg-indigo-500" : "bg-purple-500"} rounded-full border-2 border-white shadow-md"></div>
      </div>
    `,
      className: "custom-marker-player",
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });

  const actualIcon = React.useMemo(
    () =>
      L.divIcon({
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
      }),
    [],
  );

  const onGuessSelectRef = useRef(onGuessSelect);
  const isSubmittedRef = useRef(isSubmitted);
  const guessRef = useRef(guess);

  useEffect(() => {
    onGuessSelectRef.current = onGuessSelect;
    isSubmittedRef.current = isSubmitted;
    guessRef.current = guess;
  }, [onGuessSelect, isSubmitted, guess]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

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

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 20,
      },
    ).addTo(map);

    L.control
      .zoom({
        position: "bottomleft",
      })
      .addTo(map);

    map.on("click", (e: L.LeafletMouseEvent) => {
      if (isSubmittedRef.current) return;
      const { lat, lng } = e.latlng;
      onGuessSelectRef.current(lat, lng);
    });

    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Handle local guess marker (before submit)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (guess && !isSubmitted) {
      if (localGuessMarkerRef.current) {
        localGuessMarkerRef.current.setLatLng(guess);
      } else {
        localGuessMarkerRef.current = L.marker(guess, {
          icon: guessIcon,
        }).addTo(map);
      }
    } else {
      if (localGuessMarkerRef.current) {
        localGuessMarkerRef.current.remove();
        localGuessMarkerRef.current = null;
      }
    }
  }, [guess, isSubmitted, guessIcon]);

  // Reset map view on new round
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!guess && !isSubmitted) {
      map.setView([20, 0], 1.5, { animate: true });
    }
  }, [guess, isSubmitted]);

  // Handle review results: Draw actual marker, all player pins, lines, and fit bounds
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Helper to clear existing markers
    const clearPlayers = () => {
      playerMarkersRef.current.forEach((marker) => marker.remove());
      playerMarkersRef.current.clear();
      playerPolylinesRef.current.forEach((line) => line.remove());
      playerPolylinesRef.current.clear();
    };

    if (actual) {
      // 1. Draw Correct/Actual location marker
      if (actualMarkerRef.current) {
        actualMarkerRef.current.setLatLng(actual);
      } else {
        actualMarkerRef.current = L.marker(actual, { icon: actualIcon }).addTo(
          map,
        );
      }

      // Clear existing player markers first
      clearPlayers();

      // Collect points for fitting bounds
      const boundsPoints: L.LatLngExpression[] = [actual];

      // 2. Draw all player guesses
      players.forEach((player) => {
        if (!player.lastGuess) return;

        // Shortest path on map
        let adjustedLng = player.lastGuess.lng;
        const diff = actual.lng - adjustedLng;
        if (diff < -180) {
          adjustedLng += 360;
        } else if (diff > 180) {
          adjustedLng -= 360;
        }
        const adjustedGuess = { lat: player.lastGuess.lat, lng: adjustedLng };

        boundsPoints.push(adjustedGuess);

        const isSelf = player.id === currentUserId;

        // Draw Player Guess Marker
        const marker = L.marker(adjustedGuess, {
          icon: playerIcon(player.username, isSelf),
        }).addTo(map);

        const formattedDistance =
          player.lastDistance !== null
            ? player.lastDistance < 1
              ? `${(player.lastDistance * 1000).toFixed(0)} m`
              : `${player.lastDistance.toFixed(1)} km`
            : "Unknown";

        marker.bindPopup(`
          <div class="text-zinc-900 p-1 flex flex-col gap-0.5">
            <b class="text-xs">${player.username}</b>
            <span class="text-[10px] text-zinc-600">Distance: ${formattedDistance}</span>
            <span class="text-[10px] text-indigo-600 font-bold">Points: +${player.lastScore || 0}</span>
          </div>
        `);

        playerMarkersRef.current.set(player.id, marker);

        // Draw Polyline connecting actual to guess
        const polyline = L.polyline([actual, adjustedGuess], {
          color: isSelf ? "#6366f1" : "#a855f7",
          weight: isSelf ? 3 : 2,
          dashArray: "5, 5",
          opacity: 0.7,
        }).addTo(map);

        playerPolylinesRef.current.set(player.id, polyline);
      });

      // 3. Fit bounds to show actual and all guesses
      if (boundsPoints.length > 1) {
        const bounds = L.latLngBounds(boundsPoints);
        map.fitBounds(bounds, {
          padding: [50, 50],
          maxZoom: 10,
          animate: true,
          duration: 1.5,
        });
      }
    } else {
      // If not round end/submitted
      if (actualMarkerRef.current) {
        actualMarkerRef.current.remove();
        actualMarkerRef.current = null;
      }
      clearPlayers();
    }
  }, [actual, players, actualIcon, currentUserId]);

  // Invalidate map size on expand/collapse transitions
  useEffect(() => {
    const timer = setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize({ animate: true });
        const currentGuess = guessRef.current;
        if (currentGuess && !isSubmitted) {
          mapRef.current.panTo(currentGuess);
        }
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [isExpanded, isSubmitted]);

  return (
    <div className={cn("relative w-full h-full flex flex-col", className)}>
      <div ref={mapContainerRef} className="w-full flex-grow rounded-2xl" />

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

      {guess && !isSubmitted && !actual && (
        <div className="absolute bottom-3 right-3 z-[1000]">
          <GlassButton
            onClick={(e) => {
              e.stopPropagation();
              onSubmitGuess();
            }}
            variant="primary"
            size="sm"
            className="shadow-xl animate-pulse"
          >
            <Compass size={14} className="animate-spin-slow" />
            Submit Guess
          </GlassButton>
        </div>
      )}
    </div>
  );
}
