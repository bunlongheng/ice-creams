import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { Dessert } from "@/lib/creation";
import { disposeObject } from "./geometry";
import { disposeMaterialCache } from "./materials";
import { buildIceCream } from "./iceCream";
import { SparkleBurst } from "./sparkles";
import { disposeTextureCache, radialTexture } from "./textures";
import { addToppings } from "./toppings";
import { buildVessel } from "./vessels";
import { hashString } from "@/lib/random";

/**
 * Owns the WebGL canvas. React tells it what the order is; it rebuilds the
 * dessert and runs its own animation loop. Nothing here imports React.
 */
export class IceCreamScene {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly dessert = new THREE.Group();
  private readonly turntable = new THREE.Group();
  private readonly sparkles = new SparkleBurst();
  private readonly glow: THREE.Mesh;
  private readonly contactShadow: THREE.Mesh;
  private readonly keyLight: THREE.DirectionalLight;
  private readonly timer = new THREE.Timer();
  private readonly resizeObserver: ResizeObserver;
  private readonly environmentTarget: THREE.WebGLRenderTarget;
  private readonly motionQuery: MediaQueryList;

  private frame = 0;
  private popTime = Infinity;
  private serveTime = Infinity;
  private crownY = 1.4;
  /** Half-width of the finished dessert, so wide vessels still fit the frame. */
  private halfWidth = 1;
  private dragging = false;
  private lastPointerX = 0;
  private spin = 0;
  private spinVelocity = 0;
  /** Set whenever something changes that the next frame has to draw. */
  private dirty = true;
  private reducedMotion = false;
  private disposed = false;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    this.camera = new THREE.PerspectiveCamera(34, 1, 0.1, 60);

    // A tiny room gives the ice cream real reflections without an HDR download.
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const room = new RoomEnvironment();
    this.environmentTarget = pmrem.fromScene(room, 0.04);
    this.scene.environment = this.environmentTarget.texture;
    this.scene.environmentIntensity = 0.5;
    room.dispose();
    pmrem.dispose();

    this.scene.add(new THREE.HemisphereLight(0xfff3e0, 0xffd9e8, 0.6));

    this.keyLight = new THREE.DirectionalLight(0xfff6e6, 2.0);
    this.keyLight.position.set(2.6, 5.2, 3.4);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.set(1024, 1024);
    this.keyLight.shadow.camera.near = 1;
    this.keyLight.shadow.camera.far = 14;
    this.keyLight.shadow.camera.left = -3;
    this.keyLight.shadow.camera.right = 3;
    this.keyLight.shadow.camera.top = 4;
    this.keyLight.shadow.camera.bottom = -2;
    this.keyLight.shadow.bias = -0.0012;
    this.scene.add(this.keyLight);

    const rim = new THREE.DirectionalLight(0xffb3d9, 0.75);
    rim.position.set(-3.4, 2.2, -2.6);
    this.scene.add(rim);

    // Soft contact shadow - cheaper and prettier than a real shadow-catching floor.
    this.contactShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(3.6, 3.6),
      new THREE.MeshBasicMaterial({
        map: radialTexture("rgba(120,60,40,0.5)", "rgba(120,60,40,0)", "contact"),
        transparent: true,
        depthWrite: false,
      }),
    );
    this.contactShadow.rotation.x = -Math.PI / 2;
    this.contactShadow.position.y = 0.002;
    this.scene.add(this.contactShadow);

    this.glow = new THREE.Mesh(
      new THREE.PlaneGeometry(4.4, 4.4),
      new THREE.MeshBasicMaterial({
        map: radialTexture("rgba(255,235,170,0.95)", "rgba(255,180,90,0)", "glow"),
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    this.glow.position.set(0, 1.3, -0.6);
    this.scene.add(this.glow);

    this.turntable.add(this.dessert);
    this.scene.add(this.turntable);
    this.scene.add(this.sparkles.points);

    this.motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    this.reducedMotion = this.motionQuery.matches;
    this.motionQuery.addEventListener("change", this.onMotionPreferenceChange);

    this.resizeObserver = new ResizeObserver(this.resize);
    this.resizeObserver.observe(canvas);
    this.resize();

    canvas.addEventListener("pointerdown", this.onPointerDown);
    canvas.addEventListener("pointermove", this.onPointerMove);
    canvas.addEventListener("pointerup", this.onPointerUp);
    canvas.addEventListener("pointercancel", this.onPointerUp);
    document.addEventListener("visibilitychange", this.onVisibilityChange);

    this.start();
  }

  /** Rebuilds the dessert from an order. Cheap enough to call on every tap. */
  setCreation(creation: Dessert): void {
    if (this.disposed) return;

    disposeObject(this.dessert);
    this.dessert.clear();

    // Nothing is chosen yet: leave the counter empty rather than parking a
    // placeholder container there, which reads as a choice already made.
    if (!creation.vessel) {
      this.crownY = 1.2;
      this.halfWidth = 0.8;
      this.popTime = Infinity;
      this.dessert.scale.setScalar(1);
      // Nothing is casting it, so the contact shadow would just be a smudge.
      this.contactShadow.visible = false;
      this.dirty = true;
      this.frameCamera();
      return;
    }

    this.contactShadow.visible = true;
    const vessel = buildVessel(creation.vessel);
    this.dessert.add(vessel.group);

    if (creation.style && creation.flavors.length > 0) {
      const iceCream = buildIceCream(creation.style, creation.flavors, vessel.topRadius, vessel.slots, vessel.slotRadius);
      iceCream.group.position.y = vessel.topY - 0.04;
      const crown = addToppings(iceCream, creation.toppings);
      this.dessert.add(iceCream.group);
      this.crownY = iceCream.group.position.y + crown;
    } else {
      this.crownY = vessel.topY + 0.2;
    }

    // Measure what was actually built - an egg carton is far wider than a cone.
    // The turntable spins, so the diagonal is what has to fit, not the width.
    const bounds = new THREE.Box3().setFromObject(this.dessert);
    const size = bounds.getSize(new THREE.Vector3());
    this.halfWidth = Math.hypot(size.x, size.z) / 2;

    this.popTime = 0;
    this.dirty = true;
    this.frameCamera();
  }

  /** The ta-da: spin, glow, sparkle. Calmed right down under reduced motion. */
  celebrate(seed = 1): void {
    if (this.disposed) return;
    this.serveTime = 0;
    this.dirty = true;
    if (this.reducedMotion) return;
    this.spinVelocity = 7.5;
    this.sparkles.fire(new THREE.Vector3(0, this.crownY * 0.86, 0), hashString(String(seed)) % 9999);
  }

  dispose(): void {
    this.disposed = true;
    this.stop();
    this.resizeObserver.disconnect();
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.canvas.removeEventListener("pointermove", this.onPointerMove);
    this.canvas.removeEventListener("pointerup", this.onPointerUp);
    this.canvas.removeEventListener("pointercancel", this.onPointerUp);
    document.removeEventListener("visibilitychange", this.onVisibilityChange);
    this.motionQuery.removeEventListener("change", this.onMotionPreferenceChange);

    disposeObject(this.scene);
    // The two backdrop meshes own their materials directly; everything else is
    // either in the shared cache or owned by the sparkle burst.
    (this.contactShadow.material as THREE.Material).dispose();
    (this.glow.material as THREE.Material).dispose();
    this.sparkles.dispose();
    // The environment map lives in a render target; disposing the texture alone
    // leaves the target's GL memory behind.
    this.environmentTarget.dispose();
    this.keyLight.shadow.dispose();
    disposeMaterialCache();
    disposeTextureCache();
    this.renderer.dispose();
  }

  private onMotionPreferenceChange = (event: MediaQueryListEvent) => {
    this.reducedMotion = event.matches;
    this.dirty = true;
  };

  /** Idempotent: never leaves two render loops running at once. */
  private start(): void {
    if (this.frame !== 0 || this.disposed || document.hidden) return;
    this.frame = requestAnimationFrame(this.tick);
  }

  private stop(): void {
    if (this.frame === 0) return;
    cancelAnimationFrame(this.frame);
    this.frame = 0;
  }

  private onVisibilityChange = () => {
    if (document.hidden) this.stop();
    else this.start();
  };

  private onPointerDown = (event: PointerEvent) => {
    this.dragging = true;
    this.lastPointerX = event.clientX;
    this.canvas.setPointerCapture(event.pointerId);
  };

  private onPointerMove = (event: PointerEvent) => {
    if (!this.dragging) return;
    const delta = event.clientX - this.lastPointerX;
    this.lastPointerX = event.clientX;
    this.spin += delta * 0.01;
    this.spinVelocity = delta * 0.25;
    this.dirty = true;
  };

  private onPointerUp = (event: PointerEvent) => {
    this.dragging = false;
    if (this.canvas.hasPointerCapture(event.pointerId)) this.canvas.releasePointerCapture(event.pointerId);
  };

  /** Pulls the camera back on narrow screens so the whole cone always fits. */
  private frameCamera(): void {
    const aspect = this.camera.aspect || 1;
    const target = this.crownY * 0.52;
    const halfHeight = this.crownY * 0.6;
    const halfWidth = Math.max(this.halfWidth, 0.8);

    // Fit the dessert to whichever axis is tighter, then leave a little air.
    const vFov = (this.camera.fov * Math.PI) / 180;
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
    const distance = Math.max(halfHeight / Math.tan(vFov / 2), halfWidth / Math.tan(hFov / 2)) * 1.22;

    this.camera.position.set(0, target + distance * 0.1, distance);
    this.camera.lookAt(0, target, 0);
  }

  private resize = () => {
    const width = this.canvas.clientWidth || 1;
    const height = this.canvas.clientHeight || 1;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.frameCamera();
    this.dirty = true;
  };

  private tick = (timestamp: number) => {
    if (this.disposed) {
      this.frame = 0;
      return;
    }
    this.frame = requestAnimationFrame(this.tick);

    this.timer.update(timestamp);
    const delta = Math.min(this.timer.getDelta(), 0.05);
    const elapsed = this.timer.getElapsed();

    if (!this.dragging) {
      this.spin += (this.reducedMotion ? 0 : 0.22) * delta + this.spinVelocity * delta;
      this.spinVelocity *= Math.pow(0.05, delta);
    }
    this.turntable.rotation.y = this.spin;

    // Pop-in: a springy overshoot whenever the order changes.
    if (this.popTime !== Infinity) {
      if (this.reducedMotion) {
        this.dessert.scale.setScalar(1);
        this.popTime = Infinity;
      } else {
        this.popTime += delta;
        const t = Math.min(this.popTime / 0.5, 1);
        const spring = 1 + Math.sin(t * Math.PI * 1.6) * 0.11 * (1 - t);
        this.dessert.scale.setScalar(t < 1 ? 0.9 + 0.1 * t : 1).multiplyScalar(spring);
        if (t >= 1) {
          this.dessert.scale.setScalar(1);
          this.popTime = Infinity;
        }
      }
    }

    if (!this.reducedMotion) {
      this.dessert.position.y = Math.sin(elapsed * 1.5) * 0.018;
    }

    const glowMaterial = this.glow.material as THREE.MeshBasicMaterial;
    if (this.serveTime !== Infinity) {
      this.serveTime += delta;
      const t = this.serveTime;
      glowMaterial.opacity = this.reducedMotion ? 0 : Math.max(0, 0.85 * Math.exp(-t * 1.05));
      this.glow.scale.setScalar(0.7 + Math.min(t, 2) * 0.5);
      this.keyLight.intensity = this.reducedMotion ? 2.0 : 2.0 + Math.max(0, 2.4 * Math.exp(-t * 1.6));
      if (t > 3) {
        this.serveTime = Infinity;
        glowMaterial.opacity = 0;
        this.keyLight.intensity = 2.0;
      }
    }

    this.glow.position.y = this.crownY * 0.8;
    this.glow.quaternion.copy(this.camera.quaternion);
    this.sparkles.update(delta);

    // With reduced motion the dessert just sits there, so skip the draw entirely
    // once everything has settled - it is the same picture, and this app runs on
    // battery-powered tablets.
    const animating =
      !this.reducedMotion ||
      this.dragging ||
      this.popTime !== Infinity ||
      this.serveTime !== Infinity ||
      Math.abs(this.spinVelocity) > 0.001;
    if (!animating && !this.dirty) return;

    this.dirty = false;
    this.renderer.render(this.scene, this.camera);
  };
}
