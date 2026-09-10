import * as THREE from "three";
import type { Anchor } from "./iceCream";

/**
 * Scatters instanced copies of one shape over a dessert's surface anchors.
 * Used both for the bits mixed through the ice cream and for the toppings on top.
 */
interface ScatterOptions {
  count: number;
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  /** How far into the surface the piece sinks. */
  embed: number;
  scale: [number, number];
  /** Stand the piece up along the surface normal instead of tumbling it. */
  alignToNormal?: boolean;
  /** Cycled per instance for multi-coloured toppings like rainbow sprinkles. */
  colors?: readonly string[];
  /** Extra positional wobble around the anchor. */
  jitter?: number;
}

export function scatter(
  anchors: readonly Anchor[],
  rng: () => number,
  options: ScatterOptions,
): THREE.InstancedMesh | null {
  if (anchors.length === 0) return null;
  const count = Math.min(options.count, anchors.length * 3);
  const mesh = new THREE.InstancedMesh(options.geometry, options.material, count);
  mesh.castShadow = true;

  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const position = new THREE.Vector3();
  const offset = new THREE.Vector3();
  const scaleVector = new THREE.Vector3();
  const euler = new THREE.Euler();
  const up = new THREE.Vector3(0, 1, 0);
  const color = new THREE.Color();
  const [minScale, maxScale] = options.scale;
  const jitter = options.jitter ?? 0.045;

  for (let i = 0; i < count; i++) {
    const anchor = anchors[Math.floor(rng() * anchors.length)];
    if (!anchor) continue;
    offset.set(rng() - 0.5, rng() - 0.5, rng() - 0.5).multiplyScalar(jitter);
    position.copy(anchor.position).add(offset).addScaledVector(anchor.normal, -options.embed);

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
