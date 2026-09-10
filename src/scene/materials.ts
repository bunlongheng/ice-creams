import * as THREE from "three";
import type { Flavor } from "@/lib/catalog";
import { speckleTexture, stripeTexture, swirlTexture, waferTexture, waffleTexture } from "./textures";

/**
 * Material recipes for the shop. Ice cream is a soft, slightly waxy dielectric
 * with a clear coat, which is what makes it read as frozen rather than plastic.
 *
 * Every material is cached by recipe and shared across rebuilds. That matters:
 * disposing a material drops its compiled shader program, so rebuilding the
 * dessert on each tap would recompile five to eight programs in the next frame -
 * a visible hitch on a tablet. Shared materials are freed once, at teardown.
 */
const cache = new Map<string, THREE.Material>();

function cached<T extends THREE.Material>(key: string, create: () => T): T {
  const hit = cache.get(key);
  if (hit) return hit as T;
  const material = create();
  cache.set(key, material);
  return material;
}

const tile = (texture: THREE.Texture, repeatX: number, repeatY: number): THREE.Texture => {
  // Clones share the source image, so this costs no extra GPU memory.
  const clone = texture.clone();
  clone.wrapS = THREE.RepeatWrapping;
  clone.wrapT = THREE.RepeatWrapping;
  clone.repeat.set(repeatX, repeatY);
  return clone;
};

export function iceCreamMaterial(flavor: Flavor): THREE.MeshPhysicalMaterial {
  return cached(`ice:${flavor.id}`, () => {
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
  });
}

export function creamMaterial(): THREE.MeshPhysicalMaterial {
  return cached(
    "cream",
    () =>
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color("#FFFCF6"),
        roughness: 0.62,
        sheen: 0.9,
        sheenRoughness: 0.6,
        clearcoat: 0.4,
      }),
  );
}

export function coneMaterial(kind: "waffle" | "wafer"): THREE.MeshStandardMaterial {
  return cached(
    `cone:${kind}`,
    () =>
      new THREE.MeshStandardMaterial({
        map: tile(kind === "waffle" ? waffleTexture() : waferTexture(), 4, 3),
        roughness: 0.78,
        metalness: 0,
        side: THREE.DoubleSide,
      }),
  );
}

export function glassMaterial(tint: string, opacity: number): THREE.MeshPhysicalMaterial {
  return cached(
    `glass:${tint}:${opacity}`,
    () =>
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(tint),
        roughness: 0.04,
        metalness: 0,
        transparent: true,
        opacity,
        // A high IOR plus a strong clear coat gives glassy edges without the cost
        // of real transmission, which needs a render target every frame.
        ior: 1.5,
        specularIntensity: 1,
        envMapIntensity: 2.2,
        clearcoat: 1,
        clearcoatRoughness: 0.03,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
  );
}

export function sodaMaterial(): THREE.MeshPhysicalMaterial {
  return cached(
    "soda",
    () =>
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color("#8A3A16"),
        roughness: 0.12,
        metalness: 0,
        transparent: true,
        opacity: 0.72,
        clearcoat: 1,
      }),
  );
}

export function sauceMaterial(color: string): THREE.MeshPhysicalMaterial {
  return cached(
    `sauce:${color}`,
    () =>
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(color),
        roughness: 0.14,
        metalness: 0,
        clearcoat: 1,
        clearcoatRoughness: 0.06,
      }),
  );
}

export function candyMaterial(color: string, translucent = false): THREE.MeshPhysicalMaterial {
  return cached(
    `candy:${color}:${translucent}`,
    () =>
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(color),
        roughness: translucent ? 0.22 : 0.42,
        metalness: 0,
        clearcoat: translucent ? 1 : 0.5,
        transparent: translucent,
        opacity: translucent ? 0.88 : 1,
      }),
  );
}

export function plasticMaterial(color: string): THREE.MeshPhysicalMaterial {
  return cached(
    `plastic:${color}`,
    () =>
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(color),
        roughness: 0.35,
        metalness: 0,
        clearcoat: 0.7,
        side: THREE.DoubleSide,
      }),
  );
}

export function stripedCupMaterial(): THREE.MeshPhysicalMaterial {
  return cached("cup:striped", () => {
    const material = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color("#ffffff"),
      roughness: 0.35,
      metalness: 0,
      clearcoat: 0.7,
      side: THREE.DoubleSide,
    });
    material.map = tile(stripeTexture("#FFF7EC", "#FF6FA5"), 1, 1);
    return material;
  });
}

/** Frees every shared material and its textures. Call once, on scene teardown. */
export function disposeMaterialCache(): void {
  for (const material of cache.values()) {
    const map = (material as THREE.MeshStandardMaterial).map;
    map?.dispose();
    material.dispose();
  }
  cache.clear();
}
