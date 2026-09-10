import * as THREE from "three";
import type { Flavor } from "@/lib/catalog";
import { speckleTexture, stripeTexture, swirlTexture, waferTexture, waffleTexture } from "./textures";

/**
 * Material recipes for the shop. Ice cream is a soft, slightly waxy dielectric
 * with a clear coat, which is what makes it read as frozen rather than plastic.
 */

const tile = (texture: THREE.Texture, repeatX: number, repeatY: number): THREE.Texture => {
  const clone = texture.clone();
  clone.needsUpdate = true;
  clone.wrapS = THREE.RepeatWrapping;
  clone.wrapT = THREE.RepeatWrapping;
  clone.repeat.set(repeatX, repeatY);
  return clone;
};

export function iceCreamMaterial(flavor: Flavor): THREE.MeshPhysicalMaterial {
  const material = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(flavor.color),
    roughness: 0.5,
    metalness: 0,
    clearcoat: 0.8,
    clearcoatRoughness: 0.4,
    // A touch of sheen reads as frozen; too much washes the colour out.
    sheen: 0.25,
    sheenRoughness: 0.85,
    sheenColor: new THREE.Color("#fff4ea"),
  });

  if (flavor.chunk === "swirl") {
    material.map = tile(swirlTexture(flavor.color, flavor.chunkColor), 2, 2);
    material.color.set("#ffffff");
  } else if (flavor.chunk === "speckle") {
    material.map = tile(speckleTexture(flavor.color, flavor.chunkColor), 2, 2);
    material.color.set("#ffffff");
  }

  return material;
}

export function coneMaterial(kind: "waffle" | "wafer"): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    map: tile(kind === "waffle" ? waffleTexture() : waferTexture(), 4, 3),
    roughness: 0.78,
    metalness: 0,
    side: THREE.DoubleSide,
  });
}

export function glassMaterial(tint = "#ffffff", opacity = 0.2): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(tint),
    roughness: 0.06,
    metalness: 0,
    transparent: true,
    opacity,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
}

export function sodaMaterial(): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#8A3A16"),
    roughness: 0.12,
    metalness: 0,
    transparent: true,
    opacity: 0.72,
    clearcoat: 1,
  });
}

export function sauceMaterial(color: string): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(color),
    roughness: 0.14,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.06,
  });
}

export function candyMaterial(color: string, translucent = false): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(color),
    roughness: translucent ? 0.22 : 0.42,
    metalness: 0,
    clearcoat: translucent ? 1 : 0.5,
    transparent: translucent,
    opacity: translucent ? 0.88 : 1,
  });
}

export function stripedCupMaterial(): THREE.MeshPhysicalMaterial {
  const material = plasticMaterial("#ffffff");
  material.map = tile(stripeTexture("#FFF7EC", "#FF6FA5"), 1, 1);
  return material;
}

export function plasticMaterial(color: string): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(color),
    roughness: 0.35,
    metalness: 0,
    clearcoat: 0.7,
    side: THREE.DoubleSide,
  });
}
