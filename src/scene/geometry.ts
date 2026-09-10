import * as THREE from "three";
import { makeRng, noise3 } from "@/lib/random";

/**
 * Procedural geometry for the dessert. Everything is built from maths so a new
 * flavour or vessel never needs a downloaded model.
 */

/** Sweep a circle of varying radius along a curve - the soft-serve coil. */
export function sweptTube(
  curve: THREE.Curve<THREE.Vector3>,
  segments: number,
  radialSegments: number,
  radiusAt: (t: number) => number,
): THREE.BufferGeometry {
  const frames = curve.computeFrenetFrames(segments, false);
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const point = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const vertex = new THREE.Vector3();

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    curve.getPointAt(t, point);
    const N = frames.normals[i];
    const B = frames.binormals[i];
    if (!N || !B) continue;
    const radius = radiusAt(t);

    for (let j = 0; j <= radialSegments; j++) {
      const v = (j / radialSegments) * Math.PI * 2;
      const sin = Math.sin(v);
      const cos = -Math.cos(v);

      normal.set(cos * N.x + sin * B.x, cos * N.y + sin * B.y, cos * N.z + sin * B.z).normalize();
      vertex.copy(point).addScaledVector(normal, radius);

      positions.push(vertex.x, vertex.y, vertex.z);
      normals.push(normal.x, normal.y, normal.z);
      uvs.push(j / radialSegments, t);
    }
  }

  const ring = radialSegments + 1;
  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < radialSegments; j++) {
      const a = i * ring + j;
      const b = a + ring;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  return geometry;
}

/** The tapering helix a soft serve is piped along. */
export function swirlCurve(height: number, baseRadius: number, turns: number, phase = 0): THREE.CatmullRomCurve3 {
  const points: THREE.Vector3[] = [];
  const steps = 64;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const angle = phase + t * turns * Math.PI * 2;
    const radius = baseRadius * Math.pow(1 - t, 0.8);
    points.push(new THREE.Vector3(Math.cos(angle) * radius, t * height, Math.sin(angle) * radius));
  }
  return new THREE.CatmullRomCurve3(points, false, "catmullrom", 0.25);
}

/**
 * How far the scoop surface bulges in a given direction. Sauce reuses this so it
 * hugs the same lumps instead of floating above them.
 */
export function scoopBulge(direction: THREE.Vector3, seed: number): number {
  const offset = (seed % 97) * 0.37;
  const lumps = noise3(direction.x * 2.4 + offset, direction.y * 2.4, direction.z * 2.4 + offset) * 0.075;
  const ridges = Math.sin(Math.atan2(direction.z, direction.x) * 7 + direction.y * 5) * 0.018;
  return 1 + lumps + ridges;
}

/**
 * A hand-dug scoop: a sphere pushed around by noise, with a flatter underside
 * where it sat in the tub.
 */
export function scoopGeometry(radius: number, seed: number): THREE.BufferGeometry {
  // A sphere (not an icosahedron) so the surface stays indexed - that gives
  // smooth normals and clean UVs for the swirl and speckle textures.
  const geometry = new THREE.SphereGeometry(radius, 72, 48);
  const position = geometry.getAttribute("position");
  const vertex = new THREE.Vector3();

  for (let i = 0; i < position.count; i++) {
    vertex.fromBufferAttribute(position, i);
    const direction = vertex.clone().normalize();
    const squash = direction.y < -0.45 ? (direction.y + 0.45) * 0.35 : 0;
    vertex.copy(direction).multiplyScalar(radius * scoopBulge(direction, seed));
    vertex.y -= squash * radius;
    position.setXYZ(i, vertex.x, vertex.y, vertex.z);
  }

  position.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

/** Lathe a silhouette (x = radius, y = height) into a vessel wall. */
export function latheProfile(points: readonly [number, number][], segments = 64): THREE.LatheGeometry {
  const vectors = points.map(([x, y]) => new THREE.Vector2(x, y));
  const geometry = new THREE.LatheGeometry(vectors, segments);
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * A sauce cap: poured over the crown of the dessert, then running down the side
 * in uneven tongues. `bulge` lets it follow a lumpy scoop instead of a sphere.
 */
export function sauceGeometry(
  radius: number,
  seed: number,
  bulge: (direction: THREE.Vector3) => number,
): THREE.BufferGeometry {
  const radialSegments = 56;
  const rings = 26;
  const capAngle = Math.PI * 0.33;
  const rng = makeRng(seed);

  // How far past the cap each column of sauce runs, in radians around the scoop.
  const dripAngle: number[] = [];
  for (let i = 0; i < radialSegments; i++) {
    const wave = Math.sin((i / radialSegments) * Math.PI * 2 * 3 + seed) * 0.5 + 0.5;
    dripAngle.push(0.12 + wave * 0.5 + rng() * 0.4);
  }

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const direction = new THREE.Vector3();

  for (let ring = 0; ring <= rings; ring++) {
    const t = ring / rings;
    for (let i = 0; i <= radialSegments; i++) {
      const index = i % radialSegments;
      const angle = (i / radialSegments) * Math.PI * 2;
      // Cap first, then the drip keeps following the same surface downwards.
      const polar =
        t <= 0.42
          ? (t / 0.42) * capAngle
          : capAngle + ((t - 0.42) / 0.58) * (dripAngle[index] ?? 0.4);

      direction.set(Math.cos(angle) * Math.sin(polar), Math.cos(polar), Math.sin(angle) * Math.sin(polar));
      const r = radius * bulge(direction);
      positions.push(direction.x * r, direction.y * r, direction.z * r);
      uvs.push(i / radialSegments, t);
    }
  }

  const ring = radialSegments + 1;
  for (let r = 0; r < rings; r++) {
    for (let i = 0; i < radialSegments; i++) {
      const a = r * ring + i;
      const b = a + ring;
      // Wound so the outside of the dome faces the camera.
      indices.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * Recursively free the geometry (and instance buffers) under an object.
 * Materials are deliberately left alone - they are shared and cached, and
 * disposing one would throw away its compiled shader program.
 */
export function disposeObject(root: THREE.Object3D): void {
  root.traverse((child) => {
    if (child instanceof THREE.InstancedMesh) child.dispose();
    (child as Partial<THREE.Mesh>).geometry?.dispose();
  });
}
