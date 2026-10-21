// The Blender renders (#69): the studio matcap and the two share images. Node only.
//
// Blender sees the course only through a props file built here from the cited-data lookup
// (geometry, Jmol colours, Bondi radii, the Unit's title) and the design tokens; the import
// script (molecule_import.py) builds every atom and bond from it, so nothing is placed by hand.
// The render command records the sha256 of every file Blender read and of each output in
// pipelines/blender/renders/<name>.json, so CI flags a stale render without Blender
// (renders aren't byte-identical across machines; the inputs are).
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildContent, type CourseModel, type Subject } from "@astratron/content";
import { centroid, project, viewMatrix, type Matrix3, type Vec3, type ViewSpec } from "@astratron/content/molecule";
import { DEFAULT_VIEW } from "../../content/src/molecule-use.ts";
import { videoPalette } from "../../scenes/src/manim/pipeline.ts";
import { BALL } from "../../site/src/molecule/layout.ts";
import { SHARE_IMAGES } from "../../site/src/lib/share-images.ts";

export const repoRoot = fileURLToPath(new URL("../../", import.meta.url));
/** Blender 5.2.2 LTS at /Applications/Blender.app (not on PATH). */
export const BLENDER_VERSION = "5.2.2";
export const BLENDER = "/Applications/Blender.app/Contents/MacOS/Blender";
const dir = "pipelines/blender";

export type RenderName = "matcap" | "share-site" | "share-unit-1";
export const RENDER_NAMES: RenderName[] = ["matcap", "share-site", "share-unit-1"];

/**
 * Fonts the share images set text in (OFL; licences next to each file): the site's faces, each for
 * its job. Kaushan Script for the wordmark only; Patrick Hand for headings; JetBrains Mono for numbers.
 */
const FONTS = {
  script: `${dir}/fonts/KaushanScript-Regular.ttf`,
  hand: "scenes/manim/fonts/PatrickHand-Regular.ttf",
  data: "scenes/manim/fonts/JetBrainsMono-wght.ttf",
};

/** The site's ruled paper in image px: a faint blue rule every `rule` px, the pink margin line at `margin` px. */
const PAPER = { rule: 32, margin: 64 };

/** One hand-drawn doodle (the Manim Scenes' own, scenes/manim/doodles/) on the ground: centre and height in px. */
export interface PropsDoodle {
  path: string;
  x: number;
  y: number;
  height: number;
  /** Degrees, counter-clockwise. */
  angle: number;
}

const doodle = (name: string, x: number, y: number, height: number, angle = 0): PropsDoodle => ({
  path: `scenes/manim/doodles/${name}.svg`,
  x,
  y,
  height,
  angle,
});

export interface PropsAtom {
  element: string;
  /** Å in the image's frame: x right, y up, z toward the viewer; (0, 0) is the image centre. */
  x: number;
  y: number;
  z: number;
}

export interface PropsMolecule {
  id: string;
  atoms: PropsAtom[];
  bonds: { a: number; b: number; order: 1 | 2 | 3 }[];
  /** Cited Jmol colour, and the ball-and-stick radius (Bondi van der Waals radius × BALL), in Å. */
  elements: Record<string, { colour: string; radius: number }>;
  /** Data frame → image frame: image = rotation · (data − centre) + offset. Meshes in the data frame use it. */
  frame: { rotation: Matrix3; centre: Vec3; offset: Vec3 };
}

export interface PropsText {
  text: string;
  font: keyof typeof FONTS;
  /** Cap-to-baseline em size in px; x, y the left baseline point in px from the top left. */
  size: number;
  x: number;
  y: number;
  colour: string;
}

export interface BlenderProps {
  render: RenderName;
  width: number;
  height: number;
  /** Orthographic: px per Å. */
  scale: number;
  samples: number;
  seed: number;
  palette: Record<string, string>;
  fonts: typeof FONTS;
  paper: typeof PAPER;
  doodles: PropsDoodle[];
  molecules: PropsMolecule[];
  /**
   * Orbital meshes (glb from the orbital pipeline, #70, in Å in the molecule's data frame; a node
   * named `hatched` is the second phase), drawn translucent over that molecule. None yet.
   */
  meshes: { path: string; molecule: string; colour: string }[];
  text: PropsText[];
}

/** Where each molecule of an image sits: its data id, start view and centre in px. */
interface Placement {
  id: string;
  view: ViewSpec;
  at: [number, number];
}

interface ShareLayout {
  scale: number;
  molecules: Placement[];
  doodles: PropsDoodle[];
  text: (subject: Subject, palette: Record<string, string>) => PropsText[];
}

const unit1 = (s: Subject) => s.courses[0].units.find((u) => u.id === "u1")!;

const LAYOUTS: Record<Exclude<RenderName, "matcap">, ShareLayout> = {
  // The Push hero's product (OH⁻ + H⁺ → water, #73), right of the wordmark; doodles in the free corners.
  "share-site": {
    scale: 190,
    molecules: [{ id: "water", view: { plane: [1, 0, 2], rotate: [0, -25, 90] }, at: [890, 330] }],
    doodles: [doodle("sprig", 1115, 120, 190, -12), doodle("benzene", 560, 112, 92, 8), doodle("flask", 180, 522, 136, -6), doodle("beaker", 1105, 540, 112, 6)],
    text: (_, p) => [
      { text: "AstraTron", font: "script", size: 112, x: 96, y: 300, colour: p["at-ink"] },
      { text: "Come build.", font: "hand", size: 64, x: 104, y: 392, colour: p["at-blue"] },
    ],
  },
  // Unit 1: sp³, sp² and sp carbon side by side under the Unit's name.
  "share-unit-1": {
    scale: 92,
    molecules: [
      { id: "methane", view: { rotate: [20, 30, 0] }, at: [230, 462] },
      { id: "ethylene", view: DEFAULT_VIEW, at: [600, 462] },
      { id: "acetylene", view: DEFAULT_VIEW, at: [970, 462] },
    ],
    doodles: [doodle("tubes", 905, 118, 104, -5), doodle("atom", 1090, 170, 150, 10)],
    text: (s, p) => [
      { text: "AstraTron", font: "script", size: 56, x: 96, y: 92, colour: p["at-ink"] },
      { text: `Unit ${unit1(s).number}`, font: "data", size: 44, x: 96, y: 178, colour: p["at-blue"] },
      { text: unit1(s).title, font: "hand", size: 84, x: 94, y: 266, colour: p["at-ink"] },
    ],
  },
};

const round = (n: number) => Math.round(n * 1e6) / 1e6;

function organic(model: CourseModel): Subject {
  const subject = model.subjects.find((s) => s.slug === "organic");
  if (!subject) throw new Error("no organic Subject in the content");
  return subject;
}

function placeMolecule(subject: Subject, p: Placement, layout: ShareLayout, width: number, height: number): PropsMolecule {
  const set = subject.data[p.id];
  if (!set?.atoms || !set.bonds) throw new Error(`share image: "${p.id}" is not a molecule data file with atoms and bonds`);
  const atoms = set.atoms.list;
  const rotation = viewMatrix(atoms, p.view);
  const screen = project(atoms, rotation);
  const [dx, dy] = [(p.at[0] - width / 2) / layout.scale, (height / 2 - p.at[1]) / layout.scale];
  const elements: PropsMolecule["elements"] = {};
  for (const el of new Set(atoms.map((a) => a.element))) {
    const colour = subject.data.elements?.values[`${el}.colour`];
    const vdw = subject.data.elements?.values[`${el}.vdw`];
    if (!colour || !vdw) throw new Error(`share image: no cited colour or van der Waals radius for ${el}`);
    elements[el] = { colour: String(colour.value), radius: round(Number(vdw.value) * BALL) };
  }
  return {
    id: p.id,
    atoms: screen.map(([x, y, z], i) => ({ element: atoms[i].element, x: round(x + dx), y: round(y + dy), z: round(z) })),
    bonds: set.bonds.map((b) => ({ a: b.a, b: b.b, order: b.order })),
    elements,
    frame: {
      rotation: rotation.map((row) => row.map(round)) as Matrix3,
      centre: centroid(atoms).map(round) as Vec3,
      offset: [round(dx), round(dy), 0],
    },
  };
}

let cached: { root: string; model: CourseModel } | undefined;
function model(root: string): CourseModel {
  if (cached?.root === root) return cached.model;
  const { model, errors } = buildContent(join(root, "content/subjects"));
  if (!model) throw new Error(`content build failed:\n${errors.join("\n")}`);
  cached = { root, model };
  return model;
}

/** Everything Blender is told about one share image, from the cited data and the tokens. */
export function blenderProps(name: Exclude<RenderName, "matcap">, root = repoRoot): BlenderProps {
  const layout = LAYOUTS[name];
  const subject = organic(model(root));
  const palette = videoPalette(root);
  const { width, height } = SHARE_IMAGES[name === "share-site" ? "site" : "unit-1"];
  return {
    render: name,
    width,
    height,
    scale: layout.scale,
    samples: 256,
    seed: 69,
    palette,
    fonts: FONTS,
    paper: PAPER,
    doodles: layout.doodles,
    molecules: layout.molecules.map((p) => placeMolecule(subject, p, layout, width, height)),
    meshes: [],
    text: layout.text(subject, palette),
  };
}

/** The props file the import script reads (committed, so a reviewer sees what Blender saw). */
export const propsPath = (name: RenderName) => `${dir}/renders/${name}.props.json`;
export const recordPath = (name: RenderName) => `${dir}/renders/${name}.json`;
export const propsText = (props: BlenderProps) => `${JSON.stringify(props, null, 2)}\n`;

/** The script Blender runs and the files it writes, repo-relative. */
export function renderPlan(name: RenderName): { script: string; outputs: string[] } {
  if (name === "matcap") return { script: `${dir}/make_matcap.py`, outputs: ["site/public/matcaps/studio.webp"] };
  const image = SHARE_IMAGES[name === "share-site" ? "site" : "unit-1"];
  return { script: `${dir}/share_images.py`, outputs: [`site/public${image.path}`] };
}

/** Every file Blender reads for a render, repo-relative. */
export function renderInputs(name: RenderName, root = repoRoot): string[] {
  if (name === "matcap") return [`${dir}/make_matcap.py`];
  const props = blenderProps(name, root);
  const doodles = [...new Set(props.doodles.map((d) => d.path))].sort();
  return [`${dir}/share_images.py`, `${dir}/molecule_import.py`, ...Object.values(FONTS), ...doodles, ...props.meshes.map((m) => m.path), propsPath(name)];
}

export const sha256 = (path: string) => createHash("sha256").update(readFileSync(path)).digest("hex");

/** What the render command commits next to the scripts. */
export interface RenderRecord {
  render: RenderName;
  blender: string;
  inputs: Record<string, string>;
  outputs: Record<string, string>;
}

export function renderRecord(name: RenderName, blender: string, root = repoRoot): RenderRecord {
  const hashes = (paths: string[]) => Object.fromEntries(paths.map((p) => [p, sha256(join(root, p))]));
  return { render: name, blender, inputs: hashes(renderInputs(name, root)), outputs: hashes(renderPlan(name).outputs) };
}

/** Messages for every render that is missing, or older than its inputs; empty when all are current. */
export function checkBlenderRenders(root = repoRoot): string[] {
  const errors: string[] = [];
  for (const name of RENDER_NAMES) {
    const at = (message: string) => errors.push(`${name}: ${message}; run \`pnpm blender render ${name}\``);
    const file = join(root, recordPath(name));
    if (!existsSync(file)) {
      at(`${recordPath(name)} is missing`);
      continue;
    }
    const record = JSON.parse(readFileSync(file, "utf8")) as RenderRecord;
    if (!record.blender.startsWith(BLENDER_VERSION)) at(`it was rendered with Blender ${record.blender}, not ${BLENDER_VERSION}`);
    if (name !== "matcap") {
      const committed = existsSync(join(root, propsPath(name))) ? readFileSync(join(root, propsPath(name)), "utf8") : "";
      if (committed !== propsText(blenderProps(name, root)))
        at(`its props (cited data, tokens or layout) changed since the committed render (${propsPath(name)})`);
    }
    const expected = renderInputs(name, root);
    const recorded = Object.keys(record.inputs);
    if (expected.join("\n") !== recorded.join("\n")) at(`its inputs are now ${expected.join(", ")}, not the recorded ${recorded.join(", ")}`);
    for (const [path, hash] of Object.entries(record.inputs)) {
      if (path === propsPath(name)) continue; // checked against the cited data above
      if (!existsSync(join(root, path)) || sha256(join(root, path)) !== hash) at(`${path} changed since the committed render`);
    }
    for (const [path, hash] of Object.entries(record.outputs))
      if (!existsSync(join(root, path)) || sha256(join(root, path)) !== hash) at(`${path} is not the recorded render`);
  }
  return errors;
}

/** Width and height of a WebP file (lossy VP8, lossless VP8L or extended VP8X). */
export function webpSize(buf: Buffer): { width: number; height: number } | undefined {
  if (buf.length < 30 || buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WEBP") return undefined;
  const chunk = buf.toString("ascii", 12, 16);
  if (chunk === "VP8X") return { width: 1 + buf.readUIntLE(24, 3), height: 1 + buf.readUIntLE(27, 3) };
  if (chunk === "VP8 ") return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
  if (chunk === "VP8L") {
    const bits = buf.readUInt32LE(21);
    return { width: 1 + (bits & 0x3fff), height: 1 + ((bits >> 14) & 0x3fff) };
  }
  return undefined;
}
