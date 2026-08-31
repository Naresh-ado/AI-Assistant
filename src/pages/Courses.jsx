import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiClient as base44 } from "@/api/apiClient";
import { BookOpen, Plus, Trash2 } from "lucide-react";

export default function Courses() {
  const [courses, setCourses] = useState([]);
  const navigate = useNavigate();

  useEffect(() => { load(); }, []);
  const load = async () => { 
    try {
      const res = await base44.entities.Course.filter({}, "-created_date", 50); 
      setCourses(res || []); 
    } catch(e) {
      setCourses([]);
    }
  };

  return (
    <div className="mx-auto max-w-5xl text-white">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">COURSES</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-white sm:text-4xl">Your Course Library</h1>
        </div>
        <Link 
          to="/courses/upload" 
          className="inline-flex items-center gap-2 rounded-xl bg-white text-black hover:bg-zinc-200 border border-white px-5 py-2.5 text-sm font-semibold transition shadow-md"
        >
          <Plus className="h-4 w-4" /> Upload Course Plan
        </Link>
      </div>

      {courses.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-white/20 bg-zinc-950 p-12 text-center shadow-sm">
          <BookOpen className="mx-auto h-10 w-10 text-zinc-500" />
          <h2 className="mt-4 text-lg font-bold text-white">No courses yet</h2>
          <p className="mt-1.5 text-sm text-zinc-400 max-w-md mx-auto">Upload a syllabus or course-plan document to begin extracting its structure.</p>
          <Link 
            to="/courses/upload" 
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white text-black hover:bg-zinc-200 border border-white px-5 py-2.5 text-sm font-semibold transition"
          >
            <Plus className="h-4 w-4" /> Upload first course
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {courses.map((c) => (
            <div key={c.id} className="group rounded-3xl border border-white/15 bg-zinc-950 p-6 transition duration-150 hover:border-white/40 hover:bg-zinc-900/60 shadow-sm flex flex-col justify-between">
              <div>
                <Link to={`/courses/${c.id}`} className="block">
                  <h3 className="font-bold text-lg text-white group-hover:text-zinc-100 transition">{c.title}</h3>
                </Link>
                <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-zinc-400">{c.description || "No description provided."}</p>
              </div>
              <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
                <Link to={`/courses/${c.id}`} className="text-xs font-semibold text-white hover:underline flex items-center gap-1">
                  View topic tree →
                </Link>
                <button 
                  onClick={async () => { 
                    if (confirm(`Delete course "${c.title}"?`)) {
                      try { await base44.entities.Course.delete(c.id); } catch(e){} 
                      load(); 
                    }
                  }} 
                  className="text-zinc-500 hover:text-rose-400 transition p-1"
                  title="Delete course"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}