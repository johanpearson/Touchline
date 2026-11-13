import {
  BoxGeometry,
  BufferAttribute,
  CanvasTexture,
  Color,
  DirectionalLight,
  DoubleSide,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  WebGLRenderer,
} from "three";
import type { TerrainRenderer, TerrainRendererOptions } from "../terrain/renderer-types";
import { vertexColour } from "../terrain/terrain-colour";
import type { TerrainFrame } from "../terrain/terrain-driver";
import { GRID_X, GRID_Y, PITCH_DEPTH, PITCH_WIDTH, VERTEX_COUNT } from "../terrain/terrain-grid";

const drawPitchLines = (): HTMLCanvasElement => {
  const canvas = document.createElement("canvas");
  canvas.width = 1050;
  canvas.height = 680;
  const c = canvas.getContext("2d");
  if (!c) return canvas;
  c.fillStyle = "#000";
  c.fillRect(0, 0, 1050, 680);
  c.strokeStyle = "#fff";
  c.lineWidth = 4;
  const m = 10;
  c.strokeRect(m, m, 1050 - 2 * m, 680 - 2 * m);
  c.beginPath();
  c.moveTo(525, m);
  c.lineTo(525, 680 - m);
  c.stroke();
  c.beginPath();
  c.arc(525, 340, 91.5, 0, Math.PI * 2);
  c.stroke();
  for (const side of [0, 1]) {
    const x0 = side ? 1050 - m : m;
    const dir = side ? -1 : 1;
    c.strokeRect(Math.min(x0, x0 + dir * 165), 340 - 201.5, 165, 403);
    c.strokeRect(Math.min(x0, x0 + dir * 55), 340 - 91.5, 55, 183);
    c.beginPath();
    c.arc(x0 + dir * 110, 340, 91.5, side ? Math.PI - 0.93 : -0.93, side ? Math.PI + 0.93 : 0.93);
    c.stroke();
  }
  return canvas;
};

/** three.js implementation of the terrain view. Rendering is verified by eye, not by unit tests. */
export const createThreeRenderer = (
  host: HTMLElement,
  { homeColour, awayColour, reducedMotion }: TerrainRendererOptions,
): TerrainRenderer => {
  const renderer = new WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const canvas = renderer.domElement;
  canvas.style.display = "block";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  host.prepend(canvas);

  const scene = new Scene();
  const camera = new PerspectiveCamera(38, 1, 0.1, 100);

  const texture = new CanvasTexture(drawPitchLines());
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const geometry = new PlaneGeometry(PITCH_WIDTH, PITCH_DEPTH, GRID_X, GRID_Y);
  geometry.rotateX(-Math.PI / 2);
  geometry.setAttribute("color", new BufferAttribute(new Float32Array(VERTEX_COUNT * 3), 3));
  const material = new MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.55,
    metalness: 0,
    emissive: 0xffffff,
    emissiveMap: texture,
    emissiveIntensity: 0.55,
    side: DoubleSide,
  });
  scene.add(new Mesh(geometry, material));

  const slabGeometry = new BoxGeometry(PITCH_WIDTH * 1.02, 0.25, PITCH_DEPTH * 1.04);
  const slabMaterial = new MeshStandardMaterial({ color: 0x0c0610, roughness: 0.9 });
  const slab = new Mesh(slabGeometry, slabMaterial);
  slab.position.y = -0.2;
  scene.add(slab);

  const stripGeometry = new BoxGeometry(0.1, 0.3, PITCH_DEPTH * 1.04);
  const stripMaterials = [new MeshBasicMaterial(), new MeshBasicMaterial()];
  const home = new Color(homeColour);
  const away = new Color(awayColour);
  stripMaterials[0]?.color.copy(home);
  stripMaterials[1]?.color.copy(away);
  stripMaterials.forEach((strip, index) => {
    const mesh = new Mesh(stripGeometry, strip);
    mesh.position.set((index === 0 ? -1 : 1) * PITCH_WIDTH * 0.515, -0.15, 0);
    scene.add(mesh);
  });

  const sun = new DirectionalLight(0xffffff, 0.9);
  sun.position.set(-4, 9, 6);
  scene.add(new HemisphereLight(0xffeef6, 0x1a0a14, 0.75), sun);

  let theta = -0.42;
  let radius = 11.5;
  let dragging = false;
  let lastX = 0;
  const onDown = (event: PointerEvent) => {
    dragging = true;
    lastX = event.clientX;
    canvas.setPointerCapture(event.pointerId);
  };
  const onMove = (event: PointerEvent) => {
    if (!dragging) return;
    theta -= (event.clientX - lastX) * 0.006;
    lastX = event.clientX;
  };
  const onUp = () => {
    dragging = false;
  };
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);

  const position = geometry.attributes.position as BufferAttribute;
  const colour = geometry.attributes.color as BufferAttribute;
  const homeRgb = { r: home.r, g: home.g, b: home.b };
  const awayRgb = { r: away.r, g: away.g, b: away.b };

  return {
    resize: (width, height) => {
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      radius = camera.aspect < 1.2 ? 14.5 : 11.5;
    },
    render: (frame: TerrainFrame) => {
      for (let i = 0; i < VERTEX_COUNT; i++) {
        const height = frame.height[i] as number;
        position.setY(i, height);
        const rgb = vertexColour(homeRgb, awayRgb, frame.awayShare[i] as number, height);
        colour.setXYZ(i, rgb.r, rgb.g, rgb.b);
      }
      position.needsUpdate = true;
      colour.needsUpdate = true;
      geometry.computeVertexNormals();

      const sway = reducedMotion || dragging ? 0 : Math.sin(frame.time * 0.15) * 0.06;
      const angle = theta + sway;
      camera.position.set(Math.sin(angle) * radius, radius * 0.62, Math.cos(angle) * radius);
      if (frame.shake > 0) {
        const amount = frame.shake * 0.35;
        camera.position.x += (Math.random() - 0.5) * amount;
        camera.position.y += (Math.random() - 0.5) * amount;
      }
      camera.lookAt(0, 0.4, 0);
      renderer.render(scene, camera);
    },
    dispose: () => {
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      geometry.dispose();
      material.dispose();
      texture.dispose();
      slabGeometry.dispose();
      slabMaterial.dispose();
      stripGeometry.dispose();
      for (const strip of stripMaterials) strip.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
};
