// Computed orbital lobes (#70) inside the 3D card's canvas: part of the lazy three.js chunk, so the
// GLB loader and every mesh load only when a Step shows orbitals. Each orbital's GLB (written by
// pipelines/orbitals, already gated for closed surfaces, counter-clockwise winding and outward
// normals) holds one node per sign, "plus-solid" and "minus-hatched", in Å in the molecule file's frame.
//
// Drawn translucent after the atoms: transparent, no depth writes and a higher renderOrder, so every
// atom shows through. Front faces only (the winding gate is what makes that safe). The sign is
// never colour alone: the minus lobe is hatched (diagonal screen-space stripes), and the card's
// overlay labels each sign.
import { useLoader, useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { Color, FrontSide, Mesh, ShaderMaterial, type BufferGeometry, type Matrix4 } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { OrbitalUse } from "@astratron/content";
import { token } from "./token.ts";

/** Lobes draw after the atoms (renderOrder 0). */
export const LOBE_RENDER_ORDER = 10;
/** How opaque a solid lobe's fill is; hatched stripes alternate between this and a fifth of it. */
const OPACITY = 0.5;
/** How edge-on (1 − |n·v|) the surface is where its pen line starts. */
const PEN_FROM = 0.8;

/** Lesson 4: colour says the orbital's kind and the pattern its sign. Lesson 8: + solid blue, − hatched orange. */
export function lobeLook(style: OrbitalUse["style"], sign: "+" | "-", density = false): { colour: "electron" | "ignite"; hatched: boolean } {
  const hatched = sign === "-" && !density;
  if (style === "sigma") return { colour: "ignite", hatched };
  if (style === "pi") return { colour: "electron", hatched };
  return { colour: sign === "+" ? "electron" : "ignite", hatched };
}

const vertex = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;
// On paper (#122) a lobe is a marker fill inside a pen line: the flat fill colour, see-through over
// the atoms, and where the surface turns edge-on (its outline on screen) the pen ink, nearly opaque.
// The pen line is solid on hatched lobes too, so both signs keep an outline.
const fragment = /* glsl */ `
  uniform vec3 colour;
  uniform vec3 pen;
  uniform float opacity;
  uniform float hatched;
  uniform float stripe;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    float edge = 1.0 - abs(dot(normalize(vNormal), normalize(vView)));
    float a = opacity;
    if (hatched > 0.5 && mod(gl_FragCoord.x + gl_FragCoord.y, 2.0 * stripe) < stripe) a *= 0.2;
    float line = smoothstep(${PEN_FROM.toFixed(2)}, ${(PEN_FROM + 0.06).toFixed(2)}, edge);
    gl_FragColor = vec4(mix(colour, pen, line), mix(a, 0.95, line));
    // three.js hands colours over in linear space; back to sRGB so the fill is the token's colour.
    #include <colorspace_fragment>
  }
`;

function lobeMaterial(colour: string, pen: string, hatched: boolean): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      colour: { value: new Color(colour) },
      pen: { value: new Color(pen) },
      opacity: { value: OPACITY },
      hatched: { value: hatched ? 1 : 0 },
      stripe: { value: 4 * (typeof window === "undefined" ? 1 : Math.min(2, window.devicePixelRatio || 1)) },
    },
    vertexShader: vertex,
    fragmentShader: fragment,
    transparent: true,
    depthWrite: false,
    side: FrontSide,
  });
}

interface Lobe {
  key: string;
  geometry: BufferGeometry;
  matrix: Matrix4;
  material: ShaderMaterial;
}

export interface OrbitalLobesProps {
  orbitals: OrbitalUse[];
  /** The molecule's centre (Å, file frame): the canvas draws atoms about it, so the lobes shift by it too. */
  centre: [number, number, number];
  /** Called once every mesh is in the scene. */
  onDrawn?: () => void;
}

export default function OrbitalLobes({ orbitals, centre, onDrawn }: OrbitalLobesProps) {
  const gltfs = useLoader(GLTFLoader, orbitals.map((o) => o.mesh));
  const lobes = useMemo(() => {
    const fills = { electron: token("--at-blue-fill", "#4dabff"), ignite: token("--at-orange-fill", "#ff9548") };
    const pens = { electron: token("--at-blue", "#0a64c2"), ignite: token("--at-orange", "#a94a00") };
    const out: Lobe[] = [];
    orbitals.forEach((o, i) => {
      gltfs[i].scene.updateMatrixWorld(true);
      gltfs[i].scene.traverse((node) => {
        if (!(node instanceof Mesh)) return;
        const name = node.name || node.parent?.name || "";
        const sign = name.startsWith("minus") ? "-" : "+";
        const look = lobeLook(o.style, sign, o.density);
        out.push({ key: `${o.ref}:${name}`, geometry: node.geometry, matrix: node.matrixWorld.clone(), material: lobeMaterial(fills[look.colour], pens[look.colour], look.hatched) });
      });
    });
    return out;
  }, [orbitals, gltfs]);

  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    invalidate();
    onDrawn?.();
    return () => lobes.forEach((l) => l.material.dispose());
  }, [lobes, onDrawn, invalidate]);

  return (
    <group position={[-centre[0], -centre[1], -centre[2]]}>
      {lobes.map((l) => (
        <mesh key={l.key} geometry={l.geometry} material={l.material} matrix={l.matrix} matrixAutoUpdate={false} renderOrder={LOBE_RENDER_ORDER} />
      ))}
    </group>
  );
}
