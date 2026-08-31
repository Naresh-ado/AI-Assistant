import React from "react";
import { CHARACTERS } from "@/lib/companions";

export default function CompanionChoice({ value, onChange }) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-xs font-bold uppercase tracking-widest text-zinc-400">Choose your 3D academic companion</legend>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {Object.values(CHARACTERS).map((item) => {
          const selected = value === item.id;
          return (
            <button
              type="button"
              key={item.id}
              onClick={() => onChange(item.id)}
              className={`rounded-2xl border p-4 text-left transition duration-150 flex flex-col justify-between ${
                selected
                  ? "bg-zinc-900 border-white text-white shadow-md ring-1 ring-white/30"
                  : "bg-zinc-950 border-white/15 text-zinc-300 hover:border-white/40 hover:bg-zinc-900/60"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-base text-white">{item.name}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold border ${
                  item.gender === 'male' 
                    ? 'bg-blue-950/60 text-blue-300 border-blue-500/30' 
                    : 'bg-purple-950/60 text-purple-300 border-purple-500/30'
                }`}>
                  {item.gender === 'male' ? 'Boy (Male Voice)' : 'Girl (Female Voice)'}
                </span>
              </div>
              <p className="mt-1 text-xs text-zinc-400 font-medium">{item.tagline}</p>
              <p className="mt-2 text-[11px] text-zinc-500 line-clamp-2">{item.description}</p>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}