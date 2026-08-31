import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiClient as base44 } from "@/api/apiClient";
import { Timer, ChevronRight, Loader2 } from "lucide-react";

export default function StudyHome() {
  const [sessions, setSessions] = useState(undefined);

  useEffect(() => { 
    (async () => {
      try {
        const user = await base44.auth.me();
        const plans = await base44.entities.StudyPlan.filter({ created_by_id: user?.id, status: ["active", "recovery"] }, "-created_date", 10);
        const all = [];
        for (const p of plans || []) {
          const s = await base44.entities.PlanSession.filter({ plan_id: p.id, status: "pending" }, "day", 20);
          (s || []).forEach((x) => all.push({ ...x, plan: p }));
        }
        setSessions(all);
      } catch(e){
        setSessions([]);
      }
    })(); 
  }, []);

  if (sessions === undefined) {
    return (
      <div className="flex h-64 items-center justify-center bg-black">
        <Loader2 className="h-6 w-6 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl text-white">
      <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">STUDY</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight text-white sm:text-4xl">Upcoming Study Sessions</h1>
      
      {sessions.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-dashed border-white/20 bg-zinc-950 p-12 text-center shadow-sm">
          <Timer className="mx-auto h-10 w-10 text-zinc-500 mb-3" />
          <h2 className="text-lg font-bold text-white">No pending sessions</h2>
          <p className="mt-1.5 text-sm text-zinc-400 max-w-md mx-auto">Build a plan to get a day-by-day focus schedule.</p>
          <Link to="/courses" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white text-black hover:bg-zinc-200 border border-white px-5 py-2.5 text-sm font-semibold transition shadow-md">
            Go to Courses
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-2.5">
          {sessions.map((s) => (
            <Link 
              key={s.id} 
              to={`/study/${s.id}`} 
              className="flex items-center gap-3.5 rounded-3xl border border-white/15 bg-zinc-950 px-5 py-4 transition duration-150 hover:border-white/40 hover:bg-zinc-900/60 shadow-sm"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-900 border border-white/15 text-white shrink-0 shadow-sm">
                <Timer className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-white truncate">{s.topic_title}</p>
                <p className="text-xs text-zinc-400 mt-0.5 truncate">
                  {s.plan?.course_title || "Course"} · Day {s.day} · {s.duration_minutes}m target
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-zinc-500 shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}