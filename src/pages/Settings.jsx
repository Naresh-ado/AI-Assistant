import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient as base44 } from "@/api/apiClient";
import { CHARACTERS } from "@/lib/companions";
import { Loader2, Trash2, Save, Check, ShieldAlert } from "lucide-react";

export default function Settings() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(undefined);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const user = await base44.auth.me();
        const pList = await base44.entities.StudentProfile.filter({ created_by_id: user?.id }, "-created_date", 1);
        const p = pList?.[0] || null;
        setProfile(p);
        
        const storedCompanion = localStorage.getItem("aac_selected_companion") || p?.companion || "mira";
        
        setForm(p ? { ...p, companion: storedCompanion } : {
          display_name: user?.full_name || (user?.email ? user.email.split('@')[0] : "Student"),
          companion: storedCompanion,
          daily_available_hours: 4,
          focus_duration_minutes: 40,
          motivation_style: "gentle",
          preferred_study_time: "evening"
        });
        setReduced(Boolean(localStorage.getItem("aac_reducedMotion")));
      } catch (err) {
        console.error("Settings load error:", err);
      }
    })();
  }, []);

  if (profile === undefined) {
    return (
      <div className="flex h-64 items-center justify-center bg-black">
        <Loader2 className="h-6 w-6 animate-spin text-white" />
      </div>
    );
  }

  const save = async () => {
    setSaving(true);
    try {
      localStorage.setItem("aac_selected_companion", form.companion);
      localStorage.setItem("aac_reducedMotion", reduced ? "1" : "");

      if (profile?.id) {
        await base44.entities.StudentProfile.update(profile.id, {
          display_name: form.display_name,
          companion: form.companion,
          daily_available_hours: form.daily_available_hours,
          focus_duration_minutes: form.focus_duration_minutes,
          motivation_style: form.motivation_style,
          preferred_study_time: form.preferred_study_time
        });
      } else {
        const created = await base44.entities.StudentProfile.create({
          ...form,
          onboarding_complete: true,
          calibration_complete: true,
          estimate_accuracy: 0.5
        });
        setProfile(created);
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      alert("Failed to save settings: " + (err.message || err));
    } finally {
      setSaving(false);
    }
  };

  const deleteAccountData = async () => {
    if (!confirm("Delete all your academic data (courses, plans, tasks, conversations)? This cannot be undone.")) return;
    const user = await base44.auth.me();
    if (!user) return;

    const plans = await base44.entities.StudyPlan.filter({ created_by_id: user.id });
    for (const p of plans) {
      await base44.entities.PlanSession.deleteMany({ plan_id: p.id });
      await base44.entities.StudyPlan.delete(p.id);
    }

    const courses = await base44.entities.Course.filter({ created_by_id: user.id });
    for (const c of courses) {
      await base44.entities.Topic.deleteMany({ course_id: c.id });
      await base44.entities.Course.delete(c.id);
    }

    await base44.entities.AcademicTask.deleteMany({ created_by_id: user.id });
    await base44.entities.CompanionMessage.deleteMany({ created_by_id: user.id });
    alert("Your academic data has been deleted.");
    window.location.reload();
  };

  return (
    <div className="mx-auto max-w-3xl text-white">
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">SETTINGS & PREFERENCES</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-white sm:text-4xl">System & Companion</h1>
        <p className="mt-1.5 text-sm text-zinc-400">Customize your 3D companion avatar, voice persona, and study capacity.</p>
      </div>

      {form && (
        <div className="space-y-6">
          {/* 1. Companion Avatar Model Selection (4 Models) */}
          <Section title="3D AI Companion Avatar & Voice" subtitle="Choose your 3D character. When chosen, this model and its corresponding voice are loaded in the Companion page.">
            <div className="grid gap-3 sm:grid-cols-2">
              {Object.values(CHARACTERS).map((c) => {
                const isSelected = form.companion === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setForm({ ...form, companion: c.id })}
                    className={`relative rounded-2xl p-4 text-left border transition-all duration-150 flex flex-col justify-between ${
                      isSelected
                        ? "bg-zinc-900 border-white text-white shadow-lg ring-1 ring-white/30"
                        : "bg-zinc-950 border-white/15 text-zinc-300 hover:border-white/40 hover:bg-zinc-900/60"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-base text-white">{c.name}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider border ${
                            c.gender === 'male' 
                              ? 'bg-blue-950/60 text-blue-300 border-blue-500/30' 
                              : 'bg-purple-950/60 text-purple-300 border-purple-500/30'
                          }`}>
                            {c.gender === 'male' ? 'Boy (Male Voice)' : 'Girl (Female Voice)'}
                          </span>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-white text-black flex items-center justify-center shrink-0">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400 mt-1 font-medium">{c.tagline}</p>
                      <p className="text-[11px] text-zinc-400 mt-2 line-clamp-2 leading-relaxed">{c.description}</p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-zinc-400">
                      <span>Folder: {c.gender === 'male' ? 'AvatarModels/Boy' : 'AvatarModels/Girl'}</span>
                      <span className="text-zinc-300 font-medium">3D VRM</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </Section>

          {/* 2. Account Profile */}
          <Section title="Account & Identity" subtitle="Your name used by the AI companion during study check-ins.">
            <Input
              label="Display Name"
              value={form.display_name}
              onChange={(v) => setForm({ ...form, display_name: v })}
            />
          </Section>

          {/* 3. Study Capacity */}
          <Section title="Daily Study Capacity" subtitle="Controls pacing and automatic workload distribution.">
            <div className="grid gap-5 sm:grid-cols-2">
              <Range
                label={`Daily Study Hours: ${form.daily_available_hours}h`}
                min="1"
                max="10"
                step="0.5"
                value={form.daily_available_hours}
                onChange={(v) => setForm({ ...form, daily_available_hours: v })}
              />
              <Range
                label={`Focus Block Duration: ${form.focus_duration_minutes}m`}
                min="20"
                max="90"
                step="5"
                value={form.focus_duration_minutes}
                onChange={(v) => setForm({ ...form, focus_duration_minutes: v })}
              />
            </div>
          </Section>

          {/* 4. Motivation Tone */}
          <Section title="Motivation Persona" subtitle="How your companion communicates and encourages you.">
            <div className="flex flex-wrap gap-2.5">
              {[
                { id: "gentle", label: "Gentle & Calming" },
                { id: "direct", label: "Direct & Structured" },
                { id: "celebratory", label: "Celebratory & Energetic" }
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setForm({ ...form, motivation_style: m.id })}
                  className={`rounded-xl px-4 py-2 text-xs font-semibold border transition ${
                    form.motivation_style === m.id
                      ? "bg-white text-black border-white shadow-md"
                      : "bg-zinc-950 text-zinc-300 border-white/15 hover:border-white/40 hover:bg-zinc-900"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </Section>

          {/* 5. Accessibility */}
          <Section title="Accessibility & Motion" subtitle="Visual comfort settings.">
            <label className="flex items-center gap-3 text-sm text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={reduced}
                onChange={(e) => setReduced(e.target.checked)}
                className="h-4 w-4 rounded accent-white bg-zinc-900 border-white/20"
              />
              <span>Reduce companion motion & idle animation intensity</span>
            </label>
          </Section>

          {/* Save Button */}
          <div className="flex items-center gap-4 pt-2">
            <button
              onClick={save}
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-white text-black hover:bg-zinc-200 border border-white px-6 py-3 text-sm font-semibold disabled:opacity-50 transition shadow-lg"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              <span>{saving ? "Saving Changes…" : "Save All Settings"}</span>
            </button>
            {saved && (
              <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5 animate-fade-in">
                <Check className="w-4 h-4" /> Preferences and model selection saved!
              </span>
            )}
          </div>
        </div>
      )}

      {/* Danger Zone: Account & Data */}
      <div className="mt-12 rounded-3xl border border-rose-500/20 bg-zinc-950 p-6">
        <div className="flex items-center gap-2 text-rose-400 font-semibold text-sm">
          <ShieldAlert className="w-4 h-4" />
          <h3>Privacy & Data Reset</h3>
        </div>
        <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
          Your academic data, courses, study plans, and conversation histories are private to your local session.
          You can delete all generated records below at any time.
        </p>
        <button
          onClick={deleteAccountData}
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-950/20 px-4 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-950/50 hover:border-rose-500/60 transition"
        >
          <Trash2 className="h-3.5 w-3.5" /> Delete all my academic data
        </button>
      </div>
    </div>
  );
}

function Section({ title, subtitle, children }) {
  return (
    <div className="rounded-3xl border border-white/15 bg-zinc-950 p-6 shadow-sm">
      <h3 className="font-semibold text-white text-base">{title}</h3>
      {subtitle && <p className="text-xs text-zinc-400 mt-0.5 mb-4">{subtitle}</p>}
      <div className={subtitle ? "" : "mt-4"}>{children}</div>
    </div>
  );
}

function Input({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-zinc-400">{label}</span>
      <input
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full rounded-xl border border-white/15 bg-zinc-900 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-white/60 focus:outline-none focus:ring-1 focus:ring-white/20 transition"
      />
    </label>
  );
}

function Range({ label, min, max, step, value, onChange }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-zinc-300">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-3 w-full accent-white bg-zinc-800"
      />
    </label>
  );
}