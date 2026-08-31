import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient as base44 } from "@/api/apiClient";
import { extractTextFromPDF } from "@/utils/pdfExtractor";
import { UploadCloud, FileText, Sparkles, Loader2, Plus, Trash2, CheckCircle2 } from "lucide-react";

export default function CourseUpload() {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [fileText, setFileText] = useState("");
  const [pastedText, setPastedText] = useState("");
  const [uploadMode, setUploadMode] = useState("file"); // 'file' | 'paste'
  const [extractingText, setExtractingText] = useState(false);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState("select"); // select | review | manual | extracting | edit_extracted
  const [error, setError] = useState("");
  const [manualMode, setManualMode] = useState(false);

  // Extracted/Manual Course Structure
  const [courseName, setCourseName] = useState("");
  const [courseDesc, setCourseDesc] = useState("");
  const [units, setUnits] = useState([
    { unit_name: "Unit 1: Introduction", topics: [{ title: "", importance: "medium", estimated_minutes: 60 }] }
  ]);

  const handleFile = async (f) => {
    setFile(f);
    setError("");
    setExtractingText(true);
    setStep("review");

    try {
      if (f.name.toLowerCase().endsWith(".pdf")) {
        const text = await extractTextFromPDF(f);
        setFileText(text);
      } else {
        const reader = new FileReader();
        reader.onload = (e) => {
          setFileText(e.target.result || "");
        };
        reader.readAsText(f);
      }
    } catch (err) {
      console.warn("Text extraction warning:", err);
    } finally {
      setExtractingText(false);
    }
  };

  const extract = async (overrideText = null) => {
    const textToProcess = overrideText || (uploadMode === "paste" ? pastedText : fileText);
    if (!textToProcess && !file) {
      setError("Please select a file or paste syllabus text first.");
      return;
    }

    setBusy(true);
    setError("");
    setStep("extracting");

    try {
      let textToSend = textToProcess;
      if (!textToSend && file && file.name.toLowerCase().endsWith(".pdf")) {
        textToSend = await extractTextFromPDF(file);
        setFileText(textToSend);
      }

      const result = await base44.integrations.Core.ExtractCourse({
        text: textToSend || "",
        filename: file?.name || (courseName ? `${courseName}.txt` : "Syllabus.txt")
      });

      if (result.status !== "success" || !result.output) {
        throw new Error(result.error || "Extraction failed");
      }

      const data = result.output;
      setCourseName(data.course_name || file?.name?.replace(/\.[^/.]+$/, "") || "Course Syllabus");
      setCourseDesc(data.description || "");
      if (data.units && data.units.length > 0) {
        setUnits(data.units);
      }
      setStep("edit_extracted");
    } catch (err) {
      setError(err.message || "Something went wrong during extraction.");
      setStep("review");
    } finally {
      setBusy(false);
    }
  };

  const saveCourse = async () => {
    if (!courseName.trim()) {
      setError("Please provide a course title.");
      return;
    }

    const validUnits = units.filter(u => u.topics && u.topics.some(t => t.title && t.title.trim()));
    if (!validUnits.length) {
      setError("Please add at least one topic.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      const course = await base44.entities.Course.create({
        title: courseName.trim(),
        description: courseDesc.trim() || `Syllabus and topic plan for ${courseName.trim()}`,
      });

      const topics = [];
      let order = 0;

      validUnits.forEach((u, ui) => {
        (u.topics || []).forEach((t) => {
          if (t.title && t.title.trim()) {
            topics.push({
              course_id: course.id,
              unit: u.unit_name || `Unit ${ui + 1}`,
              title: t.title.trim(),
              order: order++,
              importance: t.importance || "medium",
              estimated_minutes: Number(t.estimated_minutes) || 60,
              prerequisites: t.prerequisites || [],
              status: "pending"
            });
          }
        });
      });

      if (topics.length) {
        await base44.entities.Topic.bulkCreate(topics);
      }

      navigate(`/courses/${course.id}`);
    } catch (err) {
      setError(err.message || "Failed to save course structure.");
      setBusy(false);
    }
  };

  const addUnit = () => setUnits(u => [...u, { unit_name: `Unit ${u.length + 1}`, topics: [{ title: "", importance: "medium", estimated_minutes: 60 }] }]);
  const removeUnit = (ui) => setUnits(u => u.filter((_, i) => i !== ui));
  const updateUnit = (ui, key, val) => setUnits(u => u.map((unit, i) => i === ui ? { ...unit, [key]: val } : unit));
  const addTopic = (ui) => setUnits(u => u.map((unit, i) => i === ui ? { ...unit, topics: [...unit.topics, { title: "", importance: "medium", estimated_minutes: 60 }] } : unit));
  const removeTopic = (ui, ti) => setUnits(u => u.map((unit, i) => i === ui ? { ...unit, topics: unit.topics.filter((_, j) => j !== ti) } : unit));
  const updateTopic = (ui, ti, key, val) => setUnits(u => u.map((unit, i) => i === ui ? { ...unit, topics: unit.topics.map((t, j) => j === ti ? { ...t, [key]: val } : t) } : unit));

  // Edit/Review Extracted Course Structure before saving
  if (step === "edit_extracted" || manualMode) {
    return (
      <div className="mx-auto max-w-3xl text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">
              {manualMode ? "MANUAL COURSE BUILDER" : "EXTRACTED TOPIC TREE"}
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {manualMode ? "Enter Course Details" : "Review Extracted Topics"}
            </h1>
            <p className="mt-1.5 text-sm text-zinc-400">
              Check units, adjust importance weights, and customize durations before generating study plans.
            </p>
          </div>
          <button
            onClick={() => { setManualMode(false); setStep("select"); setFile(null); }}
            className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-white/20 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 transition"
          >
            ← Upload another
          </button>
        </div>

        <div className="mt-8 space-y-6">
          {/* Course Info */}
          <div className="rounded-3xl border border-white/15 bg-zinc-950 p-6 space-y-4 shadow-sm">
            <h3 className="font-bold text-white text-base">Course Information</h3>
            <input
              value={courseName}
              onChange={e => setCourseName(e.target.value)}
              placeholder="Course Title (e.g. Database Management Systems)"
              className="w-full rounded-xl border border-white/15 bg-zinc-900 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-white/60 focus:outline-none focus:ring-1 focus:ring-white/20"
              required
            />
            <input
              value={courseDesc}
              onChange={e => setCourseDesc(e.target.value)}
              placeholder="Course Description or Code (e.g. CS302 - 4 Credits)"
              className="w-full rounded-xl border border-white/15 bg-zinc-900 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-white/60 focus:outline-none focus:ring-1 focus:ring-white/20"
            />
          </div>

          {/* Units and Topics */}
          {units.map((unit, ui) => (
            <div key={ui} className="rounded-3xl border border-white/15 bg-zinc-950 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <input
                  value={unit.unit_name}
                  onChange={e => updateUnit(ui, "unit_name", e.target.value)}
                  className="flex-1 rounded-xl border border-white/15 bg-zinc-900 px-3.5 py-2 text-sm font-bold text-white focus:border-white/60 focus:outline-none"
                  placeholder="Unit name (e.g. Unit 1: Relational Model)"
                />
                {units.length > 1 && (
                  <button type="button" onClick={() => removeUnit(ui)} className="text-zinc-500 hover:text-rose-400 p-1 transition" title="Delete unit">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="space-y-2.5">
                {unit.topics.map((topic, ti) => (
                  <div key={ti} className="flex items-center gap-2">
                    <input
                      value={topic.title}
                      onChange={e => updateTopic(ui, ti, "title", e.target.value)}
                      placeholder="Topic title (e.g. SQL Joins & Subqueries)"
                      className="flex-1 rounded-xl border border-white/15 bg-zinc-900 px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus:border-white/60 focus:outline-none"
                    />
                    <select
                      value={topic.importance}
                      onChange={e => updateTopic(ui, ti, "importance", e.target.value)}
                      className="rounded-xl border border-white/15 bg-zinc-900 px-2.5 py-2 text-xs text-white focus:border-white/60 focus:outline-none"
                      title="Importance weight"
                    >
                      <option value="high" className="bg-zinc-950 text-white">High (Exam Core)</option>
                      <option value="medium" className="bg-zinc-950 text-white">Medium (Standard)</option>
                      <option value="low" className="bg-zinc-950 text-white">Low (Optional)</option>
                    </select>
                    <input
                      type="number"
                      min="15"
                      max="180"
                      step="5"
                      value={topic.estimated_minutes}
                      onChange={e => updateTopic(ui, ti, "estimated_minutes", e.target.value)}
                      className="w-16 rounded-xl border border-white/15 bg-zinc-900 px-2 py-2 text-xs text-center text-white focus:border-white/60 focus:outline-none"
                      title="Estimated study minutes"
                    />
                    {unit.topics.length > 1 && (
                      <button type="button" onClick={() => removeTopic(ui, ti)} className="text-zinc-500 hover:text-rose-400 p-1 transition" title="Delete topic">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => addTopic(ui)} className="mt-2 text-xs text-zinc-400 hover:text-white flex items-center gap-1">
                  <Plus className="h-3.5 w-3.5" /> Add topic to {unit.unit_name || `Unit ${ui + 1}`}
                </button>
              </div>
            </div>
          ))}

          <button type="button" onClick={addUnit} className="flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition">
            <Plus className="h-4 w-4" /> Add new unit / module
          </button>

          {error && <p role="alert" className="text-sm text-rose-400 font-medium">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => { setManualMode(false); setStep("select"); }}
              className="rounded-xl border border-white/20 bg-zinc-900 hover:bg-zinc-800 px-5 py-3 text-sm font-semibold text-zinc-300 hover:text-white transition"
            >
              ← Cancel
            </button>
            <button
              disabled={busy}
              onClick={saveCourse}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white text-black hover:bg-zinc-200 border border-white px-6 py-3 text-sm font-bold disabled:opacity-60 transition shadow-lg"
            >
              {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving Course…</> : <><CheckCircle2 className="h-4 w-4" /> Confirm & Save Course Library</>}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl text-white">
      <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">SYLLABUS & PLAN EXTRACTION</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight text-white sm:text-4xl">Upload a Course Plan</h1>
      <p className="mt-1.5 text-sm text-zinc-400">
        Upload any syllabus PDF, course outline, or text file. Our AI accurately parses all units, topics, and exam weights.
      </p>

      {/* Tabs: File Upload vs Direct Text Paste */}
      <div className="mt-8 flex rounded-2xl border border-white/15 bg-zinc-950 p-1.5 gap-1.5 shadow-sm">
        <button
          type="button"
          onClick={() => setUploadMode("file")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition ${
            uploadMode === "file"
              ? "bg-white text-black shadow-md"
              : "text-zinc-400 hover:text-white hover:bg-zinc-900"
          }`}
        >
          <UploadCloud className="h-4 w-4" /> Upload PDF / TXT File
        </button>
        <button
          type="button"
          onClick={() => setUploadMode("paste")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition ${
            uploadMode === "paste"
              ? "bg-white text-black shadow-md"
              : "text-zinc-400 hover:text-white hover:bg-zinc-900"
          }`}
        >
          <FileText className="h-4 w-4" /> Paste Syllabus Text
        </button>
      </div>

      <div className="mt-4 rounded-3xl border border-white/15 bg-zinc-950 p-8 shadow-sm">
        {uploadMode === "file" ? (
          <div>
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,text/plain,.txt,.pdf"
              className="hidden"
              onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])}
            />

            {!file ? (
              <button
                onClick={() => inputRef.current?.click()}
                className="flex w-full flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-white/20 bg-zinc-900/40 py-12 text-zinc-400 transition hover:border-white/50 hover:text-white"
              >
                <UploadCloud className="h-10 w-10 text-white/80" />
                <span className="text-sm font-semibold text-white">Choose a PDF or TXT course file</span>
                <span className="text-xs text-zinc-400">High-accuracy parsing of syllabus topics & modules</span>
              </button>
            ) : (
              <div className="flex items-center gap-3 rounded-2xl bg-zinc-900 border border-white/15 p-4">
                <FileText className="h-6 w-6 text-white" />
                <div className="flex-1 min-w-0">
                  <span className="block truncate text-sm font-semibold text-white">{file.name}</span>
                  {extractingText ? (
                    <span className="text-xs text-zinc-400 flex items-center gap-1.5 mt-0.5">
                      <Loader2 className="w-3 h-3 animate-spin text-white" /> Reading document text…
                    </span>
                  ) : (
                    <span className="text-xs text-emerald-400 mt-0.5 block">
                      ✓ {fileText ? `${fileText.length} characters parsed` : "Ready to extract"}
                    </span>
                  )}
                </div>
                <button onClick={() => { setFile(null); setFileText(""); setStep("select"); }} className="text-xs text-zinc-400 hover:text-rose-400">
                  Remove
                </button>
              </div>
            )}

            {file && (
              <div className="mt-6">
                <button
                  disabled={busy || extractingText}
                  onClick={() => extract()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-white text-black hover:bg-zinc-200 border border-white px-5 py-3 text-sm font-semibold disabled:opacity-60 transition shadow-md"
                >
                  {busy ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Extracting accurate topics with AI…</>
                  ) : (
                    <><Sparkles className="h-4 w-4" /> Extract Course Structure</>
                  )}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Paste Syllabus / Course Outline Text</span>
              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Paste your course syllabus here (e.g. CS530 ARTIFICIAL INTELLIGENCE&#10;&#10;Introduction: Turing Test - Intelligent Agents...&#10;Problem-Solving Methods: Search Strategies - Informed Search...)"
                rows={10}
                className="mt-2 w-full rounded-2xl border border-white/15 bg-zinc-900 p-4 text-sm text-white placeholder-zinc-500 focus:border-white/60 focus:outline-none focus:ring-1 focus:ring-white/20 font-mono"
              />
            </label>

            <button
              disabled={busy || !pastedText.trim()}
              onClick={() => extract(pastedText)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-white text-black hover:bg-zinc-200 border border-white px-5 py-3 text-sm font-semibold disabled:opacity-60 transition shadow-md"
            >
              {busy ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Extracting accurate topics with AI…</>
              ) : (
                <><Sparkles className="h-4 w-4" /> Parse Pasted Syllabus Topics</>
              )}
            </button>
          </div>
        )}

        {error && <p role="alert" className="mt-4 text-sm text-rose-400 font-medium">{error}</p>}
      </div>

      <div className="mt-6 rounded-3xl border border-white/15 bg-zinc-950 p-5 flex items-center justify-between shadow-sm">
        <div>
          <p className="text-sm font-semibold text-white">Prefer to enter manually?</p>
          <p className="text-xs text-zinc-400 mt-0.5">Type in your course units and topics directly</p>
        </div>
        <button
          onClick={() => { setManualMode(true); setStep("manual"); }}
          className="rounded-xl border border-white/20 bg-zinc-900 hover:bg-zinc-800 px-4 py-2 text-xs font-semibold text-white transition"
        >
          Manual entry →
        </button>
      </div>
    </div>
  );
}