// The Scene purity lint (ADR 0001): no timers, frame hooks, state or effect
// hooks, CSS/SMIL animation, wall clocks, unseeded randomness or Remotion in
// Scene code.
import { describe, expect, it } from "vitest";
import { lintScenePurity, lintSceneDirs } from "../src/purity-lint.ts";

const lint = (text: string) => lintScenePurity([{ path: "scenes/src/x/X.tsx", text }]);

describe("Scene purity lint", () => {
  it("flags timers and frame hooks", () => {
    expect(lint("setTimeout(go, 10);\nconst id = setInterval(go);\nrequestAnimationFrame(go);\nuseFrame(() => {});")).toEqual([
      "scenes/src/x/X.tsx:1: setTimeout: a timer; drive motion from t instead",
      "scenes/src/x/X.tsx:2: setInterval: a timer; drive motion from t instead",
      "scenes/src/x/X.tsx:3: requestAnimationFrame: a timer; drive motion from t instead",
      "scenes/src/x/X.tsx:4: useFrame: a frame hook; drive motion from t instead",
    ]);
  });

  it("flags state and effect hooks, wall clocks and unseeded randomness", () => {
    expect(lint("const [a] = useState(0);\nuseEffect(() => {});\nconst x = Math.random();\nconst now = Date.now();")).toEqual([
      "scenes/src/x/X.tsx:1: useState: state or an effect inside a Scene; take everything from props (t, state)",
      "scenes/src/x/X.tsx:2: useEffect: state or an effect inside a Scene; take everything from props (t, state)",
      "scenes/src/x/X.tsx:3: Math.random: unseeded randomness; use seededRandom(seed)",
      "scenes/src/x/X.tsx:4: Date.now: a wall clock; use t",
    ]);
  });

  it("flags CSS transitions and animations, SMIL and Remotion", () => {
    expect(
      lint(
        'style={{ transition: "opacity 1s" }}\nconst css = "@keyframes spin {}";\n<animate attributeName="r" />\nimport { interpolate } from "remotion";',
      ),
    ).toEqual([
      "scenes/src/x/X.tsx:1: transition: a CSS transition or animation; compute the frame from t",
      "scenes/src/x/X.tsx:2: @keyframes: a CSS transition or animation; compute the frame from t",
      "scenes/src/x/X.tsx:3: <animate: SVG animation; compute the frame from t",
      'scenes/src/x/X.tsx:4: "remotion": Remotion stays in the video module; use the helpers in scenes/src/motion.ts',
    ]);
  });

  it("ignores comments and lines marked `// scene-purity: ok`", () => {
    expect(lint("// setTimeout is banned\n/* Math.random */\nconst ease = transitionCurve; // scene-purity: ok, a name")).toEqual([]);
  });

  it("the real Scene code is clean", () => {
    expect(lintSceneDirs()).toEqual([]);
  });
});
