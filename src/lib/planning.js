// Transparent study-planning engine. Deterministic, explainable, no randomness.

export function minutesToHm(min) {
  const m = Math.max(0, Math.round(min));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0) return `${r}m`;
  if (r === 0) return `${h}h`;
  return `${h}h ${r}m`;
}

export function classNamesFor(level) {
  return {
    green: "bg-emerald-50 text-emerald-700 border-emerald-200",
    yellow: "bg-amber-50 text-amber-700 border-amber-200",
    orange: "bg-orange-50 text-orange-700 border-orange-200",
    red: "bg-rose-50 text-rose-700 border-rose-200"
  }[level] || "bg-slate-50 text-slate-700 border-slate-200";
}

const LEVEL_LABELS = {
  green: "Comfortably achievable",
  yellow: "Tight but achievable",
  orange: "High workload",
  red: "Currently unrealistic"
};

export function classifyWorkload(totalMin, availableMin) {
  if (availableMin <= 0) return { level: "red", label: LEVEL_LABELS.red, ratio: Infinity, reason: "No available study time was declared for this window." };
  const ratio = totalMin / availableMin;
  let level;
  if (ratio <= 0.85) level = "green";
  else if (ratio <= 1.0) level = "yellow";
  else if (ratio <= 1.25) level = "orange";
  else level = "red";
  const deficit = totalMin - availableMin;
  const reason = deficit > 0
    ? `${minutesToHm(totalMin)} of learning remain, but only ${minutesToHm(availableMin)} are available — a ${minutesToHm(deficit)} deficit.`
    : `${minutesToHm(totalMin)} of learning fit within ${minutesToHm(availableMin)} available with ${minutesToHm(-deficit)} to spare.`;
  return { level, label: LEVEL_LABELS[level], ratio, deficit, reason };
}

export function rangeTopics(topics, startId, endId) {
  const sorted = [...topics].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const i = sorted.findIndex((t) => t.id === startId);
  const j = sorted.findIndex((t) => t.id === endId);
  if (i === -1 || j === -1) return sorted;
  const [from, to] = i <= j ? [i, j] : [j, i];
  return sorted.slice(from, to + 1);
}

export function totalWorkload(topics) {
  return topics.reduce((sum, t) => sum + (t.estimated_minutes || 0), 0);
}

export function availableMinutes(targetDate, dailyHours, fromDate = new Date()) {
  const days = Math.max(1, Math.ceil((new Date(targetDate).getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)));
  return days * dailyHours * 60;
}

// Build a day-by-day plan. Sessions: study + practice per topic, plus revision for high-importance topics, capped by daily capacity.
export function generatePlan(topics, { dailyHours, targetDate, focusMinutes = 40, fromDate = new Date() }) {
  const cap = dailyHours * 60;
  const block = Math.max(20, focusMinutes);
  const breakLen = 10;

  const queue = [];
  topics.forEach((t) => {
    queue.push({ topic_id: t.id, topic_title: t.title, session_type: "study", duration_minutes: Math.max(20, t.estimated_minutes || block) });
    if (t.importance === "high" || t.estimated_minutes >= 60) {
      queue.push({ topic_id: t.id, topic_title: t.title, session_type: "practice", duration_minutes: Math.round((t.estimated_minutes || block) * 0.3) });
    }
  });
  // end-of-day revision block for high importance topics
  const highCount = topics.filter((t) => t.importance === "high").length;
  if (highCount > 0) {
    queue.push({ topic_id: "", topic_title: "Recall / Revision", session_type: "revision", duration_minutes: cap >= 180 ? 20 : 15 });
  }

  const days = [];
  let dayIndex = 1;
  let cursor = 0;
  let dayMinutes = 0;
  let dayDate = new Date(fromDate);
  dayDate.setHours(0, 0, 0, 0);

  const flushDay = () => {
    days.push({ day: dayIndex, date: new Date(dayDate).toISOString().slice(0, 10), sessions: [], used: dayMinutes });
  };

  let current = [];
  queue.forEach((item) => {
    if (dayMinutes + item.duration_minutes > cap && dayMinutes > 0) {
      flushDay();
      current = days[days.length - 1].sessions;
      dayIndex += 1;
      dayDate.setDate(dayDate.getDate() + 1);
      dayMinutes = 0;
    } else {
      if (days.length === 0) { flushDay(); current = days[0].sessions; }
    }
    const targetDay = days[days.length - 1];
    const start = targetDay.used;
    targetDay.sessions.push({ ...item, start_offset_minutes: start });
    targetDay.used = start + item.duration_minutes + (item.session_type === "study" ? breakLen : 0);
    dayMinutes = targetDay.used;
  });

  if (days.length === 0) flushDay();
  return days;
}

// Adapt: given completed sessions with actual minutes, recompute remaining topics' estimates using a learned pace factor.
export function learnPaceFactor(logs) {
  const done = logs.filter((l) => l.predicted_minutes && l.actual_minutes);
  if (done.length === 0) return 1;
  const sumRatio = done.reduce((s, l) => s + l.actual_minutes / l.predicted_minutes, 0);
  return Math.max(0.6, Math.min(1.8, sumRatio / done.length));
}

export function priorityReason(topic, logs) {
  const reasons = [];
  if (topic.prerequisites && topic.prerequisites.length) reasons.push(`It unlocks ${topic.prerequisites.length} downstream topic(s).`);
  if (topic.importance === "high") reasons.push("High exam importance.");
  if (topic.status !== "completed") reasons.push("Not completed yet.");
  return reasons;
}