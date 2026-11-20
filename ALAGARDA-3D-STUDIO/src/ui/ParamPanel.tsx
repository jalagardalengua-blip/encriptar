import type { ParamDef, ParamValues } from '../engine/procedural/params';
import type { ProceduralGenerator } from '../engine/procedural/types';

interface Props {
  generator: ProceduralGenerator;
  values: ParamValues;
  onChange(key: string, value: unknown): void;
}

const fieldBase = 'rounded-md border border-edge bg-ink px-2 py-1.5 text-sm focus:border-gold focus:outline-none';
const fieldCls = `w-full ${fieldBase}`;

function Control({ def, value, onChange }: { def: ParamDef; value: unknown; onChange(v: unknown): void }) {
  const id = `param-${def.key}`;
  switch (def.type) {
    case 'number':
    case 'integer': {
      const step = def.type === 'number' ? def.step : 1;
      const v = typeof value === 'number' ? value : def.default;
      return (
        <div className="flex items-center gap-2">
          <input id={id} type="range" min={def.min} max={def.max} step={step} value={v}
            onChange={(e) => onChange(Number(e.target.value))} className="h-6 min-w-0 flex-1" />
          <input type="number" min={def.min} max={def.max} step={step} value={v} aria-label={`${def.label} (valor)`}
            onChange={(e) => onChange(Number(e.target.value))} className={`${fieldBase} w-20 flex-none tabular-nums`} />
        </div>
      );
    }
    case 'seed': {
      const v = typeof value === 'number' ? value : def.default;
      return (
        <div className="flex gap-2">
          <input id={id} type="number" min={0} value={v} onChange={(e) => onChange(Number(e.target.value))} className={`${fieldBase} min-w-0 flex-1 tabular-nums`} />
          <button type="button" onClick={() => onChange(Math.floor(Math.random() * 2147483646) + 1)}
            className="flex-none rounded-md border border-edge px-3 text-sm hover:border-gold">Aleatoria</button>
        </div>
      );
    }
    case 'boolean':
      return <input id={id} type="checkbox" checked={value === true} onChange={(e) => onChange(e.target.checked)} className="h-5 w-5 accent-[var(--color-gold)]" />;
    case 'enum':
      return (
        <select id={id} value={String(value)} onChange={(e) => onChange(e.target.value)} className={fieldCls}>
          {def.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      );
    case 'color':
      return (
        <div className="flex items-center gap-2">
          <input id={id} type="color" value={String(value)} onChange={(e) => onChange(e.target.value)} className="h-8 w-12 cursor-pointer rounded border border-edge bg-transparent" />
          <span className="font-mono text-xs text-neutral-400">{String(value)}</span>
        </div>
      );
  }
}

/** Panel generado a partir del esquema de parámetros del generador activo. */
export function ParamPanel({ generator, values, onChange }: Props) {
  const groups = new Map<string, ParamDef[]>();
  for (const p of generator.params) {
    const g = p.group ?? 'General';
    groups.set(g, [...(groups.get(g) ?? []), p]);
  }
  return (
    <div className="space-y-5">
      {[...groups.entries()].map(([group, defs]) => (
        <fieldset key={group} className="min-w-0 space-y-3">
          <legend className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-gold">{group}</legend>
          {defs.map((def) => (
            <div key={def.key} className="space-y-1">
              <label htmlFor={`param-${def.key}`} className="block text-sm text-neutral-300" title={def.description}>{def.label}</label>
              <Control def={def} value={values[def.key]} onChange={(v) => onChange(def.key, v)} />
            </div>
          ))}
        </fieldset>
      ))}
    </div>
  );
}
