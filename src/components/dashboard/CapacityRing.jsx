import React from "react";

export default function CapacityRing({ hours, focus }) {
  const sessions = Math.max(1, Math.floor((hours * 60) / (focus + 10)));
  return (
    <div className="rounded-3xl border border-white/15 bg-zinc-950 p-6 text-white shadow-sm">
      <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Your study capacity</p>
      <div className="mt-5 flex items-end gap-2">
        <span className="text-5xl font-bold tracking-tight text-white">{hours}</span>
        <span className="pb-1 text-sm text-zinc-400 font-medium">hours / day</span>
      </div>
      <div className="mt-6 h-2 overflow-hidden rounded-full bg-zinc-800 border border-white/10">
        <div 
          className="h-full rounded-full bg-white transition-all duration-300" 
          style={{ width: `${Math.min(100, (hours / 8) * 100)}%` }} 
        />
      </div>
      <p className="mt-4 text-xs leading-5 text-zinc-400">
        Supports about <strong className="text-white">{sessions} focused sessions</strong> of {focus}m, with recovery breaks included.
      </p>
    </div>
  );
}