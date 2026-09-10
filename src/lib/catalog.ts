/**
 * The whole shop menu lives here. The 3D scene, the buttons and the tests all
 * read from these tables, so a new flavour or topping is a one-line change.
 */

export type StyleId = "soft" | "scoop";
type ChunkKind = "none" | "cookie" | "chip" | "speckle" | "swirl";
export type VesselId =
  | "cup"
  | "waffle-cone"
  | "cake-cone"
  | "sundae"
  | "float"
  | "waffle-bowl"
  | "paper-boat"
  | "egg-carton"
  | "frosty";
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
  /** "stack" piles the scoops up; "slots" lays them out in the vessel's wells. */
  layout: "stack" | "slots";
  /** Styles this vessel accepts. Omitted means it takes either one. */
  styles?: readonly StyleId[];
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
  { id: "vanilla", name: "Vanilla", color: "#F6EAC9", chunkColor: "#D8B978", chunk: "speckle" },
  { id: "chocolate", name: "Chocolate", color: "#6B4127", chunkColor: "#3A2011", chunk: "none" },
  { id: "strawberry", name: "Strawberry", color: "#F8AEBE", chunkColor: "#D6335A", chunk: "chip" },
  { id: "mint", name: "Mint Chip", color: "#AEE7CB", chunkColor: "#3A241A", chunk: "chip" },
  { id: "cookies", name: "Cookies & Cream", color: "#ECE8E1", chunkColor: "#2B2B30", chunk: "cookie" },
  { id: "cookie-dough", name: "Cookie Dough", color: "#EFD199", chunkColor: "#C79246", chunk: "cookie" },
  { id: "caramel", name: "Caramel", color: "#E0A85B", chunkColor: "#8A4E14", chunk: "swirl" },
  { id: "bubblegum", name: "Bubblegum", color: "#FBAEDD", chunkColor: "#5AC8E8", chunk: "chip" },
  { id: "cake", name: "Birthday Cake", color: "#CDEBF7", chunkColor: "#F6A623", chunk: "speckle" },
  { id: "rocky-road", name: "Rocky Road", color: "#6E4A32", chunkColor: "#C79A5E", chunk: "cookie" },
  { id: "pistachio", name: "Pistachio", color: "#CBDD97", chunkColor: "#5E7A2A", chunk: "chip" },
  { id: "mango", name: "Mango", color: "#FBC85A", chunkColor: "#F5822B", chunk: "swirl" },
  { id: "blueberry", name: "Blueberry", color: "#B7ADE0", chunkColor: "#463C90", chunk: "swirl" },
  { id: "peanut-butter", name: "Peanut Butter", color: "#DDAC5C", chunkColor: "#6B3F1E", chunk: "swirl" },
  { id: "neapolitan", name: "Neapolitan", color: "#F6EAC9", chunkColor: "#F8AEBE", chunk: "swirl" },
  { id: "purple-cow", name: "Purple Cow", color: "#B57BD6", chunkColor: "#5B2E8A", chunk: "swirl" },
  { id: "raisin", name: "Raisin", color: "#E4C79A", chunkColor: "#4A2438", chunk: "chip" },
  { id: "coconut", name: "Coconut", color: "#F3EEE4", chunkColor: "#CBB48A", chunk: "speckle" },
  { id: "banana", name: "Banana", color: "#F6E39B", chunkColor: "#C99A2E", chunk: "none" },
  { id: "pina-colada", name: "Pina Colada", color: "#F3E7C0", chunkColor: "#F2C34B", chunk: "speckle" },
  { id: "orange", name: "Orange", color: "#F6A83C", chunkColor: "#E0771A", chunk: "swirl" },
  { id: "pineapple", name: "Pineapple", color: "#F4D24A", chunkColor: "#C8901A", chunk: "speckle" },
  { id: "peach", name: "Peach", color: "#F7C39A", chunkColor: "#E89A5E", chunk: "swirl" },
  { id: "coffee", name: "Coffee", color: "#B98A5E", chunkColor: "#4A2E18", chunk: "swirl" },
  { id: "watermelon", name: "Watermelon", color: "#F58AA0", chunkColor: "#1A0D06", chunk: "chip" },
  { id: "lime", name: "Lime", color: "#B8E05A", chunkColor: "#5E7A2A", chunk: "speckle" },
  { id: "lemon", name: "Lemon", color: "#F6E85A", chunkColor: "#C9B21E", chunk: "speckle" },
  { id: "raspberry", name: "Raspberry", color: "#E86A8E", chunkColor: "#8A1533", chunk: "chip" },
  { id: "cotton-candy", name: "Cotton Candy", color: "#8FD3F0", chunkColor: "#F7A6D6", chunk: "swirl" },
  { id: "cherry", name: "Cherry", color: "#E85A6A", chunkColor: "#8A1528", chunk: "chip" },
] as const;

export const VESSELS: readonly Vessel[] = [
  { id: "cup", name: "Cup", maxScoops: 5, layout: "stack" },
  { id: "waffle-cone", name: "Waffle Cone", maxScoops: 4, layout: "stack" },
  { id: "cake-cone", name: "Cake Cone", maxScoops: 3, layout: "stack" },
  { id: "sundae", name: "Sundae", maxScoops: 5, layout: "stack" },
  { id: "float", name: "Float", maxScoops: 3, layout: "stack" },
  { id: "waffle-bowl", name: "Waffle Bowl", maxScoops: 5, layout: "stack" },
  { id: "paper-boat", name: "Paper Boat", maxScoops: 3, layout: "slots" },
  // A carton holds one scoop per well, so a piped swirl makes no sense in it.
  { id: "egg-carton", name: "Egg Carton", maxScoops: 6, layout: "slots", styles: ["scoop"] },
  { id: "frosty", name: "Frosty Cup", maxScoops: 2, layout: "stack" },
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

/** Whether a vessel can be served with the given style. */
export const vesselTakesStyle = (vessel: Vessel, style: StyleId | null): boolean =>
  !vessel.styles || style === null || vessel.styles.includes(style);

/** The vessels on offer for a style - the rest are simply not shown. */
export const vesselsForStyle = (style: StyleId | null): readonly Vessel[] =>
  VESSELS.filter((vessel) => vesselTakesStyle(vessel, style));
export const isToppingId = (id: string): boolean => TOPPING_BY_ID.has(id);
export const isStyleId = (id: string): id is StyleId => STYLE_BY_ID.has(id);
