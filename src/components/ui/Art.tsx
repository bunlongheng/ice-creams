import type { Flavor, Topping, VesselId } from "@/lib/catalog";

/**
 * Hand-drawn SVG art so every button is a picture, not a word. All shapes share
 * one 64x64 viewBox and inherit colour from the catalog.
 */

const svgProps = {
  viewBox: "0 0 64 64",
  xmlns: "http://www.w3.org/2000/svg",
  "aria-hidden": true,
  focusable: "false",
} as const;

const OUTLINE = "#4A2C2A";

/**
 * The two styles. Neither draws a cone: the container is its own step now, and
 * a cone under both icons made them look like the same choice twice.
 */
export function SoftServeArt() {
  // A piped rope of soft serve - wide coils at the bottom, a little tip on top.
  const coils: [number, number, number, string][] = [
    [32, 50, 17, "#FFF1DC"],
    [32, 41, 15, "#FFD9E4"],
    [32, 32.5, 12.5, "#FFF1DC"],
    [32, 25, 10, "#FFD9E4"],
    [32, 18.5, 7.5, "#FFF1DC"],
  ];

  return (
    <svg {...svgProps}>
      <ellipse cx="32" cy="55" rx="19" ry="6" fill="#FFE7D0" stroke={OUTLINE} strokeWidth="2.5" />
      {coils.map(([cx, cy, r, fill], index) => (
        <g key={index}>
          <ellipse cx={cx} cy={cy} rx={r} ry={r * 0.56} fill={fill} stroke={OUTLINE} strokeWidth="2.5" />
          <path
            d={`M${cx - r * 0.55} ${cy - r * 0.1}q${r * 0.55} ${r * 0.34} ${r * 1.1} 0`}
            fill="none"
            stroke={OUTLINE}
            strokeWidth="1.4"
            opacity="0.35"
          />
        </g>
      ))}
      <path d="M32 6c4 3 5 6 5 8.5 0 3-2.4 4.5-5 4.5s-5-1.5-5-4.5C27 12 28 9 32 6z" fill="#FFF1DC" stroke={OUTLINE} strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  );
}

export function ScoopsArt() {
  // Three round scoops, stacked - no container, just the shape of the choice.
  return (
    <svg {...svgProps}>
      <ellipse cx="32" cy="55" rx="19" ry="6" fill="#FFE7D0" stroke={OUTLINE} strokeWidth="2.5" />
      <circle cx="21" cy="42" r="12.5" fill="#F8AEBE" stroke={OUTLINE} strokeWidth="2.5" />
      <circle cx="43" cy="42" r="12.5" fill="#FBE7C0" stroke={OUTLINE} strokeWidth="2.5" />
      <circle cx="32" cy="22" r="14" fill="#AEE7CB" stroke={OUTLINE} strokeWidth="2.5" />
      <circle cx="26.5" cy="16.5" r="3.6" fill="#FFFFFF" opacity="0.65" />
      <circle cx="16.5" cy="38" r="2.6" fill="#FFFFFF" opacity="0.5" />
      <circle cx="38.5" cy="38" r="2.6" fill="#FFFFFF" opacity="0.5" />
    </svg>
  );
}

/** A single scoop painted in the real flavour colour, with its mix-in hint. */
export function FlavorArt({ flavor }: { flavor: Flavor }) {
  return (
    <svg {...svgProps}>
      <defs>
        <clipPath id={`scoop-${flavor.id}`}>
          <path d="M32 10c12 0 20 9 20 18 0 6-4 10-9 12H21c-5-2-9-6-9-12 0-9 8-18 20-18z" />
        </clipPath>
      </defs>
      <path
        d="M32 10c12 0 20 9 20 18 0 6-4 10-9 12H21c-5-2-9-6-9-12 0-9 8-18 20-18z"
        fill={flavor.color}
        stroke={OUTLINE}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <g clipPath={`url(#scoop-${flavor.id})`}>
        {flavor.chunk === "swirl" && (
          <path
            d="M6 22c8 6 16-4 24 2s16 0 28 4M6 32c8 6 16-4 24 2s16 0 28 4"
            stroke={flavor.chunkColor}
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />
        )}
        {(flavor.chunk === "chip" || flavor.chunk === "cookie") &&
          [
            [20, 22],
            [32, 18],
            [42, 26],
            [26, 32],
            [38, 34],
            [16, 31],
            [46, 18],
          ].map(([cx = 0, cy = 0], index) => (
            <circle key={index} cx={cx} cy={cy} r={flavor.chunk === "cookie" ? 3.6 : 2.6} fill={flavor.chunkColor} />
          ))}
        {flavor.chunk === "speckle" &&
          Array.from({ length: 14 }, (_, index) => (
            <rect
              key={index}
              x={10 + ((index * 13) % 42)}
              y={16 + ((index * 7) % 22)}
              width="3.4"
              height="1.6"
              rx="0.8"
              fill={flavor.chunkColor}
              transform={`rotate(${index * 37} ${12 + ((index * 13) % 42)} ${17 + ((index * 7) % 22)})`}
            />
          ))}
      </g>
      <path d="M12 40h40l-6 8H18z" fill="#FFF2DC" stroke={OUTLINE} strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  );
}

const VESSEL_ART: Record<VesselId, React.ReactElement> = {
  cup: (
    <>
      <path d="M15 20h34l-4 32H19z" fill="#FFF7EC" stroke={OUTLINE} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M20 26v22M28 26v22M36 26v22M44 26v20" stroke="#FF6FA5" strokeWidth="3" strokeLinecap="round" />
      <rect x="12" y="15" width="40" height="7" rx="3.5" fill="#FF6FA5" stroke={OUTLINE} strokeWidth="2.5" />
    </>
  ),
  "waffle-cone": (
    <>
      <path d="M17 18h30L32 58z" fill="#D9A05B" stroke={OUTLINE} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M22 26l16 14M42 26L26 40M20 34l10 10M44 34l-10 10" stroke="#A9702F" strokeWidth="2" />
      <rect x="14" y="13" width="36" height="7" rx="3.5" fill="#E8B571" stroke={OUTLINE} strokeWidth="2.5" />
    </>
  ),
  "cake-cone": (
    <>
      <path d="M19 18h26l-6 36H25z" fill="#E8CFA3" stroke={OUTLINE} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M21 27h22M22 35h20M24 43h16" stroke="#B99763" strokeWidth="2" strokeLinecap="round" />
      <rect x="16" y="13" width="32" height="7" rx="3.5" fill="#F0DEBC" stroke={OUTLINE} strokeWidth="2.5" />
    </>
  ),
  sundae: (
    <>
      <path d="M14 16h36l-9 20 3 12H24l3-12z" fill="#DCF1FF" stroke={OUTLINE} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M22 52h20" stroke={OUTLINE} strokeWidth="4" strokeLinecap="round" />
      <path d="M20 22h24" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
    </>
  ),
  float: (
    <>
      <path d="M19 12h26l-4 44H23z" fill="#E9F7FF" stroke={OUTLINE} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M21 26h22l-3 28H24z" fill="#A05A2C" />
      <circle cx="28" cy="34" r="2.6" fill="#FFF3D6" />
      <circle cx="36" cy="42" r="2.2" fill="#FFF3D6" />
      <circle cx="31" cy="47" r="1.8" fill="#FFF3D6" />
      <path d="M19 12h26l-4 44H23z" fill="none" stroke={OUTLINE} strokeWidth="2.5" strokeLinejoin="round" />
    </>
  ),
  "paper-boat": (
    <>
      <path d="M6 24h52c-2 14-10 22-26 22S8 38 6 24z" fill="#FFFDF7" stroke={OUTLINE} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M14 30v10M22 33v11M32 34v12M42 33v11M50 30v10" stroke="#DCD2C0" strokeWidth="2.5" strokeLinecap="round" />
      <rect x="4" y="19" width="56" height="7" rx="3.5" fill="#FFFFFF" stroke={OUTLINE} strokeWidth="2.5" />
    </>
  ),
  "egg-carton": (
    <>
      <rect x="5" y="24" width="54" height="22" rx="5" fill="#FF8FC0" stroke={OUTLINE} strokeWidth="2.5" />
      {[
        [16, 31],
        [32, 31],
        [48, 31],
        [16, 40],
        [32, 40],
        [48, 40],
      ].map(([cx = 0, cy = 0], index) => (
        <ellipse key={index} cx={cx} cy={cy} rx="6.5" ry="4" fill="#FF6FA5" stroke={OUTLINE} strokeWidth="1.6" />
      ))}
    </>
  ),
  frosty: (
    <>
      <path d="M20 18h24l-4 34H24z" fill="#FFFDF7" stroke={OUTLINE} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M21 28h22l-1 8H22z" fill="#D9273C" />
      <path d="M20 18h24l-4 34H24z" fill="none" stroke={OUTLINE} strokeWidth="2.5" strokeLinejoin="round" />
      <rect x="17" y="13" width="30" height="7" rx="3.5" fill="#FFFFFF" stroke={OUTLINE} strokeWidth="2.5" />
    </>
  ),
  "waffle-bowl": (
    <>
      <path d="M10 24h44c0 16-10 26-22 26S10 40 10 24z" fill="#D9A05B" stroke={OUTLINE} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M18 30l12 14M46 30L34 44M14 36l10 10M50 36l-10 10" stroke="#A9702F" strokeWidth="2" />
      <rect x="8" y="19" width="48" height="7" rx="3.5" fill="#E8B571" stroke={OUTLINE} strokeWidth="2.5" />
    </>
  ),
};

export function VesselArt({ id }: { id: VesselId }) {
  return (
    <svg {...svgProps}>
      {VESSEL_ART[id]}
    </svg>
  );
}

/** Topping art is generated from the kind so a new topping needs no new drawing. */
export function ToppingArt({ topping }: { topping: Topping }) {
  const { kind, color, accent } = topping;

  return (
    <svg {...svgProps}>
      <circle cx="32" cy="34" r="21" fill="#FFF7EC" stroke={OUTLINE} strokeWidth="2.5" />
      {kind === "sprinkle" &&
        Array.from({ length: 11 }, (_, index) => (
          <rect
            key={index}
            x={16 + ((index * 11) % 32)}
            y={20 + ((index * 9) % 26)}
            width="10"
            height="4"
            rx="2"
            fill={index % 2 === 0 ? color : accent}
            transform={`rotate(${index * 41} ${21 + ((index * 11) % 32)} ${22 + ((index * 9) % 26)})`}
          />
        ))}
      {kind === "crumb" && (
        <>
          <circle cx="32" cy="34" r="13" fill={color} />
          <rect x="19" y="31" width="26" height="6" rx="3" fill={accent} />
          <circle cx="22" cy="22" r="4" fill={color} />
          <circle cx="44" cy="45" r="3.4" fill={color} />
        </>
      )}
      {kind === "chunk" && (
        <>
          <rect x="18" y="26" width="15" height="13" rx="4" fill={color} stroke={OUTLINE} strokeWidth="2" />
          <rect x="32" y="34" width="14" height="12" rx="4" fill={color} stroke={OUTLINE} strokeWidth="2" />
          <circle cx="24" cy="32" r="2" fill={accent} />
          <circle cx="39" cy="40" r="2" fill={accent} />
        </>
      )}
      {kind === "chip" &&
        [
          [24, 26],
          [38, 28],
          [30, 38],
          [42, 42],
          [20, 40],
        ].map(([cx = 0, cy = 0], index) => (
          <path key={index} d={`M${cx} ${cy - 6}l6 11h-12z`} fill={color} stroke={OUTLINE} strokeWidth="1.6" strokeLinejoin="round" />
        ))}
      {kind === "nut" &&
        [
          [24, 27],
          [39, 30],
          [30, 40],
          [43, 43],
        ].map(([cx = 0, cy = 0], index) => (
          <ellipse key={index} cx={cx} cy={cy} rx="7" ry="5" fill={color} stroke={accent} strokeWidth="2" transform={`rotate(${index * 35} ${cx} ${cy})`} />
        ))}
      {kind === "fruit" && topping.id === "banana-slices" && (
        <>
          <circle cx="26" cy="30" r="8" fill={color} stroke={accent} strokeWidth="2.5" />
          <circle cx="40" cy="40" r="8" fill={color} stroke={accent} strokeWidth="2.5" />
          <circle cx="26" cy="30" r="2.4" fill={accent} />
          <circle cx="40" cy="40" r="2.4" fill={accent} />
        </>
      )}
      {kind === "fruit" && topping.id !== "banana-slices" && (
        <>
          <path d="M32 22c8 0 12 6 12 12s-6 12-12 12-12-4-12-12 4-12 12-12z" fill={color} />
          <path d="M24 22h16l-8 6z" fill={accent} />
          <circle cx="28" cy="32" r="1.6" fill="#FFF" />
          <circle cx="36" cy="38" r="1.6" fill="#FFF" />
        </>
      )}
      {kind === "gummy" && (
        <>
          <circle cx="24" cy="26" r="5" fill={color} />
          <circle cx="42" cy="40" r="5" fill={accent} />
          <rect x="18" y="30" width="12" height="16" rx="6" fill={color} />
          <rect x="36" y="18" width="12" height="16" rx="6" fill={accent} />
        </>
      )}
      {kind === "sauce" && (
        <>
          <path d="M13 26c6-6 32-6 38 0v6c-4 4-6 2-8 8s-6 2-8 8-6 0-8-6-6-2-8-8-4-4-6-8z" fill={color} />
          <path d="M16 24c8-4 24-4 32 0" stroke={accent} strokeWidth="3" strokeLinecap="round" fill="none" />
        </>
      )}
      {kind === "cream" && (
        <>
          <path
            d="M32 14c4 0 6 3 6 5 0 1-1 2-2 3 3 1 4 3 4 5s-1 3-3 4c3 1 4 3 4 5 0 4-4 6-9 6s-9-2-9-6c0-2 1-4 4-5-2-1-3-2-3-4s1-4 4-5c-1-1-2-2-2-3 0-2 2-5 6-5z"
            fill={color}
            stroke={OUTLINE}
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
        </>
      )}
      {kind === "cherry" && (
        <>
          <path d="M32 20c6 2 8 6 8 10" stroke={accent} strokeWidth="3" fill="none" strokeLinecap="round" />
          <circle cx="38" cy="38" r="10" fill={color} stroke={OUTLINE} strokeWidth="2.2" />
          <circle cx="35" cy="34" r="2.6" fill="#FFF" opacity="0.7" />
        </>
      )}
    </svg>
  );
}

/** The customer waiting at the counter. */
export function CustomerArt({ happy }: { happy: boolean }) {
  return (
    <svg {...svgProps}>
      <circle cx="32" cy="34" r="22" fill="#FFD9B8" stroke={OUTLINE} strokeWidth="2.5" />
      <path d="M10 28c2-14 12-20 22-20s20 6 22 20c-6-6-14-8-22-8s-16 2-22 8z" fill="#7B4A2D" stroke={OUTLINE} strokeWidth="2.5" strokeLinejoin="round" />
      {happy ? (
        <>
          <path d="M20 32c2-3 6-3 8 0M36 32c2-3 6-3 8 0" stroke={OUTLINE} strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M22 40c4 8 16 8 20 0z" fill="#E8395B" stroke={OUTLINE} strokeWidth="2.5" strokeLinejoin="round" />
        </>
      ) : (
        <>
          <circle cx="24" cy="33" r="3.4" fill={OUTLINE} />
          <circle cx="40" cy="33" r="3.4" fill={OUTLINE} />
          <path d="M24 43c4 4 12 4 16 0" stroke={OUTLINE} strokeWidth="3" strokeLinecap="round" fill="none" />
        </>
      )}
      <circle cx="17" cy="40" r="4" fill="#FF9EB8" opacity="0.75" />
      <circle cx="47" cy="40" r="4" fill="#FF9EB8" opacity="0.75" />
    </svg>
  );
}
