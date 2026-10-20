// A Manipulate Step's control: a slider under the live Scene that sets one of
// its settable states. A native range input, so pointer (drag or tap),
// keyboard (←/→, Home/End, Page Up/Down) and screen readers all work.
// A choice state slides through its options in order.
import { sceneRegistry, type SceneValue } from "@astratron/scenes";

interface Props {
  sceneId: string;
  /** The settable state the slider drives. */
  control: string;
  value: SceneValue;
  onChange: (value: SceneValue) => void;
  locked: boolean;
}

export default function SceneControl({ sceneId, control, value, onChange, locked }: Props) {
  const spec = sceneRegistry[sceneId].manifest.states[control];
  const range =
    spec.kind === "range"
      ? { min: spec.min, max: spec.max, step: spec.step, at: Number(value), text: `${value}${spec.unitSymbol ?? ""}` }
      : {
          min: 0,
          max: spec.options.length - 1,
          step: 1,
          at: Math.max(0, spec.options.findIndex((o) => o.id === value)),
          text: spec.options.find((o) => o.id === value)?.label ?? String(value),
        };
  const read = (raw: string): SceneValue => (spec.kind === "range" ? Number(raw) : spec.options[Number(raw)].id);

  if (spec.kind === "range" && spec.stepper) {
    // − / + buttons (Lesson 8's mo-filler): Tab to a button and press Enter, or press − / + anywhere on the control.
    const at = Number(value);
    const by = (d: number) => {
      const next = Math.min(spec.max, Math.max(spec.min, at + d * spec.step));
      if (!locked && next !== at) onChange(next);
    };
    return (
      <div
        className="scene-control scene-stepper"
        role="group"
        aria-label={spec.label}
        // Read by the dev-only Tutor's stage summary (the range input carries these itself).
        data-min={spec.min}
        data-max={spec.max}
        data-value={at}
        onKeyDown={(e) => {
          if (e.key === "+" || e.key === "=") by(1);
          else if (e.key === "-" || e.key === "−" || e.key === "_") by(-1);
          else return;
          e.preventDefault();
        }}
      >
        <span aria-hidden="true">{spec.label}</span>
        <button type="button" className="scene-btn scene-step" aria-label={`Remove one (${spec.label.toLowerCase()})`} aria-disabled={locked || at <= spec.min} onClick={() => by(-1)}>
          −
        </button>
        <output className="scene-value" aria-hidden="true">
          {range.text}
        </output>
        <button type="button" className="scene-btn scene-step" aria-label={`Add one (${spec.label.toLowerCase()})`} aria-disabled={locked || at >= spec.max} onClick={() => by(1)}>
          +
        </button>
      </div>
    );
  }

  return (
    <div className="scene-control">
      <span aria-hidden="true">{spec.label}</span>
      <input
        type="range"
        min={range.min}
        max={range.max}
        step={range.step}
        value={range.at}
        aria-label={spec.label}
        aria-valuetext={range.text}
        disabled={locked}
        className="scene-range"
        onChange={(e) => onChange(read(e.target.value))}
      />
      <span aria-hidden="true" className="scene-value">
        {range.text}
      </span>
    </div>
  );
}
