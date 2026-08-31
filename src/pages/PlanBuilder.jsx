import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { apiClient as base44 } from "@/api/apiClient";
import { ArrowLeft, Calendar, Sparkles, Loader2, AlertTriangle } from "lucide-react";
import { rangeTopics, totalWorkload, classifyWorkload, availableMinutes, generatePlan, minutesToHm, classNamesFor } from "@/lib/planning";

export default function PlanBuilder() {
  const [params, setParams] = useSearchParams();
  const initialCourseId = params.get("course");
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState(initialCourseId || "");
  const [course, setCourse] = useState(null);
  const [topics, setTopics] = useState([]);
  const [profile, setProfile] = useState(null);
  const [startId, setStartId] = useState("");
  const [endId, setEndId] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [dailyHours, setDailyHours] = useState(4);
  const [busy, setBusy] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [error, setError] = useState("");

  // 1. Load User Profile and Course List
  useEffect(() => {
    (async () => {
      try {
        const user = await base44.auth.me();
        const pList = await base44.entities.StudentProfile.filter({ created_by_id: user?.id }, "-created_date", 1);
        const p = pList?.[0] || null;
        setProfile(p);
        if (p?.daily_available_hours) setDailyHours(p.daily_available_hours);

        const allCourses = await base44.entities.Course.list("-created_date", 50);
        setCourses(allCourses || []);

        const targetCId = initialCourseId || allCourses?.[0]?.id || "";
        setSelectedCourseId(targetCId);
      } catch (e) {
        console.error("PlanBuilder load error:", e);
      } finally {
        setLoadingInitial(false);
      }
    })();
  }, [initialCourseId]);

  // 2. Load Topics when Selected Course Changes
  useEffect(() => {
    if (!selectedCourseId) {
      setCourse(null);
      setTopics([]);
      return;
    }

    (async () => {
      try {
        const c = await base44.entities.Course.get(selectedCourseId);
        setCourse(c);
        const t = (await base44.entities.Topic.filter({ course_id: selectedCourseId })).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        setTopics(t || []);
        if (t && t.length > 0) {
          setStartId(t[0].id);
          setEndId(t[t.length - 1].id);

          const totalMins = t.reduce((sum, item) => sum + (item.estimated_minutes || 60), 0);
          const neededDays = Math.max(3, Math.ceil(totalMins / ((dailyHours || 4) * 60)) + 2);
          const d = new Date();
          d.setDate(d.getDate() + neededDays);
          setTargetDate(d.toISOString().slice(0, 10));
        }
      } catch (e) {
        console.error("Topic load error:", e);
      }
    })();
  }, [selectedCourseId, dailyHours]);

  const sorted = useMemo(() => [...topics].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)), [topics]);
  const range = useMemo(() => rangeTopics(topics, startId, endId), [topics, startId, endId]);
  const total = useMemo(() => totalWorkload(range), [range]);
  const analysis = useMemo(() => {
    if (!targetDate) return null;
    const avail = availableMinutes(targetDate, dailyHours, new Date());
    const w = classifyWorkload(total, avail);
    return { ...w, available: avail, total };
  }, [total, targetDate, dailyHours]);

  const generate = async () => {
    if (!course || !range.length) {
      setError("Please select a valid course and topic range.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const days = generatePlan(range, { 
        dailyHours, 
        targetDate, 
        focusMinutes: profile?.focus_duration_minutes || 40, 
        fromDate: new Date() 
      });

      const plan = await base44.entities.StudyPlan.create({
        course_id: course.id, 
        course_title: course.title || course.name || "Course Study Plan",
        start_topic_id: startId, 
        start_topic_title: sorted.find((t) => t.id === startId)?.title || "Start",
        end_topic_id: endId, 
        end_topic_title: sorted.find((t) => t.id === endId)?.title || "End",
        target_date: targetDate, 
        daily_hours: dailyHours, 
        status: "active",
        total_estimated_minutes: analysis?.total || total, 
        available_minutes: analysis?.available || (dailyHours * 60 * 5), 
        workload_level: analysis?.level || "green"
      });

      const sessions = [];
      days.forEach((d) => d.sessions.forEach((s) => sessions.push({ 
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

      if (sessions.length) {
        await base44.entities.PlanSession.bulkCreate(sessions);
      }
      navigate(`/plans/${plan.id}`);
    } catch (err) { 
      setError(err.message || "Could not generate plan."); 
      setBusy(false); 
    }
  };

  if (loadingInitial) {
    return (
      <div className="flex h-64 items-center justify-center bg-black">
        <Loader2 className="h-6 w-6 animate-spin text-white" />
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="mx-auto max-w-2xl text-center py-12 text-white">
        <div className="rounded-3xl border border-dashed border-white/20 bg-zinc-950 p-10">
          <Calendar className="mx-auto h-12 w-12 text-zinc-500 mb-4" />
          <h2 className="text-xl font-bold text-white">No courses in library yet</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Upload a course syllabus or outline first to automatically build personalized study schedules.
          </p>
          <Link
            to="/courses/upload"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white text-black hover:bg-zinc-200 border border-white px-5 py-2.5 text-sm font-semibold transition shadow-md"
          >
            Upload Course Syllabus →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl text-white">
      <Link to={selectedCourseId ? `/courses/${selectedCourseId}` : "/courses"} className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-400 hover:text-white transition">
        <ArrowLeft className="h-4 w-4" /> Back to {course?.title || "Courses"}
      </Link>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">Build Your Study Plan</h1>
      <p className="mt-1.5 text-sm text-zinc-400">
        Choose the course, study range, your deadline, and daily capacity.
      </p>

      {/* Course Selector */}
      {courses.length > 1 && (
        <div className="mt-6 rounded-3xl border border-white/15 bg-zinc-950 p-6 shadow-sm">
          <Field label="Selected Course">
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="w-full rounded-xl border border-white/15 bg-zinc-900 px-3.5 py-2.5 text-sm font-semibold text-white focus:border-white/60 focus:outline-none"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id} className="bg-zinc-950 text-white">
                  {c.title || c.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
      )}

      {topics.length === 0 ? (
        <div className="mt-6 rounded-3xl border border-dashed border-white/20 bg-zinc-950 p-8 text-center">
          <p className="text-sm text-zinc-400">This course doesn't have any topics yet.</p>
          <Link
            to={`/courses/${selectedCourseId}`}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white text-black px-4 py-2 text-xs font-bold"
          >
            Add Topics to Course →
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 rounded-3xl border border-white/15 bg-zinc-950 p-6 shadow-sm">
          <Field label="From Topic">
            <select 
              value={startId} 
              onChange={(e) => setStartId(e.target.value)} 
              className="w-full rounded-xl border border-white/15 bg-zinc-900 px-3 py-2.5 text-sm text-white focus:border-white/60 focus:outline-none"
            >
              {sorted.map((t) => <option key={t.id} value={t.id} className="bg-zinc-950 text-white">{t.title}</option>)}
            </select>
          </Field>
          
          <Field label="To Topic">
            <select 
              value={endId} 
              onChange={(e) => setEndId(e.target.value)} 
              className="w-full rounded-xl border border-white/15 bg-zinc-900 px-3 py-2.5 text-sm text-white focus:border-white/60 focus:outline-none"
            >
              {sorted.map((t) => <option key={t.id} value={t.id} className="bg-zinc-950 text-white">{t.title}</option>)}
            </select>
          </Field>
          
          <Field label="Target Exam / Completion Date">
            <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-zinc-900 px-3 py-2.5">
              <Calendar className="h-4 w-4 text-zinc-400" />
              <input 
                type="date" 
                value={targetDate} 
                onChange={(e) => setTargetDate(e.target.value)} 
                className="flex-1 bg-transparent text-sm text-white outline-none" 
              />
            </div>
          </Field>
          
          <Field label={`Daily Capacity: ${dailyHours}h`}>
            <input 
              type="range" 
              min="1" 
              max="10" 
              step="0.5" 
              value={dailyHours} 
              onChange={(e) => setDailyHours(Number(e.target.value))} 
              className="mt-3 w-full accent-white bg-zinc-800" 
            />
          </Field>
        </div>
      )}

      {analysis && (
        <div className="mt-6">
          <div className={`rounded-3xl border p-6 bg-zinc-950 shadow-sm ${classNamesFor(analysis.level)}`}>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
              <AlertTriangle className="h-4 w-4" /> {analysis.label}
            </div>
            <p className="mt-2 text-sm text-zinc-200">{analysis.reason}</p>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm">
              <Mini label="Workload" value={minutesToHm(analysis.total)} />
              <Mini label="Available" value={minutesToHm(analysis.available)} />
              <Mini label="Topics" value={String(range.length)} />
            </div>
          </div>
          {analysis.level === "red" && (
            <Link to="/rescue" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-500 border border-rose-500 px-4 py-2.5 text-xs font-semibold text-white transition">
              Use Rescue Mode instead
            </Link>
          )}
        </div>
      )}

      {error && <p role="alert" className="mt-4 text-sm text-rose-400 font-medium">{error}</p>}

      <button 
        disabled={busy || !startId || !endId || !targetDate} 
        onClick={generate} 
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-white text-black hover:bg-zinc-200 border border-white px-5 py-3.5 text-sm font-semibold disabled:opacity-50 transition shadow-md"
      >
        {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating Plan…</> : <><Sparkles className="h-4 w-4" /> Generate Personalized Plan</>}
      </button>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-zinc-400">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function Mini({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900/80 p-3">
      <p className="text-[11px] text-zinc-400 uppercase font-semibold">{label}</p>
      <p className="mt-1 font-bold text-white text-base">{value}</p>
    </div>
  );
}