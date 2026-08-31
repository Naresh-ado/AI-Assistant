import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient as base44 } from "@/api/apiClient";
import { ArrowRight, BrainCircuit, Loader2 } from "lucide-react";
import ChoiceGroup from "@/components/onboarding/ChoiceGroup";
import CompanionChoice from "@/components/onboarding/CompanionChoice";

const styles = [
  { value: "reading", label: "Reading" },
  { value: "videos", label: "Videos" },
  { value: "practice", label: "Practice" },
  { value: "notes", label: "Notes" },
  { value: "mixed", label: "Mixed" }
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [profileId, setProfileId] = useState(null);
  const [form, setForm] = useState({
    display_name: "",
    age_range: "18_20",
    companion: "mira",
    preferred_study_time: "evening",
    daily_available_hours: 4,
    learning_style: "practice",
    focus_duration_minutes: 40,
    concept_pace: "moderate",
    problem_solving_pace: "moderate",
    difficulty_comfort: "steady",
    motivation_style: "gentle"
  });

  useEffect(() => {
    base44.auth.me()
      .then((user) => base44.entities.StudentProfile.filter({ created_by_id: user?.id }, "-created_date", 1))
      .then((pList) => {
        const profile = pList?.[0];
        if (profile) {
          setProfileId(profile.id);
          setForm((current) => ({ ...current, ...profile }));
        }
      })
      .catch(() => {});
  }, []);

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.display_name.trim()) {
      setError("Please enter your display name.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      localStorage.setItem("aac_selected_companion", form.companion);
      const data = {
        ...form,
        onboarding_complete: true,
        calibration_complete: true,
        estimate_accuracy: 0.5
      };
      if (profileId) {
        await base44.entities.StudentProfile.update(profileId, data);
      } else {
        await base44.entities.StudentProfile.create(data);
      }
      navigate("/");
    } catch (err) {
      setError(err.message || "We couldn't save your profile.");
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white px-4 py-8 sm:py-12 flex items-center justify-center">
      <form onSubmit={submit} className="w-full max-w-3xl rounded-[2.5rem] border border-white/20 bg-zinc-950 p-6 sm:p-10 shadow-2xl space-y-6">
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-white text-black flex items-center justify-center font-bold">
              <BrainCircuit className="h-5 w-5" />
            </div>
            <div>
              <span className="text-xs font-bold tracking-widest uppercase block text-white">AI Academic Copilot</span>
              <span className="text-[10px] text-zinc-400">Personalized calibration</span>
            </div>
          </div>
          <button
            type="button"
            onClick={async () => {
              await base44.auth.logout();
              navigate("/login");
            }}
            className="text-xs font-medium text-zinc-400 hover:text-white border border-white/10 hover:border-white/30 rounded-xl px-3 py-1.5 transition"
          >
            Sign out / Log in
          </button>
        </div>

        <div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">Let’s learn how you study.</h1>
          <p className="mt-1 text-xs text-zinc-400">A quick academic productivity setup to calibrate your schedule and 3D companion.</p>
        </div>

        <div className="space-y-6">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">What should we call you?</span>
            <input
              value={form.display_name}
              onChange={(e) => set("display_name", e.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/15 bg-zinc-900 px-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-white/60 focus:outline-none focus:ring-1 focus:ring-white/20 transition"
              placeholder="Your name or nickname"
              required
            />
          </label>

          <CompanionChoice value={form.companion} onChange={(v) => set("companion", v)} />

          <ChoiceGroup label="How do you learn best?" value={form.learning_style} options={styles} onChange={(v) => set("learning_style", v)} />

          <div className="grid gap-4 sm:grid-cols-2 rounded-3xl border border-white/15 bg-zinc-900/50 p-5">
            <label className="block">
              <span className="text-xs font-medium text-zinc-300">Study hours per day: <strong className="text-white">{form.daily_available_hours}h</strong></span>
              <input
                aria-label="Daily available study hours"
                type="range"
                min="1"
                max="10"
                step="0.5"
                value={form.daily_available_hours}
                onChange={(e) => set("daily_available_hours", Number(e.target.value))}
                className="mt-3 w-full accent-white bg-zinc-800"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-zinc-300">Focus block duration: <strong className="text-white">{form.focus_duration_minutes} min</strong></span>
              <input
                aria-label="Focus duration"
                type="range"
                min="20"
                max="90"
                step="5"
                value={form.focus_duration_minutes}
                onChange={(e) => set("focus_duration_minutes", Number(e.target.value))}
                className="mt-3 w-full accent-white bg-zinc-800"
              />
            </label>
          </div>
        </div>

        {error && <p role="alert" className="text-sm text-rose-400 font-medium">{error}</p>}

        <button
          disabled={saving}
          type="submit"
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-white text-black hover:bg-zinc-200 border border-white px-6 py-4 font-bold text-sm transition shadow-xl disabled:opacity-60"
        >
          {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Setting up your profile…</> : <>Create My Learning Baseline <ArrowRight className="h-4 w-4" /></>}
        </button>
      </form>
    </main>
  );
}