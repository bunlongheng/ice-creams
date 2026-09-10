import * as THREE from "three";

/**
 * Every texture in the shop is drawn on a canvas at runtime - no image assets to
 * download, and colours stay in sync with the catalog. Results are cached by key.
 */
const cache = new Map<string, THREE.Texture>();

function draw(key: string, size: number, paint: (ctx: CanvasRenderingContext2D, size: number) => void): THREE.Texture {
  const hit = cache.get(key);
  if (hit) return hit;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas is unavailable");
  paint(ctx, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  cache.set(key, texture);
  return texture;
}

/** Crisp diagonal waffle lattice for cones and bowls. */
export const waffleTexture = (): THREE.Texture =>
  draw("waffle", 256, (ctx, size) => {
    ctx.fillStyle = "#D9A05B";
    ctx.fillRect(0, 0, size, size);
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, "rgba(255,226,180,0.55)");
    grad.addColorStop(1, "rgba(140,84,32,0.35)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = "rgba(96,54,20,0.55)";
    ctx.lineWidth = size / 28;
    const step = size / 6;
    for (let i = -size; i < size * 2; i += step) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + size, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(i + size, 0);
      ctx.lineTo(i, size);
      ctx.stroke();
    }
  });

/** Pale, lightly dimpled wafer for cake cones. */
export const waferTexture = (): THREE.Texture =>
  draw("wafer", 256, (ctx, size) => {
    ctx.fillStyle = "#E8CFA3";
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = "rgba(150,112,66,0.35)";
    const step = size / 14;
    for (let y = step / 2; y < size; y += step) {
      for (let x = step / 2; x < size; x += step) {
        ctx.beginPath();
        ctx.arc(x + (y % (step * 2) ? step / 2 : 0), y, step * 0.18, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });

/** Two-tone ribbon used by swirl flavours (cotton candy, mango, blue raspberry). */
export const swirlTexture = (base: string, ribbon: string): THREE.Texture =>
  draw(`swirl:${base}:${ribbon}`, 256, (ctx, size) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = ribbon;
    ctx.lineCap = "round";
    // Thin, soft ribbons read as a swirl folded through the ice cream; thick
    // ones read as paint.
    ctx.globalAlpha = 0.75;
    for (let i = 0; i < 3; i++) {
      ctx.lineWidth = size / (20 + i * 6);
      const offset = (i / 3) * size;
      ctx.beginPath();
      for (let x = 0; x <= size; x += 4) {
        const y = (offset + x * 0.9 + Math.sin(x / 26) * size * 0.06) % size;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  });

/** Fine flecks - vanilla bean, birthday-cake confetti. */
export const speckleTexture = (base: string, fleck: string): THREE.Texture =>
  draw(`speckle:${base}:${fleck}`, 256, (ctx, size) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = fleck;
    for (let i = 0; i < 220; i++) {
      const x = (Math.sin(i * 12.9898) * 43758.5453) % 1;
      const y = (Math.sin(i * 78.233) * 43758.5453) % 1;
      ctx.save();
      ctx.translate(Math.abs(x) * size, Math.abs(y) * size);
      ctx.rotate(i);
      ctx.fillRect(0, 0, size / 90, size / 40);
      ctx.restore();
    }
  });

/** Vertical candy stripes for the paper cup. */
export const stripeTexture = (base: string, stripe: string): THREE.Texture =>
  draw(`stripe:${base}:${stripe}`, 256, (ctx, size) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = stripe;
    const step = size / 12;
    for (let x = 0; x < size; x += step * 2) ctx.fillRect(x, 0, step, size);
  });

/** Soft round blob - contact shadow under the dessert and sparkle particles. */
export const radialTexture = (inner: string, outer: string, key: string): THREE.Texture =>
  draw(`radial:${key}`, 128, (ctx, size) => {
    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, inner);
    grad.addColorStop(1, outer);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  });

/** Four-point sparkle used in the serve celebration. */
export const starTexture = (): THREE.Texture =>
  draw("star", 128, (ctx, size) => {
    const c = size / 2;
    const grad = ctx.createRadialGradient(c, c, 0, c, c, c);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.25, "rgba(255,236,170,0.9)");
    grad.addColorStop(1, "rgba(255,200,90,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      ctx.moveTo(c, c);
      ctx.lineTo(c + Math.cos(a) * c, c + Math.sin(a) * c);
      ctx.lineTo(c + Math.cos(a + 0.22) * c * 0.22, c + Math.sin(a + 0.22) * c * 0.22);
    }
    ctx.fill();
  });

/** Frees every cached texture. Called when the scene is torn down. */
export function disposeTextureCache(): void {
  for (const texture of cache.values()) texture.dispose();
  cache.clear();
}
