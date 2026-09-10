/**
 * The whole shop menu lives here. The 3D scene, the buttons and the tests all
 * read from these tables, so a new flavour or topping is a one-line change.
 */

export type StyleId = "soft" | "scoop";
type ChunkKind = "none" | "cookie" | "chip" | "speckle" | "swirl";
export type VesselId = "cup" | "waffle-cone" | "cake-cone" | "sundae" | "float" | "waffle-bowl";
type ToppingKind = "sprinkle" | "crumb" | "chunk" | "chip" | "nut" | "fruit" | "gummy" | "sauce" | "cream" | "cherry";

interface ServeStyle {
  id: StyleId;
  name: string;
  /** Spoken by the shop sign while this style is picked. */
  cheer: string;
}

export interface Flavor {
  id: string;
  name: string;
  /** Base ice cream colour, hex. */
  color: string;
  /** Colour of the bits mixed through it. */
  chunkColor: string;
  chunk: ChunkKind;
}

interface Vessel {
  id: VesselId;
  name: string;
  /** How many scoops the vessel can hold when the scooped style is picked. */
  maxScoops: number;
}

export interface Topping {
  id: string;
  name: string;
  kind: ToppingKind;
  color: string;
  /** Second colour for two-tone toppings (gummy bears, cookies, nuts). */
  accent: string;
}

export const STYLES: readonly ServeStyle[] = [
  { id: "soft", name: "Soft Swirl", cheer: "Swirly swirl!" },
  { id: "scoop", name: "Big Scoops", cheer: "Scoop scoop!" },
] as const;

export const FLAVORS: readonly Flavor[] = [
  { id: "vanilla", name: "Vanilla", color: "#FBF0D9", chunkColor: "#D8B978", chunk: "speckle" },
  { id: "chocolate", name: "Chocolate", color: "#7B4A2D", chunkColor: "#4A2A18", chunk: "none" },
  { id: "strawberry", name: "Strawberry", color: "#F6A8BC", chunkColor: "#D94F6E", chunk: "chip" },
  { id: "cotton-candy", name: "Cotton Candy", color: "#9FD8F5", chunkColor: "#FF9ED2", chunk: "swirl" },
  { id: "cookies-cream", name: "Cookies & Cream", color: "#F2EAE0", chunkColor: "#2E2724", chunk: "cookie" },
  { id: "mint-chip", name: "Mint Chip", color: "#A8E6C7", chunkColor: "#33241C", chunk: "chip" },
  { id: "bubblegum", name: "Bubblegum", color: "#FF9ECF", chunkColor: "#5BC8F5", chunk: "chip" },
  { id: "birthday-cake", name: "Birthday Cake", color: "#FFF3C4", chunkColor: "#FF5FA2", chunk: "speckle" },
  { id: "blue-raspberry", name: "Blue Raspberry", color: "#7BC6FF", chunkColor: "#2A6FD6", chunk: "swirl" },
  { id: "banana", name: "Banana", color: "#FCE49B", chunkColor: "#C99A2E", chunk: "none" },
  { id: "mango", name: "Mango", color: "#FFB86B", chunkColor: "#E4762A", chunk: "swirl" },
  { id: "rocky-road", name: "Rocky Road", color: "#6B432B", chunkColor: "#FFF4E2", chunk: "cookie" },
] as const;

export const VESSELS: readonly Vessel[] = [
  { id: "cup", name: "Cup", maxScoops: 3 },
  { id: "waffle-cone", name: "Waffle Cone", maxScoops: 3 },
  { id: "cake-cone", name: "Cake Cone", maxScoops: 2 },
  { id: "sundae", name: "Sundae", maxScoops: 3 },
  { id: "float", name: "Float", maxScoops: 2 },
  { id: "waffle-bowl", name: "Waffle Bowl", maxScoops: 3 },
] as const;

export const TOPPINGS: readonly Topping[] = [
  { id: "rainbow-sprinkles", name: "Rainbow Sprinkles", kind: "sprinkle", color: "#FF4D6D", accent: "#4CC9F0" },
  { id: "choc-sprinkles", name: "Chocolate Sprinkles", kind: "sprinkle", color: "#4A2A18", accent: "#3A1F11" },
  { id: "oreo", name: "Oreo Crumbles", kind: "crumb", color: "#2E2724", accent: "#F5EFE6" },
  { id: "cookie-dough", name: "Cookie Pieces", kind: "chunk", color: "#D9A05B", accent: "#7B4A2D" },
  { id: "gummy", name: "Gummy Bears", kind: "gummy", color: "#FF5FA2", accent: "#5BE38C" },
  { id: "strawberries", name: "Strawberries", kind: "fruit", color: "#E8395B", accent: "#4FBF6A" },
  { id: "banana-slices", name: "Banana Slices", kind: "fruit", color: "#FFE066", accent: "#E8C33C" },
  { id: "choc-chips", name: "Chocolate Chips", kind: "chip", color: "#3A2216", accent: "#241209" },
  { id: "peanuts", name: "Peanuts", kind: "nut", color: "#D2A264", accent: "#A87438" },
  { id: "hot-fudge", name: "Hot Fudge", kind: "sauce", color: "#4B2415", accent: "#301508" },
  { id: "caramel", name: "Caramel", kind: "sauce", color: "#D98B2B", accent: "#B06915" },
  { id: "whipped-cream", name: "Whipped Cream", kind: "cream", color: "#FFFBF2", accent: "#F0E4D0" },
  { id: "marshmallows", name: "Marshmallows", kind: "chunk", color: "#FFF6F8", accent: "#FFD3E2" },
  { id: "cherry", name: "Cherry on Top", kind: "cherry", color: "#E01E3C", accent: "#3F8B36" },
] as const;

/** Fast id lookups, built once at module load. */
const index = <T extends { id: string }>(rows: readonly T[]) => new Map(rows.map((r) => [r.id, r]));

const FLAVOR_BY_ID = index(FLAVORS);
const VESSEL_BY_ID = index(VESSELS);
const TOPPING_BY_ID = index(TOPPINGS);
const STYLE_BY_ID = index(STYLES);

export const getFlavor = (id: string): Flavor | undefined => FLAVOR_BY_ID.get(id);
export const getVessel = (id: string): Vessel | undefined => VESSEL_BY_ID.get(id);
export const getTopping = (id: string): Topping | undefined => TOPPING_BY_ID.get(id);
export const getStyle = (id: string): ServeStyle | undefined => STYLE_BY_ID.get(id);

export const isFlavorId = (id: string): boolean => FLAVOR_BY_ID.has(id);
export const isVesselId = (id: string): id is VesselId => VESSEL_BY_ID.has(id);
export const isToppingId = (id: string): boolean => TOPPING_BY_ID.has(id);
export const isStyleId = (id: string): id is StyleId => STYLE_BY_ID.has(id);
