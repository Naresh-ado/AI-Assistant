import React from "react";

export default function ChoiceGroup({ label, value, options, onChange }) {
  return (
    <fieldset className="space-y-2.5">
      <legend className="text-xs font-bold uppercase tracking-widest text-zinc-400">{label}</legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {options.map((option) => (
          <button
            type="button"
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`rounded-2xl border px-3 py-2.5 text-xs font-semibold transition ${
              value === option.value
                ? "border-white bg-zinc-900 text-white shadow-md ring-1 ring-white/20"
                : "border-white/15 bg-zinc-950 text-zinc-400 hover:border-white/40 hover:text-white"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}