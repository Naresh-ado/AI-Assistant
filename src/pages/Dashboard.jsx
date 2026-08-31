import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiClient as base44 } from "@/api/apiClient";
import { Timer, ListChecks, AlertTriangle, Sparkles, TrendingUp } from "lucide-react";
import CapacityRing from "@/components/dashboard/CapacityRing";

export default function Dashboard() {
  const [profile, setProfile] = useState(undefined);
  const [tasks, setTasks] = useState([]);
  const [plans, setPlans] = useState([]);
  const [nextSession, setNextSession] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const user = await base44.auth.me();
        const userId = user?.id || 'demo_user';
        const [pRes, tRes, plansRes] = await Promise.all([
          base44.entities.StudentProfile.filter({ created_by_id: userId }, "-created_date", 1),
          base44.entities.AcademicTask.filter({ status: "pending" }, "due_date", 20),
          base44.entities.StudyPlan.filter({ created_by_id: userId, status: "active" }, "-created_date", 10)
        ]);

        const fallbackName = user?.full_name || (user?.email ? user.email.split('@')[0] : "Student");
        const defaultProf = { display_name: fallbackName, daily_available_hours: 4, focus_duration_minutes: 45 };
        
        setProfile(pRes && pRes[0] ? pRes[0] : defaultProf);
        setTasks(tRes || []);
        setPlans(plansRes || []);
        if (plansRes && plansRes[0]) {
          const sessions = await base44.entities.PlanSession.filter({ plan_id: plansRes[0].id, status: "pending" }, "day", 20);
          setNextSession({ plan: plansRes[0], session: sessions && sessions[0] ? sessions[0] : null });
        }
      } catch (e) {
        setProfile({ display_name: "Student", daily_available_hours: 4, focus_duration_minutes: 45 });
        setTasks([]);
        setPlans([]);
      }
    })();
  }, []);

  if (profile === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/20 border-t-white" />
      </div>
    );
  }

  const pendingTasks = tasks.length;
  const taskHours = tasks.reduce((s, t) => s + (t.estimated_hours || 0), 0);
  const today = new Date().toISOString().slice(0, 10);
  const soon = tasks.filter((t) => t.due_date && t.due_date <= today).length;

  return (
    <div className="mx-auto max-w-6xl text-white">
      <header className="mb-8">
        <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">YOUR ACADEMIC HOME</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          {greeting()}, {profile.display_name || "Student"}.
        </h1>
        <p className="mt-1.5 text-sm text-zinc-400">Here’s what to focus on right now.</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Next Action Box */}
        <div className="lg:col-span-2 rounded-3xl border border-white/15 bg-zinc-950 p-6 shadow-sm">
          <div className="flex items-center gap-2 text-white">
            <Sparkles className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">Next action</span>
          </div>
          {nextSession?.session ? (
            <div className="mt-4">
              <h2 className="text-2xl font-bold text-white">{nextSession.session.topic_title || nextSession.session.title || "Session"}</h2>
              <p className="mt-1 text-sm text-zinc-400">{nextSession.session.planned_minutes || 45} minutes · {labelType(nextSession.session.session_type)}</p>
              <div className="mt-4 rounded-2xl border border-white/10 bg-zinc-900/70 p-4 text-sm text-zinc-300">
                <strong className="text-white">Why now?</strong> This is the first pending session of your active plan — completing it keeps the schedule on track.
              </div>
              <Link to={`/study/${nextSession.session.id}`} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white text-black hover:bg-zinc-200 border border-white px-5 py-3 text-sm font-semibold transition shadow-md">
                <Timer className="h-4 w-4" /> Start session
              </Link>
            </div>
          ) : (
            <div className="mt-4">
              <h2 className="text-xl font-semibold text-white">No active session yet</h2>
              <p className="mt-1 text-sm text-zinc-400">Upload a course plan and generate a personalized schedule to see your next action here.</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link to="/courses" className="rounded-xl bg-white text-black hover:bg-zinc-200 border border-white px-4 py-2.5 text-sm font-semibold transition shadow-sm">Upload course</Link>
                <Link to="/workload" className="rounded-xl border border-white/20 bg-zinc-900 hover:bg-zinc-800 text-white px-4 py-2.5 text-sm font-semibold transition">Add an assignment</Link>
                <Link to="/settings" className="rounded-xl border border-white/15 bg-zinc-950 hover:bg-zinc-900 text-zinc-300 hover:text-white px-4 py-2.5 text-sm font-semibold transition">Set Up Profile</Link>
              </div>
            </div>
          )}
        </div>
        
        {/* Capacity Box */}
        <CapacityRing hours={profile.daily_available_hours || profile.daily_study_capacity_hours || 4} focus={profile.focus_duration_minutes || profile.max_focus_session_minutes || 45} />
      </div>

      {/* Stats row with black boxes and thin white line */}
      <div className="mt-6 grid gap-6 sm:grid-cols-3">
        <Stat icon={ListChecks} label="Pending tasks" value={pendingTasks} hint={`${taskHours.toFixed(1)}h estimated`} />
        <Stat icon={AlertTriangle} label="Due today / overdue" value={soon} hint={soon ? "Needs attention" : "All clear"} tone={soon ? "amber" : "emerald"} />
        <Stat icon={TrendingUp} label="Active plans" value={plans.length} hint={plans[0] ? plans[0].title || plans[0].course_title : "No active plan"} />
      </div>

      {/* Quick Launch Cards */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Link to="/companion" className="group rounded-3xl border border-white/15 bg-zinc-950 hover:bg-zinc-900/80 hover:border-white/40 p-6 transition duration-150 shadow-sm">
          <div className="flex items-center gap-2 text-white">
            <Sparkles className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">Emotional companion</span>
          </div>
          <p className="mt-3 text-lg font-semibold text-white">Need a moment of encouragement?</p>
          <p className="mt-1 text-sm text-zinc-400">Your companion knows your workload and adapts its tone to your day.</p>
        </Link>
        <Link to="/rescue" className="group rounded-3xl border border-white/15 bg-zinc-950 hover:bg-zinc-900/80 hover:border-white/40 p-6 transition duration-150 shadow-sm">
          <div className="flex items-center gap-2 text-rose-400">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Rescue mode</span>
          </div>
          <p className="mt-3 text-lg font-semibold text-white">Exam soon and behind?</p>
          <p className="mt-1 text-sm text-zinc-400">Generate a high-impact recovery plan instead of an impossible one.</p>
        </Link>
      </div>
    </div>
  );
}

function greeting() { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"; }
function labelType(t) { return ({ study: "Study", practice: "Practice", revision: "Revision", break: "Break", test: "Test" })[t] || t; }

function Stat({ icon: Icon, label, value, hint, tone = "zinc" }) {
  const tones = { zinc: "text-zinc-400", amber: "text-amber-400", emerald: "text-emerald-400" };
  return (
    <div className="rounded-3xl border border-white/15 bg-zinc-950 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">{label}</span>
        <Icon className={`h-4 w-4 ${tones[tone]}`} />
      </div>
      <p className="mt-2 text-3xl font-bold text-white">{value}</p>
      <p className={`mt-1 text-xs ${tones[tone]}`}>{hint}</p>
    </div>
  );
}