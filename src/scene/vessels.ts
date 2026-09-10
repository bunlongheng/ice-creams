import * as THREE from "three";
import type { VesselId } from "@/lib/catalog";
import { latheProfile } from "./geometry";
import { coneMaterial, glassMaterial, plasticMaterial, sodaMaterial, stripedCupMaterial } from "./materials";

/** Where the ice cream mounts once the vessel is built. */
export interface BuiltVessel {
  group: THREE.Group;
  /** Height of the rim / cone mouth in world units. */
  topY: number;
  /** Radius of that opening - sets how wide the first scoop can be. */
  topRadius: number;
}

type Profile = readonly [number, number][];

const CUP: Profile = [
  [0, 0],
  [0.5, 0],
  [0.52, 0.04],
  [0.62, 0.62],
  [0.66, 0.78],
  [0.68, 0.8],
  [0.64, 0.78],
  [0.56, 0.06],
];

const WAFFLE_CONE: Profile = [
  [0, 0],
  [0.06, 0.05],
  [0.24, 0.42],
  [0.42, 0.86],
  [0.56, 1.2],
  [0.6, 1.28],
];

const CAKE_CONE: Profile = [
  [0, 0],
  [0.3, 0],
  [0.32, 0.04],
  [0.44, 0.55],
  [0.56, 1.0],
  [0.58, 1.06],
];

const SUNDAE_GLASS: Profile = [
  [0, 0],
  [0.44, 0],
  [0.45, 0.05],
  [0.12, 0.12],
  [0.1, 0.4],
  [0.3, 0.62],
  [0.52, 0.9],
  [0.6, 1.12],
  [0.62, 1.18],
];

const FLOAT_GLASS: Profile = [
  [0, 0],
  [0.42, 0],
  [0.44, 0.06],
  [0.4, 0.4],
  [0.46, 0.9],
  [0.54, 1.4],
  [0.56, 1.5],
];

const WAFFLE_BOWL: Profile = [
  [0, 0],
  [0.34, 0.02],
  [0.56, 0.2],
  [0.74, 0.5],
  [0.82, 0.74],
  [0.84, 0.8],
];

function shell(profile: Profile, material: THREE.Material): THREE.Mesh {
  const mesh = new THREE.Mesh(latheProfile(profile), material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** A candy-striped paper cup, the classic scoop-shop tub. */
function buildCup(): BuiltVessel {
  const group = new THREE.Group();
  group.add(shell(CUP, stripedCupMaterial()));

  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.032, 12, 48), plasticMaterial("#FF6FA5"));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.79;
  group.add(rim);

  return { group, topY: 0.74, topRadius: 0.6 };
}

function buildWaffleCone(): BuiltVessel {
  const group = new THREE.Group();
  group.add(shell(WAFFLE_CONE, coneMaterial("waffle")));
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.035, 12, 48), coneMaterial("waffle"));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 1.27;
  group.add(rim);
  return { group, topY: 1.2, topRadius: 0.56 };
}

function buildCakeCone(): BuiltVessel {
  const group = new THREE.Group();
  group.add(shell(CAKE_CONE, coneMaterial("wafer")));
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.03, 12, 48), coneMaterial("wafer"));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 1.05;
  group.add(rim);
  return { group, topY: 0.99, topRadius: 0.54 };
}

function buildSundae(): BuiltVessel {
  const group = new THREE.Group();
  group.add(shell(SUNDAE_GLASS, glassMaterial("#EAF7FF", 0.22)));
  return { group, topY: 0.98, topRadius: 0.56 };
}

/** A root-beer float: fizzy soda in a tall glass, ice cream bobbing on top. */
function buildFloat(): BuiltVessel {
  const group = new THREE.Group();
  group.add(shell(FLOAT_GLASS, glassMaterial("#F2FAFF", 0.22)));

  const soda = new THREE.Mesh(latheProfile(FLOAT_GLASS.map(([x, y]) => [x * 0.9, y * 0.86] as [number, number])), sodaMaterial());
  soda.position.y = 0.02;
  group.add(soda);

  const bubbleMaterial = glassMaterial("#FFF3D6", 0.65);
  const bubbles = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 8), bubbleMaterial, 26);
  const matrix = new THREE.Matrix4();
  for (let i = 0; i < 26; i++) {
    const angle = i * 2.399;
    const radius = 0.1 + (i % 5) * 0.06;
    const scale = 0.02 + (i % 4) * 0.011;
    matrix.makeScale(scale, scale, scale);
    matrix.setPosition(Math.cos(angle) * radius, 0.2 + (i / 26) * 1.0, Math.sin(angle) * radius);
    bubbles.setMatrixAt(i, matrix);
  }
  bubbles.instanceMatrix.needsUpdate = true;
  group.add(bubbles);

  return { group, topY: 1.32, topRadius: 0.5 };
}

function buildWaffleBowl(): BuiltVessel {
  const group = new THREE.Group();
  group.add(shell(WAFFLE_BOWL, coneMaterial("waffle")));
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.84, 0.04, 12, 56), coneMaterial("waffle"));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.8;
  group.add(rim);
  return { group, topY: 0.66, topRadius: 0.74 };
}

const BUILDERS: Record<VesselId, () => BuiltVessel> = {
  cup: buildCup,
  "waffle-cone": buildWaffleCone,
  "cake-cone": buildCakeCone,
  sundae: buildSundae,
  float: buildFloat,
  "waffle-bowl": buildWaffleBowl,
};

export function buildVessel(id: VesselId): BuiltVessel {
  const built = BUILDERS[id]();
  built.group.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  return built;
}
