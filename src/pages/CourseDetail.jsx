import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { apiClient as base44 } from "@/api/apiClient";
import { ArrowLeft, Plus, Trash2, Pencil, Check, X, CalendarRange } from "lucide-react";

export default function CourseDetail() {
  const { id } = useParams();
  const [course, setCourse] = useState(null);
  const [topics, setTopics] = useState([]);
  const [editing, setEditing] = useState(null);

  useEffect(() => { load(); }, [id]);
  const load = async () => {
    try {
      const c = await base44.entities.Course.get(id);
      setCourse(c);
      const res = await base44.entities.Topic.filter({ course_id: id });
      setTopics((res || []).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
    } catch(e){}
  };

  const grouped = topics.reduce((acc, t) => { (acc[t.unit] ||= []).push(t); return acc; }, {});
  const units = Object.keys(grouped);

  const save = async (data) => { await base44.entities.Topic.update(editing.id, data); setEditing(null); load(); };
  const addTopic = async (unit) => { await base44.entities.Topic.create({ course_id: id, unit, title: "New topic", order: topics.length, importance: "medium", estimated_minutes: 60, prerequisites: [], status: "pending" }); load(); };
  const remove = async (tid) => { await base44.entities.Topic.delete(tid); load(); };

  return (
    <div className="mx-auto max-w-4xl text-white">
      <Link to="/courses" className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition">
        <ArrowLeft className="h-4 w-4" /> All courses
      </Link>
      
      <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">{course?.title || "Course"}</h1>
          <p className="mt-1 text-sm text-zinc-400">{topics.length} topics mapped in syllabus tree.</p>
        </div>
        {topics.length > 0 && (
          <Link 
            to={`/plans/new?course=${id}`} 
            className="inline-flex items-center gap-2 rounded-xl bg-white text-black hover:bg-zinc-200 border border-white px-5 py-2.5 text-sm font-semibold transition shadow-md shrink-0"
          >
            <CalendarRange className="h-4 w-4" /> Build study plan
          </Link>
        )}
      </div>

      <div className="mt-8 space-y-6">
        {units.length === 0 && (
          <div className="rounded-3xl border border-dashed border-white/20 bg-zinc-950 p-10 text-center text-zinc-400">
            No topics yet. Add one to start.
          </div>
        )}
        
        {units.map((unit) => (
          <div key={unit} className="rounded-3xl border border-white/15 bg-zinc-950 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-base text-white">{unit}</h2>
              <button 
                onClick={() => addTopic(unit)} 
                className="inline-flex items-center gap-1 text-xs font-semibold text-white px-3 py-1 rounded-xl bg-zinc-900 border border-white/15 hover:border-white/40 transition"
              >
                <Plus className="h-3.5 w-3.5" /> Add topic
              </button>
            </div>
            
            <div className="mt-4 space-y-2.5">
              {grouped[unit].map((t) => editing?.id === t.id ? (
                <EditRow key={t.id} topic={t} onSave={save} onCancel={() => setEditing(null)} allTitles={topics.map((x) => x.title)} />
              ) : (
                <div key={t.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-zinc-900/80 px-4 py-3.5 transition hover:border-white/25">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-white">{t.title}</p>
                    <p className="mt-0.5 text-xs text-zinc-400">
                      {t.estimated_minutes} min · {importanceLabel(t.importance)} {t.prerequisites?.length ? `· Requires: ${t.prerequisites.join(", ")}` : ""}
                    </p>
                  </div>
                  <button onClick={() => setEditing(t)} className="text-zinc-400 hover:text-white p-1 transition"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => remove(t.id)} className="text-zinc-500 hover:text-rose-400 p-1 transition"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function importanceLabel(i) { return ({ high: "High importance", medium: "Medium", low: "Low" })[i] || i; }

function EditRow({ topic, onSave, onCancel, allTitles }) {
  const [f, setF] = useState({ ...topic, prerequisites: topic.prerequisites || [] });
  const toggle = (title) => setF((c) => ({ ...c, prerequisites: c.prerequisites.includes(title) ? c.prerequisites.filter((x) => x !== title) : [...c.prerequisites, title] }));
  
  return (
    <div className="rounded-2xl border border-white/25 bg-zinc-900 p-4 shadow-md">
      <input 
        value={f.title} 
        onChange={(e) => setF({ ...f, title: e.target.value })} 
        className="w-full rounded-xl border border-white/20 bg-black px-3.5 py-2 text-sm text-white focus:border-white/60 focus:outline-none" 
      />
      <div className="mt-3 grid grid-cols-3 gap-3">
        <select 
          value={f.importance} 
          onChange={(e) => setF({ ...f, importance: e.target.value })} 
          className="rounded-xl border border-white/20 bg-black px-2.5 py-2 text-sm text-white focus:border-white/60 focus:outline-none"
        >
          <option value="high">High Importance</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <input 
          type="number" 
          value={f.estimated_minutes} 
          onChange={(e) => setF({ ...f, estimated_minutes: Number(e.target.value) })} 
          className="rounded-xl border border-white/20 bg-black px-2.5 py-2 text-sm text-white focus:border-white/60 focus:outline-none" 
          placeholder="Minutes"
        />
        <input 
          value={f.unit} 
          onChange={(e) => setF({ ...f, unit: e.target.value })} 
          className="rounded-xl border border-white/20 bg-black px-2.5 py-2 text-sm text-white focus:border-white/60 focus:outline-none" 
          placeholder="Unit"
        />
      </div>
      
      <p className="mt-3 text-xs font-semibold text-zinc-400">Prerequisites (tap to toggle):</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {allTitles.filter((x) => x !== topic.title).map((title) => (
          <button 
            key={title} 
            type="button" 
            onClick={() => toggle(title)} 
            className={`rounded-full px-3 py-1 text-xs border transition ${
              f.prerequisites.includes(title) 
                ? "bg-white text-black border-white font-semibold" 
                : "bg-black text-zinc-300 border-white/15 hover:border-white/30"
            }`}
          >
            {title}
          </button>
        ))}
      </div>
      
      <div className="mt-4 flex gap-2">
        <button 
          onClick={() => onSave({ title: f.title, importance: f.importance, estimated_minutes: f.estimated_minutes, unit: f.unit, prerequisites: f.prerequisites })} 
          className="inline-flex items-center gap-1.5 rounded-xl bg-white text-black hover:bg-zinc-200 border border-white px-4 py-2 text-xs font-semibold shadow-sm transition"
        >
          <Check className="h-3.5 w-3.5" /> Save Topic
        </button>
        <button 
          onClick={onCancel} 
          className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-black px-4 py-2 text-xs font-medium text-zinc-300 hover:text-white transition"
        >
          <X className="h-3.5 w-3.5" /> Cancel
        </button>
      </div>
    </div>
  );
}