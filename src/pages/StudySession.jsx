import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { apiClient as base44 } from "@/api/apiClient";
import { ArrowLeft, Pause, Play, CheckCircle2, Loader2 } from "lucide-react";

export default function StudySession() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [plan, setPlan] = useState(null);
  const [logs, setLogs] = useState([]);
  const [profile, setProfile] = useState(null);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => { 
    (async () => {
      try {
        const s = await base44.entities.PlanSession.get(id);
        setSession(s);
        const p = await base44.entities.StudyPlan.get(s.plan_id);
        setPlan(p);
        const user = await base44.auth.me();
        const [prof] = await base44.entities.StudentProfile.filter({ created_by_id: user?.id }, "-created_date", 1);
        setProfile(prof);
        const allSessions = await base44.entities.PlanSession.filter({ plan_id: s.plan_id });
        const done = allSessions.filter((x) => x.status === "completed" && x.actual_minutes != null && x.predicted_minutes != null);
        setLogs(done);
      } catch(e){}
    })(); 
  }, [id]);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [running]);

  if (!session) {
    return (
      <div className="flex h-64 items-center justify-center bg-black">
        <Loader2 className="h-6 w-6 animate-spin text-white" />
      </div>
    );
  }

  const predictedMin = session.predicted_minutes || session.duration_minutes;
  const actualMin = Math.max(1, Math.round(elapsed / 60));

  const complete = async () => {
    setBusy(true);
    try {
      await base44.entities.PlanSession.update(id, { status: "completed", actual_minutes: actualMin });
      const all = await base44.entities.PlanSession.filter({ plan_id: session.plan_id });
      const done = all.filter((x) => x.status === "completed" && x.actual_minutes != null && x.predicted_minutes != null);
      setLogs(done);
      if (done.length && profile) {
        const factor = done.reduce((s, l) => s + l.actual_minutes / l.predicted_minutes, 0) / done.length;
        const clamped = Math.max(0.6, Math.min(1.8, factor));
        const pending = all.filter((x) => x.status === "pending");
        if (pending.length) {
          await base44.entities.PlanSession.bulkUpdate(pending.slice(0, 100).map((x) => ({ id: x.id, duration_minutes: Math.round((x.predicted_minutes || x.duration_minutes) * clamped) })));
        }
        await base44.entities.StudentProfile.update(profile.id, { estimate_accuracy: Math.min(1, 1 - Math.abs(clamped - 1)) });
      }
      setShowResult(true);
    } finally { 
      setBusy(false); 
    }
  };

  const fmt = (sec) => `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;

  if (showResult) {
    const diff = actualMin - predictedMin;
    return (
      <div className="mx-auto max-w-md text-center text-white">
        <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-400" />
        <h1 className="mt-4 text-2xl font-bold text-white">Session Complete</h1>
        <p className="mt-2 text-sm text-zinc-400">Predicted {predictedMin}m · you took {actualMin}m ({diff > 0 ? `+${diff}m` : `${diff}m`}).</p>
        <div className="mt-6 rounded-3xl border border-white/15 bg-zinc-950 p-5 text-left text-xs leading-relaxed text-zinc-300">
          {diff > 5 ? "You took a little longer than expected, but that’s okay. The remaining plan has been adjusted to your actual pace." : "Nice pacing — your estimates are tracking well. The remaining schedule stays as planned."}
        </div>
        <div className="mt-6 flex flex-col gap-2.5">
          <button onClick={() => navigate(`/plans/${session.plan_id}`)} className="rounded-xl bg-white text-black hover:bg-zinc-200 border border-white px-5 py-3 text-sm font-semibold transition shadow-md">Back to Plan</button>
          <Link to="/companion" className="rounded-xl border border-white/20 bg-zinc-950 hover:bg-zinc-900 px-5 py-3 text-sm font-semibold text-white transition">Talk to Companion</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md text-white">
      <Link to={`/plans/${session.plan_id}`} className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition">
        <ArrowLeft className="h-4 w-4" /> Back to plan
      </Link>
      <p className="mt-2 text-xs font-bold uppercase tracking-wider text-zinc-400">{session.session_type} · Day {session.day}</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight text-white">{session.topic_title}</h1>
      <p className="mt-1.5 text-xs text-zinc-400">Target duration: {predictedMin} minutes.</p>

      <div className="mt-8 rounded-3xl border border-white/15 bg-zinc-950 p-8 text-center shadow-md">
        <div className="font-mono text-6xl font-bold text-white tracking-tight">{fmt(elapsed)}</div>
        
        <div className="mt-8 flex justify-center">
          <button 
            onClick={() => setRunning((r) => !r)} 
            className="inline-flex items-center gap-2 rounded-full bg-white text-black hover:bg-zinc-200 border border-white px-8 py-3.5 text-sm font-semibold transition shadow-lg"
          >
            {running ? <><Pause className="h-4 w-4" /> Pause</> : <><Play className="h-4 w-4" /> {elapsed > 0 ? "Resume" : "Start Focus"}</>}
          </button>
        </div>
        
        <button 
          disabled={busy || elapsed === 0} 
          onClick={complete} 
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-zinc-900 hover:bg-zinc-800 px-5 py-3 text-sm font-semibold text-white disabled:opacity-30 transition"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Mark Complete
        </button>
      </div>

      {logs.length > 0 && (
        <div className="mt-6 rounded-3xl border border-white/10 bg-zinc-950 p-4 text-xs leading-relaxed text-zinc-400">
          Learning from {logs.length} completed session{logs.length > 1 ? "s" : ""}: remaining sessions dynamically calibrate to your real speed.
        </div>
      )}
    </div>
  );
}