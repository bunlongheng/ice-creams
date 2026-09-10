"use client";

import { useEffect, useRef, useState } from "react";
import type { Creation } from "@/lib/creation";
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

  useEffect(() => {
    sceneRef.current?.setCreation(creation);
  }, [creation]);

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
      className="h-full w-full cursor-grab touch-pan-y active:cursor-grabbing"
      role="img"
      aria-label={describeCreation(creation)}
    />
  );
}

/** Cheap one-off probe so an unsupported device shows a message, not a black box. */
function hasWebGL(): boolean {
  try {
    const probe = document.createElement("canvas");
    return Boolean(probe.getContext("webgl2") ?? probe.getContext("webgl"));
  } catch {
    return false;
  }
}

/** Spoken description of the dessert, kept in sync with what is rendered. */
function describeCreation(creation: Creation): string {
  if (!creation.style || creation.flavors.length === 0) return "An empty ice cream cup, waiting for an order.";
  const style = creation.style === "soft" ? "soft swirl" : "scoops";
  const parts = [`A ${style} ice cream`];
  if (creation.vessel) parts.push(`in a ${creation.vessel.replace("-", " ")}`);
  parts.push(`with ${creation.flavors.length} flavour${creation.flavors.length > 1 ? "s" : ""}`);
  if (creation.toppings.length > 0) parts.push(`and ${creation.toppings.length} topping${creation.toppings.length > 1 ? "s" : ""}`);
  return `${parts.join(" ")}.`;
}
