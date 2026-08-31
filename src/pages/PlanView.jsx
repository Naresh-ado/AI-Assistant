import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { apiClient as base44 } from "@/api/apiClient";
import { ArrowLeft, Clock, CheckCircle2, Circle } from "lucide-react";

const typeColor = { 
  study: "bg-zinc-900 text-zinc-200 border-white/15", 
  practice: "bg-zinc-900 text-zinc-200 border-white/15", 
  revision: "bg-amber-950/40 text-amber-300 border-amber-500/30", 
  break: "bg-zinc-900 text-zinc-400 border-white/10", 
  test: "bg-rose-950/40 text-rose-300 border-rose-500/30" 
};
const typeLabel = { study: "Study", practice: "Practice", revision: "Revision", break: "Break", test: "Test" };

export default function PlanView() {
  const { id } = useParams();
  const [plan, setPlan] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [grouped, setGrouped] = useState({});

  useEffect(() => { load(); }, [id]);
  const load = async () => {
    try {
      const p = await base44.entities.StudyPlan.get(id);
      setPlan(p);
      const s = await base44.entities.PlanSession.filter({ plan_id: id });
      s.sort((a, b) => a.day - b.day || a.start_offset_minutes - b.start_offset_minutes);
      setSessions(s);
      const g = s.reduce((acc, x) => { (acc[x.day] ||= []).push(x); return acc; }, {});
      setGrouped(g);
    } catch(e){}
  };

  if (!plan) {
    return (
      <div className="flex h-64 items-center justify-center bg-black">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/20 border-t-white" />
      </div>
    );
  }

  const done = sessions.filter((s) => s.status === "completed").length;

  return (
    <div className="mx-auto max-w-3xl text-white">
      <Link to="/plans" className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition">
        <ArrowLeft className="h-4 w-4" /> All plans
      </Link>
      <div className="mt-3 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">{plan.course_title}</h1>
          <p className="mt-1 text-sm text-zinc-400">{plan.start_topic_title} → {plan.end_topic_title} · Target {plan.target_date}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-white">{done}/{sessions.length}</p>
          <p className="text-xs text-zinc-400">sessions completed</p>
        </div>
      </div>

      <div className="mt-8 space-y-6">
        {Object.keys(grouped).map((day) => (
          <div key={day} className="rounded-3xl border border-white/15 bg-zinc-950 p-6 shadow-sm">
            <div className="flex items-center gap-2 text-white">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">Day {day}</span>
              <span className="text-xs text-zinc-500">· {grouped[day][0]?.date}</span>
            </div>
            <div className="mt-4 space-y-2">
              {grouped[day].map((s) => (
                <Link 
                  key={s.id} 
                  to={`/study/${s.id}`} 
                  className="flex items-center gap-3 rounded-2xl border border-transparent hover:border-white/20 px-3.5 py-3 transition hover:bg-zinc-900"
                >
                  {s.status === "completed" ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                  ) : (
                    <Circle className="h-5 w-5 text-zinc-600 shrink-0" />
                  )}
                  <span className={`flex-1 text-sm font-semibold ${s.status === "completed" ? "text-zinc-500 line-through" : "text-white"}`}>
                    {s.topic_title}
                  </span>
                  <span className={`rounded-full px-3 py-0.5 text-[11px] font-semibold border ${typeColor[s.session_type] || "bg-zinc-900 text-zinc-300 border-white/10"}`}>
                    {typeLabel[s.session_type]}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-zinc-400 shrink-0">
                    <Clock className="h-3.5 w-3.5" /> {s.duration_minutes}m
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}