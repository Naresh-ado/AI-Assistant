import React, { useEffect, useState } from "react";
import { apiClient as base44 } from "@/api/apiClient";
import CompanionScene from "@/components/companion/CompanionScene";
import { getCompanionConfig } from "@/lib/companions";
import { Loader2 } from "lucide-react";

export default function Companion() {
  const [profile, setProfile] = useState(null);
  const [context, setContext] = useState("");
  const [initialMessages, setInitialMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const user = await base44.auth.me();
        const pList = await base44.entities.StudentProfile.filter({ created_by_id: user?.id }, "-created_date", 1);
        const p = pList?.[0] || null;
        setProfile(p);

        const [plans, tasks] = await Promise.all([
          base44.entities.StudyPlan.filter({ created_by_id: user?.id, status: "active" }, "-created_date", 1),
          base44.entities.AcademicTask.filter({ status: "pending" }, "due_date", 5)
        ]);

        let nextSession = null;
        if (plans?.[0]) {
          const s = await base44.entities.PlanSession.filter({ plan_id: plans[0].id, status: "pending" }, "day", 1);
          nextSession = s?.[0] || null;
        }

        const summary = buildContextSummary(p, plans?.[0], nextSession, tasks || []);
        setContext(summary);

        const recent = await base44.entities.CompanionMessage.filter({ created_by_id: user?.id }, "-created_date", 10);
        const initial = recent ? recent.reverse() : [];

        if (initial.length === 0) {
          initial.push({
            role: "companion",
            content: greeting(p),
            emotion: "reassuring",
            animation: "gentle_nod"
          });
        }

        setInitialMessages(initial);
      } catch (err) {
        console.error("Companion page init error:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
          <p className="text-sm font-medium text-zinc-400">Connecting to your 3D companion…</p>
        </div>
      </div>
    );
  }

  const selectedCompanionId = profile?.companion || localStorage.getItem("aac_selected_companion") || "mira";
  const companionConfig = getCompanionConfig(selectedCompanionId);

  return (
    <div className="mx-auto max-w-7xl h-full">
      <CompanionScene
        characterName={companionConfig.name}
        characterModelUrl={companionConfig.modelUrl}
        companionConfig={companionConfig}
        initialEmotion="reassuring"
        studentContext={context}
        initialMessages={initialMessages}
      />
    </div>
  );
}

function buildContextSummary(profile, plan, nextSession, tasks) {
  const parts = [];
  if (profile) {
    parts.push(`Student: ${profile.display_name}. Focus ${profile.focus_duration_minutes || 40}m, ${profile.daily_available_hours || 4}h/day. Motivation style: ${profile.motivation_style || "gentle"}.`);
  }
  if (plan) {
    parts.push(`Active plan: ${plan.course_title}, due ${plan.target_date}, workload ${plan.workload_level}.`);
  }
  if (nextSession) {
    parts.push(`Next session: ${nextSession.topic_title} (${nextSession.duration_minutes}m).`);
  }
  if (tasks.length) {
    parts.push(`Pending tasks: ${tasks.map((t) => t.title).join(", ")}.`);
  }
  return parts.join(" ");
}

function greeting(profile) {
  const h = new Date().getHours();
  const part = h < 12 ? "morning" : h < 18 ? "afternoon" : "evening";
  return `Good ${part}. I'm here by your side. Whatever you're feeling about your studies today, we'll take it one step at a time.`;
}