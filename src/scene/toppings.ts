import * as THREE from "three";
import { getTopping, type Topping } from "@/lib/catalog";
import { sauceGeometry, scoopBulge, sweptTube, swirlCurve } from "./geometry";
import { scatter } from "./scatter";
import type { Anchor, BuiltIceCream } from "./iceCream";
import { candyMaterial, creamMaterial, sauceMaterial } from "./materials";
import { hashString, makeRng } from "@/lib/random";

/**
 * Toppings are added in shop order - sauce, then cream, then the scattered bits,
 * then the cherry, so nothing ends up buried under the fudge.
 */

const RAINBOW = ["#FF4D6D", "#FFC53D", "#4CC9F0", "#8AE06B", "#C77DFF", "#FF8FAB"];

/** A little piped rosette of whipped cream. */
function whippedCream(): THREE.Group {
  const group = new THREE.Group();
  const curve = swirlCurve(0.36, 0.14, 2.2);
  const material = creamMaterial();
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

  // Sauces go on first so everything else sits on top of them. A second sauce is
  // poured a hair wider so the two nest instead of fighting for the same surface.
  const sauces = toppings.filter((topping) => topping.kind === "sauce");
  sauces.forEach((topping, index) => {
    const { center, bulgeSeed } = iceCream.sauceMount;
    const radius = iceCream.sauceMount.radius * (1 + index * 0.045);
    const geometry = sauceGeometry(radius, hashString(topping.id) % 500, (direction) =>
      bulgeSeed === null ? 1 : scoopBulge(direction, bulgeSeed),
    );
    const mesh = new THREE.Mesh(geometry, sauceMaterial(topping.color));
    mesh.position.copy(center);
    mesh.castShadow = true;
    iceCream.group.add(mesh);
    crownY = Math.max(crownY, center.y + radius);
  });

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
