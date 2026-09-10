import * as THREE from "three";
import { getTopping, type Topping } from "@/lib/catalog";
import { sauceGeometry, scoopBulge, sweptTube, swirlCurve } from "./geometry";
import type { Anchor, BuiltIceCream } from "./iceCream";
import { candyMaterial, sauceMaterial } from "./materials";
import { hashString, makeRng } from "./random";

/**
 * Toppings are added in shop order - sauce, then cream, then the scattered bits,
 * then the cherry, so nothing ends up buried under the fudge.
 */

const RAINBOW = ["#FF4D6D", "#FFC53D", "#4CC9F0", "#8AE06B", "#C77DFF", "#FF8FAB"];

interface ScatterOptions {
  count: number;
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  /** How far into the surface the piece sinks. */
  embed: number;
  scale: [number, number];
  /** Stand the piece up along the surface normal instead of tumbling it. */
  alignToNormal?: boolean;
  colors?: readonly string[];
}

function scatter(anchors: readonly Anchor[], rng: () => number, options: ScatterOptions): THREE.InstancedMesh | null {
  if (anchors.length === 0) return null;
  const count = Math.min(options.count, anchors.length * 3);
  const mesh = new THREE.InstancedMesh(options.geometry, options.material, count);
  mesh.castShadow = true;

  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const position = new THREE.Vector3();
  const scaleVector = new THREE.Vector3();
  const euler = new THREE.Euler();
  const up = new THREE.Vector3(0, 1, 0);
  const color = new THREE.Color();
  const [minScale, maxScale] = options.scale;

  for (let i = 0; i < count; i++) {
    const anchor = anchors[Math.floor(rng() * anchors.length)];
    if (!anchor) continue;
    const jitter = new THREE.Vector3(rng() - 0.5, rng() - 0.5, rng() - 0.5).multiplyScalar(0.045);
    position.copy(anchor.position).add(jitter).addScaledVector(anchor.normal, -options.embed);

    if (options.alignToNormal) {
      quaternion.setFromUnitVectors(up, anchor.normal);
    } else {
      euler.set(rng() * Math.PI * 2, rng() * Math.PI * 2, rng() * Math.PI * 2);
      quaternion.setFromEuler(euler);
    }

    const s = minScale + rng() * (maxScale - minScale);
    scaleVector.set(s, s, s);
    matrix.compose(position, quaternion, scaleVector);
    mesh.setMatrixAt(i, matrix);

    if (options.colors) {
      color.set(options.colors[i % options.colors.length] ?? "#ffffff");
      mesh.setColorAt(i, color);
    }
  }

  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  return mesh;
}

/** A little piped rosette of whipped cream. */
function whippedCream(): THREE.Group {
  const group = new THREE.Group();
  const curve = swirlCurve(0.36, 0.14, 2.2);
  const material = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#FFFCF6"),
    roughness: 0.62,
    sheen: 0.9,
    sheenRoughness: 0.6,
    clearcoat: 0.4,
  });
  const swirl = new THREE.Mesh(sweptTube(curve, 140, 18, (t) => 0.115 * (1 - t * 0.7)), material);
  swirl.castShadow = true;
  group.add(swirl);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.035, 14, 12), material);
  tip.position.y = 0.36;
  group.add(tip);
  return group;
}

/** Stem, sphere and a highlight - the maraschino on top. */
function cherry(topping: Topping): THREE.Group {
  const group = new THREE.Group();
  const berry = new THREE.Mesh(new THREE.SphereGeometry(0.1, 24, 18), candyMaterial(topping.color));
  berry.scale.y = 0.94;
  berry.castShadow = true;
  group.add(berry);

  const stem = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.008, 8, 24, Math.PI * 0.75), candyMaterial(topping.accent));
  stem.position.set(0.02, 0.14, 0);
  stem.rotation.set(0.2, 0, -0.9);
  group.add(stem);
  return group;
}

function fruitPiece(id: string, topping: Topping): { geometry: THREE.BufferGeometry; material: THREE.Material; scale: [number, number] } {
  if (id === "banana-slices") {
    return {
      geometry: new THREE.CylinderGeometry(0.062, 0.062, 0.022, 18),
      material: candyMaterial(topping.color),
      scale: [0.9, 1.15],
    };
  }
  const strawberry = new THREE.ConeGeometry(0.055, 0.11, 12);
  strawberry.rotateX(Math.PI);
  return { geometry: strawberry, material: candyMaterial(topping.color), scale: [0.85, 1.2] };
}

function buildScatterFor(topping: Topping, anchors: readonly Anchor[], rng: () => number): THREE.Object3D | null {
  switch (topping.kind) {
    case "sprinkle": {
      const geometry = new THREE.CapsuleGeometry(0.015, 0.062, 4, 8);
      const rainbow = topping.id === "rainbow-sprinkles";
      const material = candyMaterial(rainbow ? "#ffffff" : topping.color);
      return scatter(anchors, rng, {
        count: 150,
        geometry,
        material,
        embed: 0.004,
        scale: [0.85, 1.15],
        colors: rainbow ? RAINBOW : undefined,
      });
    }
    case "crumb":
      return scatter(anchors, rng, {
        count: 70,
        geometry: new THREE.BoxGeometry(0.05, 0.016, 0.045),
        material: candyMaterial(topping.color),
        embed: 0.006,
        scale: [0.6, 1.3],
      });
    case "chunk":
      return scatter(anchors, rng, {
        count: 26,
        geometry:
          topping.id === "marshmallows"
            ? new THREE.CylinderGeometry(0.055, 0.055, 0.075, 14)
            : new THREE.BoxGeometry(0.085, 0.05, 0.08),
        material: candyMaterial(topping.color),
        embed: 0.012,
        scale: [0.8, 1.25],
      });
    case "chip":
      return scatter(anchors, rng, {
        count: 46,
        geometry: new THREE.ConeGeometry(0.038, 0.055, 8),
        material: candyMaterial(topping.color),
        embed: 0.01,
        scale: [0.85, 1.15],
        alignToNormal: true,
      });
    case "nut":
      return scatter(anchors, rng, {
        count: 48,
        geometry: new THREE.DodecahedronGeometry(0.036, 0),
        material: candyMaterial(topping.color),
        embed: 0.008,
        scale: [0.75, 1.3],
      });
    case "gummy":
      return scatter(anchors, rng, {
        count: 16,
        geometry: new THREE.CapsuleGeometry(0.045, 0.04, 4, 10),
        material: candyMaterial(topping.color, true),
        embed: 0.02,
        scale: [0.9, 1.2],
        colors: [topping.color, topping.accent, "#FFC53D"],
        alignToNormal: true,
      });
    case "fruit": {
      const piece = fruitPiece(topping.id, topping);
      return scatter(anchors, rng, {
        count: 18,
        geometry: piece.geometry,
        material: piece.material,
        embed: 0.015,
        scale: piece.scale,
        alignToNormal: topping.id === "banana-slices",
      });
    }
    default:
      return null;
  }
}

/**
 * Decorates a built dessert in place. Returns the new crown height so the caller
 * knows where the celebration glow should sit.
 */
export function addToppings(iceCream: BuiltIceCream, toppingIds: readonly string[]): number {
  const toppings = toppingIds.map(getTopping).filter((t): t is Topping => Boolean(t));
  const rng = makeRng(hashString(toppingIds.join(",")) + 7);
  let crownY = iceCream.topPoint.y;

  // Sauces go on first so everything else sits on top of them.
  for (const topping of toppings.filter((t) => t.kind === "sauce")) {
    const { center, radius, bulgeSeed } = iceCream.sauceMount;
    const geometry = sauceGeometry(radius, hashString(topping.id) % 500, (direction) =>
      bulgeSeed === null ? 1 : scoopBulge(direction, bulgeSeed),
    );
    const mesh = new THREE.Mesh(geometry, sauceMaterial(topping.color));
    mesh.position.copy(center);
    mesh.castShadow = true;
    iceCream.group.add(mesh);
    crownY = Math.max(crownY, center.y + radius);
  }

  if (toppings.some((t) => t.kind === "cream")) {
    const cream = whippedCream();
    cream.position.y = crownY - 0.1;
    iceCream.group.add(cream);
    crownY = cream.position.y + 0.36;
  }

  for (const topping of toppings.filter((t) => !["sauce", "cream", "cherry"].includes(t.kind))) {
    const mesh = buildScatterFor(topping, iceCream.anchors, rng);
    if (mesh) iceCream.group.add(mesh);
  }

  for (const topping of toppings.filter((t) => t.kind === "cherry")) {
    const fruit = cherry(topping);
    fruit.position.y = crownY + 0.06;
    iceCream.group.add(fruit);
    crownY = fruit.position.y + 0.12;
  }

  return crownY;
}
