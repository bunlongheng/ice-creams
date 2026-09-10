import * as THREE from "three";
import { getFlavor, type Flavor, type StyleId } from "@/lib/catalog";
import { scoopGeometry, sweptTube, swirlCurve } from "./geometry";
import { candyMaterial, iceCreamMaterial } from "./materials";
import { hashString, makeRng } from "./random";

/** A spot on the dessert where a topping can land, plus which way is "out". */
export interface Anchor {
  position: THREE.Vector3;
  normal: THREE.Vector3;
}

export interface BuiltIceCream {
  group: THREE.Group;
  anchors: Anchor[];
  /** Highest point, where whipped cream and the cherry go. */
  topPoint: THREE.Vector3;
  /** Widest radius near the top, used to size sauce and drips. */
  topRadius: number;
  /** Where a sauce dome should sit so it drips over the widest part. */
  sauceMount: {
    center: THREE.Vector3;
    radius: number;
    /** Seed of the scoop underneath, or null when the surface is smooth. */
    bulgeSeed: number | null;
  };
}

const SOFT_HEIGHT = 1.12;

/** Chocolate chips and cookie pieces suspended in the ice cream itself. */
function addMixIns(group: THREE.Group, flavor: Flavor, anchors: readonly Anchor[], seed: number): void {
  if (flavor.chunk !== "chip" && flavor.chunk !== "cookie") return;

  const rng = makeRng(seed + 11);
  const count = flavor.chunk === "cookie" ? 34 : 28;
  const geometry =
    flavor.chunk === "cookie"
      ? new THREE.BoxGeometry(0.055, 0.02, 0.05)
      : new THREE.ConeGeometry(0.028, 0.045, 6);
  const mesh = new THREE.InstancedMesh(geometry, candyMaterial(flavor.chunkColor), count);
  mesh.castShadow = true;

  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3(1, 1, 1);
  const position = new THREE.Vector3();
  const euler = new THREE.Euler();

  for (let i = 0; i < count; i++) {
    const anchor = anchors[Math.floor(rng() * anchors.length)];
    if (!anchor) continue;
    // Sit the chunk just under the surface so only part of it shows.
    position.copy(anchor.position).addScaledVector(anchor.normal, -0.012);
    euler.set(rng() * Math.PI, rng() * Math.PI, rng() * Math.PI);
    quaternion.setFromEuler(euler);
    matrix.compose(position, quaternion, scale);
    mesh.setMatrixAt(i, matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  group.add(mesh);
}

/** Piped soft serve: one coil, or two intertwined coils for a twist. */
function buildSoftServe(flavors: readonly Flavor[], mountRadius: number, seed: number): BuiltIceCream {
  const group = new THREE.Group();
  const anchors: Anchor[] = [];
  const twist = flavors.length > 1;
  const coilRadius = twist ? 0.2 : 0.26;
  const tubeAt = (t: number) => (twist ? 0.15 : 0.215) * (1 - t * 0.62);

  flavors.forEach((flavor, index) => {
    const phase = twist ? index * Math.PI : 0;
    const curve = swirlCurve(SOFT_HEIGHT, coilRadius, 2.7, phase);
    const mesh = new THREE.Mesh(sweptTube(curve, 220, 22, tubeAt), iceCreamMaterial(flavor));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);

    // The tip: a little rounded nub so the coil does not end in a hole.
    const tip = new THREE.Mesh(new THREE.SphereGeometry(tubeAt(1) * 1.02, 20, 16), iceCreamMaterial(flavor));
    curve.getPointAt(1, tip.position);
    tip.castShadow = true;
    group.add(tip);

    for (let i = 6; i <= 46; i++) {
      const t = i / 48;
      const point = curve.getPointAt(t);
      const outward = new THREE.Vector3(point.x, 0, point.z).normalize();
      if (outward.lengthSq() === 0) outward.set(1, 0, 0);
      const normal = outward.clone().addScaledVector(new THREE.Vector3(0, 1, 0), 0.55).normalize();
      anchors.push({ position: point.clone().addScaledVector(normal, tubeAt(t)), normal });
    }
  });

  // A wider foot so the swirl meets the cone or cup cleanly.
  const base = flavors[0];
  if (base) {
    const foot = new THREE.Mesh(new THREE.SphereGeometry(mountRadius * 0.92, 32, 20), iceCreamMaterial(base));
    foot.scale.y = 0.42;
    foot.position.y = 0.03;
    foot.castShadow = true;
    group.add(foot);
    addMixIns(group, base, anchors, seed);
  }

  return {
    group,
    anchors,
    topPoint: new THREE.Vector3(0, SOFT_HEIGHT + tubeAt(1) * 0.6, 0),
    topRadius: coilRadius + tubeAt(0.25),
    sauceMount: {
      center: new THREE.Vector3(0, SOFT_HEIGHT * 0.58, 0),
      radius: (coilRadius + tubeAt(0.35)) * 1.06,
      bulgeSeed: null,
    },
  };
}

/** Hand-dug scoops stacked in the vessel. */
function buildScoops(flavors: readonly Flavor[], mountRadius: number, seed: number): BuiltIceCream {
  const group = new THREE.Group();
  const anchors: Anchor[] = [];
  const radius = Math.min(Math.max(mountRadius * 0.92, 0.4), 0.52);
  const rng = makeRng(seed);

  let topY = 0;
  let topSeed = seed;
  const topCenter = new THREE.Vector3();
  flavors.forEach((flavor, index) => {
    const geometry = scoopGeometry(radius, seed + index * 17);
    const mesh = new THREE.Mesh(geometry, iceCreamMaterial(flavor));
    const jitter = index === 0 ? 0 : (rng() - 0.5) * radius * 0.22;
    const y = radius * 0.8 + index * radius * 1.34;
    mesh.position.set(jitter, y, (rng() - 0.5) * radius * 0.22);
    mesh.rotation.y = rng() * Math.PI * 2;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);

    const isTop = index === flavors.length - 1;
    const scoopAnchors: Anchor[] = [];
    // Fibonacci sphere - even scatter without clumping.
    const samples = isTop ? 90 : 34;
    for (let i = 0; i < samples; i++) {
      const t = (i + 0.5) / samples;
      const phi = Math.acos(1 - 2 * t);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const normal = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta),
        Math.cos(phi),
        Math.sin(phi) * Math.sin(theta),
      );
      if (normal.y < (isTop ? -0.1 : 0.25)) continue;
      scoopAnchors.push({
        position: normal.clone().multiplyScalar(radius * 1.005).add(mesh.position),
        normal,
      });
    }
    anchors.push(...scoopAnchors);
    addMixIns(group, flavor, scoopAnchors, seed + index * 31);
    topY = y + radius;
    topCenter.copy(mesh.position);
    topSeed = seed + index * 17;
  });

  return {
    group,
    anchors,
    topPoint: new THREE.Vector3(0, topY, 0),
    topRadius: radius,
    // The cap mounts at the centre of the top scoop and follows its lumps.
    sauceMount: { center: topCenter, radius: radius * 1.02, bulgeSeed: topSeed },
  };
}

export function buildIceCream(
  style: StyleId,
  flavorIds: readonly string[],
  mountRadius: number,
): BuiltIceCream {
  const flavors = flavorIds.map(getFlavor).filter((flavor): flavor is Flavor => Boolean(flavor));
  const seed = hashString(`${style}:${flavorIds.join(",")}`);
  if (flavors.length === 0) {
    return {
      group: new THREE.Group(),
      anchors: [],
      topPoint: new THREE.Vector3(0, 0, 0),
      topRadius: mountRadius,
      sauceMount: { center: new THREE.Vector3(), radius: mountRadius, bulgeSeed: null },
    };
  }
  return style === "soft" ? buildSoftServe(flavors, mountRadius, seed) : buildScoops(flavors, mountRadius, seed);
}
