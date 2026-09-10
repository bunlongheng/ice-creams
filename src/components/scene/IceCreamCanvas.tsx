"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getFlavor, getTopping, getVessel } from "@/lib/catalog";
import type { Creation, Dessert } from "@/lib/creation";
import { IceCreamScene } from "@/scene/IceCreamScene";

interface IceCreamCanvasProps {
  creation: Creation;
}

/**
 * Bridges React state to the imperative Three.js scene. The scene owns its own
 * render loop, so React never re-renders per frame.
 */
export function IceCreamCanvas({ creation }: IceCreamCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<IceCreamScene | null>(null);
  // This component is client-only (dynamic, ssr:false), so probing here is safe.
  const [supported] = useState(hasWebGL);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !supported) return;

    try {
      sceneRef.current = new IceCreamScene(canvas);
    } catch (error) {
      // Context creation can still fail on a locked-down or exhausted GPU.
      console.error("Ice cream scene failed to start", error);
      return;
    }

    return () => {
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
  }, [supported]);

  // Stepping back and forth does not change the dessert, and rebuilding it costs
  // a full geometry pass - so depend only on what is actually modelled. The
  // reducer keeps these references stable unless the order really changed.
  const dessert = useMemo<Dessert>(
    () => ({
      style: creation.style,
      flavors: creation.flavors,
      vessel: creation.vessel,
      toppings: creation.toppings,
    }),
    [creation.style, creation.flavors, creation.vessel, creation.toppings],
  );

  useEffect(() => {
    sceneRef.current?.setCreation(dessert);
  }, [dessert]);

  useEffect(() => {
    if (creation.servedCount > 0) sceneRef.current?.celebrate(creation.servedCount);
  }, [creation.servedCount]);

  if (!supported) {
    return (
      <div className="flex h-full w-full items-center justify-center p-6 text-center">
        <p className="max-w-xs text-sm font-semibold text-cocoa/80">
          This device cannot show the 3D ice cream, but you can still build and serve the order.
        </p>
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className="h-full w-full cursor-grab touch-pan-y touch-pinch-zoom active:cursor-grabbing"
      role="img"
      aria-label={describeCreation(dessert)}
    />
  );
}

/** Cheap one-off probe so an unsupported device shows a message, not a black box. */
function hasWebGL(): boolean {
  try {
    const probe = document.createElement("canvas");
    const context = probe.getContext("webgl2") ?? probe.getContext("webgl");
    // Browsers cap live contexts, so hand this one straight back.
    context?.getExtension("WEBGL_lose_context")?.loseContext();
    return Boolean(context);
  } catch {
    return false;
  }
}

/** Joins names the way a person would say them: "a, b and c". */
function list(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** Spoken description of the dessert, kept in sync with what is rendered. */
function describeCreation(creation: Dessert): string {
  if (!creation.style || creation.flavors.length === 0) {
    return "An empty ice cream cup, waiting for an order.";
  }

  const flavors = creation.flavors.map((id) => getFlavor(id)?.name).filter((name): name is string => Boolean(name));
  const toppings = creation.toppings.map((id) => getTopping(id)?.name).filter((name): name is string => Boolean(name));
  const vessel = creation.vessel ? getVessel(creation.vessel)?.name.toLowerCase() : undefined;

  const parts = [creation.style === "soft" ? "A soft swirl of" : "Scoops of", list(flavors).toLowerCase()];
  if (vessel) parts.push(`in a ${vessel}`);
  if (toppings.length > 0) parts.push(`with ${list(toppings).toLowerCase()}`);
  return `${parts.join(" ")}.`;
}
