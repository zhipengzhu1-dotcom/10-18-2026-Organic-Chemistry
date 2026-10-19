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

  return (
    <div className="scene-control" style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "0.75rem" }}>
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
        onChange={(e) => onChange(read(e.target.value))}
        style={{ flex: 1, minHeight: 44 }}
      />
      <span aria-hidden="true" style={{ fontFamily: "var(--at-font-data, 'JetBrains Mono', ui-monospace, monospace)", minWidth: "4ch" }}>
        {range.text}
      </span>
    </div>
  );
}
