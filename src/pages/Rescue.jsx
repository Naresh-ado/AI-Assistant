import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiClient as base44 } from "@/api/apiClient";
import { Loader2, LifeBuoy } from "lucide-react";
import { generatePlan, classifyWorkload, minutesToHm } from "@/lib/planning";

export default function Rescue() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState("");
  const [daysLeft, setDaysLeft] = useState(2);
  const [hoursDay, setHoursDay] = useState(4);
  const [topics, setTopics] = useState([]);
  const [rescue, setRescue] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const list = await base44.entities.Course.list("-created_date", 50);
        setCourses(list || []);
        const pre = searchParams.get("course");
        if (pre) setCourseId(pre);
        else if (list?.[0]) setCourseId(list[0].id);
      } catch(e) {
        setCourses([]);
      }
    })();
  }, []);

  useEffect(() => { 
    if (courseId) {
      base44.entities.Topic.filter({ course_id: courseId })
        .then((res) => setTopics(res || []))
        .catch(() => setTopics([]));
    }
  }, [courseId]);

  const sorted = useMemo(() => [...topics].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)), [topics]);
  const avail = daysLeft * hoursDay * 60;

  const compute = () => {
    const high = sorted.filter((t) => t.importance === "high");
    const highTopics = high.length ? high : sorted.slice(0, Math.ceil(sorted.length / 2));
    let total = highTopics.reduce((s, t) => s + (t.estimated_minutes || 0), 0);
    const revisionMinutes = 15 * highTopics.length;
    total += revisionMinutes;
    const level = classifyWorkload(total, avail);
    const days = generatePlan(highTopics, { 
      dailyHours: hoursDay, 
      targetDate: new Date(Date.now() + daysLeft * 864e5).toISOString().slice(0, 10), 
      focusMinutes: 35, 
      fromDate: new Date() 
    });
    setRescue({ highTopics, total, revisionMinutes, level, days });
  };

  const buildPlan = async () => {
    setBusy(true);
    try {
      const course = courses.find((c) => c.id === courseId);
      const target = new Date(Date.now() + daysLeft * 864e5).toISOString().slice(0, 10);
      const plan = await base44.entities.StudyPlan.create({
        course_id: courseId, course_title: course?.title || "Rescue",
        start_topic_id: rescue.highTopics[0]?.id || "", start_topic_title: rescue.highTopics[0]?.title || "",
        end_topic_id: rescue.highTopics[rescue.highTopics.length - 1]?.id || "", end_topic_title: rescue.highTopics[rescue.highTopics.length - 1]?.title || "",
        target_date: target, daily_hours: hoursDay, status: "recovery",
        total_estimated_minutes: rescue.total, available_minutes: avail, workload_level: rescue.level.level
      });
      const sessions = [];
      rescue.days.forEach((d) => d.sessions.forEach((s) => sessions.push({ 
        plan_id: plan.id, 
        day: d.day, 
        date: d.date, 
        start_offset_minutes: s.start_offset_minutes, 
        duration_minutes: s.duration_minutes, 
        topic_id: s.topic_id || "", 
        topic_title: s.topic_title, 
        session_type: s.session_type, 
        status: "pending", 
        predicted_minutes: s.duration_minutes 
      })));
      if (sessions.length) await base44.entities.PlanSession.bulkCreate(sessions);
      navigate(`/plans/${plan.id}`);
    } finally { 
      setBusy(false); 
    }
  };

  return (
    <div className="mx-auto max-w-3xl text-white">
      <div className="flex items-center gap-2 text-rose-400">
        <LifeBuoy className="h-5 w-5" />
        <p className="text-xs font-bold uppercase tracking-widest">Rescue mode</p>
      </div>
      <h1 className="mt-1 text-3xl font-bold tracking-tight text-white sm:text-4xl">High-Impact Recovery Plan</h1>
      <p className="mt-1.5 text-sm text-zinc-400">
        When time is short, we build a focused schedule prioritizing high-weight topics, prerequisites, revision and practice.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3 rounded-3xl border border-white/15 bg-zinc-950 p-6 shadow-sm">
        <label className="text-xs font-semibold text-zinc-300">
          Course
          <select 
            value={courseId} 
            onChange={(e) => setCourseId(e.target.value)} 
            className="mt-2 w-full rounded-xl border border-white/15 bg-zinc-900 px-3 py-2.5 text-sm text-white focus:border-white/60 focus:outline-none"
          >
            {courses.map((c) => <option key={c.id} value={c.id} className="bg-zinc-950 text-white">{c.title}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-zinc-300">
          Days Left
          <input 
            type="number" 
            min="1" 
            max="14" 
            value={daysLeft} 
            onChange={(e) => setDaysLeft(Number(e.target.value))} 
            className="mt-2 w-full rounded-xl border border-white/15 bg-zinc-900 px-3 py-2.5 text-sm text-white focus:border-white/60 focus:outline-none" 
          />
        </label>
        <label className="text-xs font-semibold text-zinc-300">
          Hours / Day
          <input 
            type="number" 
            min="1" 
            max="10" 
            value={hoursDay} 
            onChange={(e) => setHoursDay(Number(e.target.value))} 
            className="mt-2 w-full rounded-xl border border-white/15 bg-zinc-900 px-3 py-2.5 text-sm text-white focus:border-white/60 focus:outline-none" 
          />
        </label>
      </div>

      <button 
        onClick={compute} 
        disabled={!courseId} 
        className="mt-6 rounded-xl bg-rose-600 hover:bg-rose-500 border border-rose-500 px-6 py-3 text-sm font-semibold text-white disabled:opacity-50 transition shadow-md"
      >
        Analyze & Build Rescue Plan
      </button>

      {rescue && (
        <div className="mt-8 space-y-4">
          <div className="rounded-3xl border border-rose-500/30 bg-zinc-950 p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-rose-400">{rescue.level.label}</p>
            <p className="mt-2 text-sm text-zinc-200">{rescue.level.reason}</p>
            <p className="mt-2 text-xs text-zinc-400">
              Scope: <strong className="text-white">{rescue.highTopics.length}</strong> high-impact topics · {minutesToHm(rescue.total)} needed vs {minutesToHm(avail)} available · {rescue.revisionMinutes}m revision reserved.
            </p>
          </div>

          <div className="space-y-2.5">
            {rescue.highTopics.map((t, i) => (
              <div key={t.id} className="rounded-2xl border border-white/15 bg-zinc-950 p-4 shadow-sm">
                <p className="font-semibold text-sm text-white">{i + 1}. {t.title}</p>
                <p className="mt-1 text-xs text-zinc-400">{t.estimated_minutes}m · {t.importance} importance — prioritized for exam weight.</p>
              </div>
            ))}
          </div>

          <button 
            onClick={buildPlan} 
            disabled={busy} 
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-white text-black hover:bg-zinc-200 border border-white px-5 py-3 text-sm font-semibold disabled:opacity-50 transition shadow-lg"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Rescue Plan & Start"}
          </button>
        </div>
      )}
    </div>
  );
}