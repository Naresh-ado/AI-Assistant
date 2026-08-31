import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiClient as base44 } from "@/api/apiClient";
import { CalendarRange, ChevronRight } from "lucide-react";

export default function Plans() {
  const [plans, setPlans] = useState([]);
  
  useEffect(() => { 
    base44.entities.StudyPlan.filter({}, "-created_date", 50)
      .then((res) => setPlans(res || []))
      .catch(() => setPlans([])); 
  }, []);

  return (
    <div className="mx-auto max-w-4xl text-white">
      <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">PLANS</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight text-white sm:text-4xl">Your Study Plans</h1>
      
      {plans.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-dashed border-white/20 bg-zinc-950 p-12 text-center shadow-sm">
          <CalendarRange className="mx-auto h-10 w-10 text-zinc-500 mb-3" />
          <h2 className="text-lg font-bold text-white">No plans generated yet</h2>
          <p className="mt-1.5 text-sm text-zinc-400 max-w-md mx-auto">Build an adaptive schedule from one of your courses in the library.</p>
          <Link 
            to="/courses" 
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white text-black hover:bg-zinc-200 border border-white px-5 py-2.5 text-sm font-semibold transition shadow-md"
          >
            Go to Course Library
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-3">
          {plans.map((p) => <PlanRow key={p.id} plan={p} />)}
        </div>
      )}
    </div>
  );
}

function PlanRow({ plan }) {
  const level = { 
    green: "text-emerald-400 border-emerald-500/30 bg-emerald-950/30", 
    yellow: "text-amber-400 border-amber-500/30 bg-amber-950/30", 
    orange: "text-orange-400 border-orange-500/30 bg-orange-950/30", 
    red: "text-rose-400 border-rose-500/30 bg-rose-950/30" 
  }[plan.workload_level] || "text-zinc-400 border-white/10 bg-zinc-900";

  return (
    <Link 
      to={`/plans/${plan.id}`} 
      className="flex items-center gap-4 rounded-3xl border border-white/15 bg-zinc-950 p-5 transition duration-150 hover:border-white/40 hover:bg-zinc-900/60 shadow-sm"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-900 border border-white/15 text-white shrink-0 shadow-sm">
        <CalendarRange className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-base text-white truncate">{plan.course_title}</h3>
        <p className="mt-0.5 text-xs text-zinc-400 truncate">
          {plan.start_topic_title || "Start"} → {plan.end_topic_title || "Finish"} · Due {plan.target_date || "Soon"}
        </p>
      </div>
      <span className={`text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${level}`}>
        {plan.workload_level || "normal"}
      </span>
      <ChevronRight className="h-5 w-5 text-zinc-500" />
    </Link>
  );
}