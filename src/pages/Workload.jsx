import React, { useEffect, useState } from "react";
import { apiClient as base44 } from "@/api/apiClient";
import { Plus, Trash2, Loader2 } from "lucide-react";

const typeLabel = { assignment: "Assignment", lab: "Lab", project: "Project", report: "Report", presentation: "Presentation", quiz: "Quiz", exam: "Exam" };
const typeColor = { 
  assignment: "bg-zinc-900 text-zinc-200 border-white/20", 
  lab: "bg-zinc-900 text-zinc-200 border-white/20", 
  project: "bg-zinc-900 text-zinc-200 border-white/20", 
  report: "bg-amber-950/40 text-amber-300 border-amber-500/30", 
  presentation: "bg-purple-950/40 text-purple-300 border-purple-500/30", 
  quiz: "bg-blue-950/40 text-blue-300 border-blue-500/30", 
  exam: "bg-rose-950/40 text-rose-300 border-rose-500/30" 
};

export default function Workload() {
  const [tasks, setTasks] = useState([]);
  const [adding, setAdding] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => { load(); }, []);
  const load = async () => { 
    try {
      const res = await base44.entities.AcademicTask.filter({}, "due_date", 50); 
      setTasks(res || []); 
    } catch(e) {
      setTasks([]);
    }
  };

  const ordered = [...tasks].sort((a, b) => (a.due_date || "").localeCompare(b.due_date || ""));
  const pending = ordered.filter((t) => t.status !== "completed");
  const totalHours = pending.reduce((s, t) => s + (t.estimated_hours || 0), 0);
  const overdue = pending.filter((t) => t.due_date < today).length;

  return (
    <div className="mx-auto max-w-4xl text-white">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">UNIFIED WORKLOAD</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-white sm:text-4xl">Everything on Your Plate</h1>
        </div>
        <button 
          onClick={() => setAdding(!adding)} 
          className="inline-flex items-center gap-2 rounded-xl bg-white text-black hover:bg-zinc-200 border border-white px-5 py-2.5 text-sm font-semibold transition shadow-md"
        >
          <Plus className="h-4 w-4" /> {adding ? "Cancel" : "Add Task"}
        </button>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-4">
        <Card value={String(pending.length)} label="Open Tasks" />
        <Card value={totalHours.toFixed(1) + "h"} label="Estimated Effort" />
        <Card value={String(overdue)} label="Overdue" tone={overdue ? "amber" : "zinc"} />
      </div>

      {adding && <AddTask onDone={() => { setAdding(false); load(); }} />}

      <p className="mt-10 text-xs font-bold uppercase tracking-widest text-zinc-400">All Academic Tasks</p>
      <div className="mt-3 space-y-2.5">
        {ordered.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/20 bg-zinc-950 p-10 text-center text-xs text-zinc-400">
            No tasks logged yet. Add assignments, labs, projects, or exams to track effort in one unified view.
          </div>
        ) : (
          ordered.map((t) => (
            <div key={t.id} className="flex items-center gap-3 rounded-2xl border border-white/15 bg-zinc-950 px-4 py-3.5 shadow-sm transition hover:border-white/30">
              <span className={`rounded-full px-3 py-0.5 text-[11px] font-semibold border ${typeColor[t.type] || "bg-zinc-900 border-white/15 text-zinc-300"}`}>
                {typeLabel[t.type] || t.type}
              </span>
              <div className="flex-1 min-w-0">
                <p className={`font-semibold text-sm ${t.status === "completed" ? "text-zinc-500 line-through" : "text-white"}`}>
                  {t.title}
                </p>
                <p className="text-xs text-zinc-400 mt-0.5">Due {t.due_date || "N/A"} · {t.estimated_hours}h estimated</p>
              </div>
              <button 
                onClick={async () => { 
                  await base44.entities.AcademicTask.update(t.id, { status: t.status === "completed" ? "pending" : "completed" }); 
                  load(); 
                }} 
                className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-white/15 bg-zinc-900 hover:bg-zinc-800 text-white transition"
              >
                {t.status === "completed" ? "Reopen" : "Complete"}
              </button>
              <button 
                onClick={async () => { await base44.entities.AcademicTask.delete(t.id); load(); }} 
                className="text-zinc-500 hover:text-rose-400 transition p-1"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Card({ value, label, tone = "zinc" }) {
  const tones = { zinc: "text-white", amber: "text-amber-400" };
  return (
    <div className="rounded-3xl border border-white/15 bg-zinc-950 p-5 shadow-sm">
      <p className={`text-2xl font-bold ${tones[tone]}`}>{value}</p>
      <p className="mt-1 text-xs text-zinc-400">{label}</p>
    </div>
  );
}

function AddTask({ onDone }) {
  const [f, setF] = useState({ title: "", type: "assignment", due_date: new Date().toISOString().slice(0, 10), estimated_hours: 2 });
  const [busy, setBusy] = useState(false);
  const submit = async (e) => { 
    e.preventDefault(); 
    setBusy(true); 
    try {
      await base44.entities.AcademicTask.create(f); 
    } catch(e){}
    onDone(); 
  };

  return (
    <form onSubmit={submit} className="mt-6 rounded-3xl border border-white/20 bg-zinc-950 p-6 shadow-md">
      <h3 className="font-bold text-base text-white">Add Academic Task</h3>
      <input 
        value={f.title} 
        onChange={(e) => setF({ ...f, title: e.target.value })} 
        placeholder="Task Title (e.g. Operating Systems Lab Assignment 2)" 
        className="mt-3 w-full rounded-xl border border-white/15 bg-zinc-900 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-white/60 focus:outline-none focus:ring-1 focus:ring-white/20" 
        required 
      />
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <select 
          value={f.type} 
          onChange={(e) => setF({ ...f, type: e.target.value })} 
          className="rounded-xl border border-white/15 bg-zinc-900 px-3 py-2.5 text-sm text-white focus:border-white/60 focus:outline-none"
        >
          {Object.entries(typeLabel).map(([v, l]) => <option key={v} value={v} className="bg-zinc-950 text-white">{l}</option>)}
        </select>
        <input 
          type="date" 
          value={f.due_date} 
          onChange={(e) => setF({ ...f, due_date: e.target.value })} 
          className="rounded-xl border border-white/15 bg-zinc-900 px-3 py-2.5 text-sm text-white focus:border-white/60 focus:outline-none" 
        />
        <input 
          type="number" 
          step="0.5" 
          value={f.estimated_hours} 
          onChange={(e) => setF({ ...f, estimated_hours: Number(e.target.value) })} 
          className="rounded-xl border border-white/15 bg-zinc-900 px-3 py-2.5 text-sm text-white focus:border-white/60 focus:outline-none" 
          placeholder="Hours"
        />
      </div>
      <button 
        disabled={busy || !f.title} 
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-white text-black hover:bg-zinc-200 border border-white px-5 py-2.5 text-sm font-semibold disabled:opacity-50 transition shadow-sm"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Task to Workload"}
      </button>
    </form>
  );
}