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
  /** Wells to drop scoops into, for vessels that lay them out side by side. */
  slots?: THREE.Vector3[];
  /** Scoop radius that fits one well, so side-by-side scoops never overlap. */
  slotRadius?: number;
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
  return new THREE.Mesh(latheProfile(profile), material);
}

/** The rolled lip every cup, cone and bowl has. */
function rim(radius: number, tube: number, y: number, material: THREE.Material): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 12, 48), material);
  mesh.rotation.x = Math.PI / 2;
  mesh.position.y = y;
  return mesh;
}

/** A candy-striped paper cup, the classic scoop-shop tub. */
function buildCup(): BuiltVessel {
  const group = new THREE.Group();
  group.add(shell(CUP, stripedCupMaterial()));

  group.add(rim(0.66, 0.032, 0.79, plasticMaterial("#FF6FA5")));

  return { group, topY: 0.74, topRadius: 0.6 };
}

function buildWaffleCone(): BuiltVessel {
  const group = new THREE.Group();
  group.add(shell(WAFFLE_CONE, coneMaterial("waffle")));
  group.add(rim(0.6, 0.035, 1.27, coneMaterial("waffle")));
  return { group, topY: 1.2, topRadius: 0.56 };
}

function buildCakeCone(): BuiltVessel {
  const group = new THREE.Group();
  group.add(shell(CAKE_CONE, coneMaterial("wafer")));
  group.add(rim(0.58, 0.03, 1.05, coneMaterial("wafer")));
  return { group, topY: 0.99, topRadius: 0.54 };
}

function buildSundae(): BuiltVessel {
  const group = new THREE.Group();
  group.add(shell(SUNDAE_GLASS, glassMaterial("#EAF7FF", 0.17)));
  return { group, topY: 0.98, topRadius: 0.56 };
}

/** A root-beer float: fizzy soda in a tall glass, ice cream bobbing on top. */
function buildFloat(): BuiltVessel {
  const group = new THREE.Group();
  group.add(shell(FLOAT_GLASS, glassMaterial("#F2FAFF", 0.16)));

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
  group.add(rim(0.84, 0.04, 0.8, coneMaterial("waffle")));
  return { group, topY: 0.66, topRadius: 0.74 };
}

/** A white paper tray, the kind a hot dog comes in. */
function buildPaperBoat(): BuiltVessel {
  const group = new THREE.Group();
  const paper = plasticMaterial("#FFFDF7");

  // A lathed bowl squashed on one axis reads as an oval paper boat.
  const shellMesh = shell(
    [
      [0, 0],
      [0.34, 0.01],
      [0.5, 0.1],
      [0.6, 0.28],
      [0.64, 0.4],
    ],
    paper,
  );
  shellMesh.scale.set(1.55, 1, 0.78);
  group.add(shellMesh);

  const lip = rim(0.64, 0.035, 0.4, paper);
  lip.scale.set(1.55, 1, 0.78);
  group.add(lip);

  // The fluted ridges every paper tray has.
  const ridge = plasticMaterial("#F3EADA");
  for (let i = 0; i < 18; i++) {
    const angle = (i / 18) * Math.PI * 2;
    const fold = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.3, 0.03), ridge);
    fold.position.set(Math.cos(angle) * 0.86, 0.22, Math.sin(angle) * 0.44);
    fold.lookAt(0, 0.22, 0);
    group.add(fold);
  }

  return {
    group,
    topY: 0.26,
    topRadius: 0.46,
    slots: [new THREE.Vector3(-0.62, 0, 0), new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.62, 0, 0)],
    slotRadius: 0.3,
  };
}

/** A pink egg carton: six wells, one scoop each. */
function buildEggCarton(): BuiltVessel {
  const group = new THREE.Group();
  const carton = plasticMaterial("#FF8FC0");
  const well = plasticMaterial("#F2559B");

  const width = 2.9;
  const depth = 2.0;
  const base = new THREE.Mesh(new THREE.BoxGeometry(width, 0.2, depth), carton);
  base.position.y = 0.1;
  group.add(base);

  // A raised lip all the way round, so it reads as a carton and not a slab.
  const wallHeight = 0.22;
  const walls: [number, number, number, number][] = [
    [width, 0.07, 0, depth / 2],
    [width, 0.07, 0, -depth / 2],
    [0.07, depth, width / 2, 0],
    [0.07, depth, -width / 2, 0],
  ];
  for (const [w, d, x, z] of walls) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, wallHeight, d), carton);
    wall.position.set(x, 0.2 + wallHeight / 2, z);
    group.add(wall);
  }

  const slots: THREE.Vector3[] = [];
  for (let row = 0; row < 2; row++) {
    for (let column = 0; column < 3; column++) {
      const x = (column - 1) * 0.88;
      const z = (row - 0.5) * 0.92;
      const cup = new THREE.Mesh(new THREE.SphereGeometry(0.42, 28, 18, 0, Math.PI * 2, 0, Math.PI / 2), well);
      cup.rotation.x = Math.PI;
      cup.position.set(x, 0.32, z);
      cup.scale.y = 0.62;
      group.add(cup);
      slots.push(new THREE.Vector3(x, 0, z));
    }
  }

  return { group, topY: 0.26, topRadius: 0.36, slots, slotRadius: 0.36 };
}

/** A small tapered paper cup - the frosty. */
function buildFrosty(): BuiltVessel {
  const group = new THREE.Group();
  const paper = plasticMaterial("#FFFDF7");
  group.add(
    shell(
      [
        [0, 0],
        [0.3, 0],
        [0.32, 0.04],
        [0.42, 0.5],
        [0.46, 0.78],
        [0.48, 0.84],
      ],
      paper,
    ),
  );

  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.35, 0.2, 40, 1, true), plasticMaterial("#D9273C"));
  band.position.y = 0.36;
  group.add(band);
  group.add(rim(0.49, 0.028, 0.84, paper));

  return { group, topY: 0.8, topRadius: 0.44 };
}

const BUILDERS: Record<VesselId, () => BuiltVessel> = {
  cup: buildCup,
  "waffle-cone": buildWaffleCone,
  "cake-cone": buildCakeCone,
  sundae: buildSundae,
  float: buildFloat,
  "waffle-bowl": buildWaffleBowl,
  "paper-boat": buildPaperBoat,
  "egg-carton": buildEggCarton,
  frosty: buildFrosty,
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
