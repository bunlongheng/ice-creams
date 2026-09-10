import * as THREE from "three";
import { makeRng } from "@/lib/random";
import { starTexture } from "./textures";

/** A one-shot burst of stars for the serve celebration. */
export class SparkleBurst {
  readonly points: THREE.Points;
  private readonly velocities: Float32Array;
  private readonly lifetimes: Float32Array;
  private readonly origin = new THREE.Vector3();
  private readonly count: number;
  private elapsed = Infinity;

  constructor(count = 90) {
    this.count = count;
    const positions = new Float32Array(count * 3);
    this.velocities = new Float32Array(count * 3);
    this.lifetimes = new Float32Array(count);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      size: 0.32,
      map: starTexture(),
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });

    this.points = new THREE.Points(geometry, material);
    this.points.frustumCulled = false;
    this.points.visible = false;
  }

  /** Restarts the burst around a point. */
  fire(origin: THREE.Vector3, seed = 1): void {
    const rng = makeRng(seed);
    const positions = this.points.geometry.getAttribute("position") as THREE.BufferAttribute;
    this.origin.copy(origin);

    for (let i = 0; i < this.count; i++) {
      const theta = rng() * Math.PI * 2;
      const phi = Math.acos(1 - rng() * 1.4);
      const speed = 0.9 + rng() * 1.9;
      this.velocities[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
      this.velocities[i * 3 + 1] = Math.abs(Math.cos(phi)) * speed * 1.15 + 0.5;
      this.velocities[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * speed;
      this.lifetimes[i] = 0.7 + rng() * 0.9;
      positions.setXYZ(i, origin.x, origin.y, origin.z);
    }

    positions.needsUpdate = true;
    this.elapsed = 0;
    this.points.visible = true;
  }

  update(delta: number): void {
    if (this.elapsed === Infinity) return;
    this.elapsed += delta;

    const positions = this.points.geometry.getAttribute("position") as THREE.BufferAttribute;
    let alive = false;

    for (let i = 0; i < this.count; i++) {
      const life = this.lifetimes[i] ?? 0;
      if (this.elapsed > life) continue;
      alive = true;
      const t = this.elapsed;
      positions.setXYZ(
        i,
        this.origin.x + (this.velocities[i * 3] ?? 0) * t,
        this.origin.y + (this.velocities[i * 3 + 1] ?? 0) * t - 1.9 * t * t,
        this.origin.z + (this.velocities[i * 3 + 2] ?? 0) * t,
      );
    }

    positions.needsUpdate = true;
    const material = this.points.material as THREE.PointsMaterial;
    material.opacity = Math.max(0, 1 - this.elapsed / 1.5);

    if (!alive) {
      this.points.visible = false;
      this.elapsed = Infinity;
    }
  }

  dispose(): void {
    this.points.geometry.dispose();
    (this.points.material as THREE.Material).dispose();
  }
}
