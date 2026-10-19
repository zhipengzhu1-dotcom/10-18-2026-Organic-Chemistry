// The WebGL layer of the 3D card: three.js + React-Three-Fiber, loaded lazily so three.js stays out
// of a Lesson's first-load JS. It only draws: atoms (studio matcap tinted with the cited Jmol colour)
// and bond sticks, in the rotation and scale the card hands it. Letters, picks, measurements and
// taps live in the card's SVG overlay, which uses the same orthographic projection.
//
// Renders on demand (frameloop "demand"): a frame is drawn when props change, never on a loop.
import { Canvas, useLoader, useThree } from "@react-three/fiber";
import { lazy, Suspense, useEffect, useMemo, type ReactNode } from "react";
import {
  CylinderGeometry,
  Matrix4,
  MeshMatcapMaterial,
  Quaternion,
  SphereGeometry,
  SRGBColorSpace,
  TextureLoader,
  Vector3,
} from "three";
import type { MoleculeUse } from "@astratron/content";
import { centroid, type Matrix3 } from "@astratron/content/molecule";
import { radius } from "./layout.ts";

// Only a Step that shows orbitals fetches the GLB loader and its meshes (#70).
const OrbitalLobes = lazy(() => import("./OrbitalLobes.tsx"));

export interface MoleculeCanvasProps {
  molecule: MoleculeUse;
  rotation: Matrix3;
  /** Pixels per Å. */
  scale: number;
  trueScale: boolean;
  /** Extra three.js objects drawn in the molecule's frame (Å, centred on the molecule). */
  children?: ReactNode;
  /** Called once the molecule's computed orbitals (molecule.orbitals, #70) are drawn. */
  onOrbitalsDrawn?: () => void;
}

/** The studio matcap (Blender, #69); tinted per element. */
export const MATCAP_URL = "/matcaps/studio.webp";
/** Bond stick radius in Å: a drawing size, not a chemistry value. */
const STICK = 0.11;

const sphere = new SphereGeometry(1, 40, 28);
const stick = new CylinderGeometry(1, 1, 1, 20);
const yAxis = new Vector3(0, 1, 0);

export default function MoleculeCanvas(props: MoleculeCanvasProps) {
  return (
    <Canvas
      orthographic
      frameloop="demand"
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      camera={{ position: [0, 0, 50], near: 0.1, far: 100, zoom: props.scale }}
      aria-hidden="true"
      style={{ position: "absolute", inset: 0 }}
    >
      <Suspense fallback={null}>
        <Molecule {...props} />
      </Suspense>
    </Canvas>
  );
}

function Molecule({ molecule, rotation, scale, trueScale, children, onOrbitalsDrawn }: MoleculeCanvasProps) {
  const matcap = useLoader(TextureLoader, MATCAP_URL);
  matcap.colorSpace = SRGBColorSpace;
  const { camera, invalidate } = useThree();

  const materials = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(molecule.elements).map(([el, style]) => [el, new MeshMatcapMaterial({ color: style.colour, matcap })]),
      ),
    [molecule, matcap],
  );
  const bondMaterial = useMemo(() => new MeshMatcapMaterial({ color: "#c8c8d0", matcap }), [matcap]);

  // Atom positions about the molecule's centre (Å), and each bond's stick placement.
  const centre = useMemo(() => centroid(molecule.atoms), [molecule]);
  const at = (i: number) => {
    const a = molecule.atoms[i];
    return new Vector3(a.x - centre[0], a.y - centre[1], a.z - centre[2]);
  };
  const bonds = useMemo(
    () =>
      molecule.bonds.flatMap((b) => {
        const [p, q] = [at(b.a), at(b.b)];
        const dir = q.clone().sub(p);
        const length = dir.length();
        dir.normalize();
        // A double bond is two sticks, a triple three, side by side across a neighbour's plane.
        const across = sideways(molecule, b.a, b.b, at).multiplyScalar(STICK * 2.4);
        const shifts = b.order === 1 ? [0] : b.order === 2 ? [-0.5, 0.5] : [-1, 0, 1];
        const width = b.order === 1 ? STICK : STICK * 0.6;
        return shifts.map((s) => ({
          position: p.clone().add(q).multiplyScalar(0.5).add(across.clone().multiplyScalar(s)),
          quaternion: new Quaternion().setFromUnitVectors(yAxis, dir),
          scale: new Vector3(width, length, width),
        }));
      }),
    [molecule, centre],
  );

  // The card's rotation (rows = screen axes in the molecule's frame) is the group's matrix.
  const matrix = useMemo(() => {
    const [r0, r1, r2] = rotation;
    return new Matrix4().set(r0[0], r0[1], r0[2], 0, r1[0], r1[1], r1[2], 0, r2[0], r2[1], r2[2], 0, 0, 0, 0, 1);
  }, [rotation]);

  useEffect(() => {
    camera.zoom = scale;
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, scale, invalidate]);
  useEffect(() => invalidate(), [matrix, trueScale, invalidate]);

  return (
    <group matrix={matrix} matrixAutoUpdate={false}>
      {molecule.atoms.map((a, i) => (
        <mesh key={i} geometry={sphere} material={materials[a.element]} position={at(i)} scale={radius(molecule, a.element, trueScale)} />
      ))}
      {!trueScale &&
        bonds.map((b, i) => (
          <mesh key={`b${i}`} geometry={stick} material={bondMaterial} position={b.position} quaternion={b.quaternion} scale={b.scale} />
        ))}
      {molecule.orbitals?.length ? (
        // Its own Suspense: the atoms show while the meshes load.
        <Suspense fallback={null}>
          <OrbitalLobes orbitals={molecule.orbitals} centre={centre} onDrawn={onOrbitalsDrawn} />
        </Suspense>
      ) : null}
      {children}
    </group>
  );
}

/** A unit vector across the bond, in the plane of a neighbouring atom, so multiple bonds read flat. */
function sideways(m: MoleculeUse, a: number, b: number, at: (i: number) => Vector3): Vector3 {
  const axis = at(b).sub(at(a)).normalize();
  const neighbour = m.bonds
    .flatMap((x) => [
      [x.a, x.b],
      [x.b, x.a],
    ])
    .find(([p, q]) => (p === a && q !== b) || (p === b && q !== a))?.[1];
  const ref = neighbour !== undefined ? at(neighbour).sub(at(a)) : new Vector3(0, 0, 1);
  const off = ref.sub(axis.clone().multiplyScalar(ref.dot(axis)));
  return off.lengthSq() > 1e-9 ? off.normalize() : new Vector3(1, 0, 0).cross(axis).normalize();
}
