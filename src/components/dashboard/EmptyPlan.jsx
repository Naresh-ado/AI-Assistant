import React from "react";
import { Route, UploadCloud } from "lucide-react";

export default function EmptyPlan() {
  return <section className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-7"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-900"><Route /></div><h2 className="mt-5 text-xl font-semibold text-slate-950">Your first adaptive plan starts here</h2><p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">Your learning baseline is ready. Course-plan upload and topic-range planning are the next implementation phase.</p><div className="mt-5 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-xs font-medium text-slate-500"><UploadCloud className="h-4 w-4" /> Course analysis coming next</div></section>;
}