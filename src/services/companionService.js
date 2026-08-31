import { apiClient as base44 } from '@/api/apiClient';

/**
 * High-impact fallback responses for common student emotions / quick buttons
 */
const DEMO_RESPONSES = {
  "overwhelmed": {
    message: "I hear you — everything feels heavy right now. Take a slow breath. We don't need to conquer the entire syllabus today, just one single 20-minute block.",
    emotion: "empathetic",
    animation: "gentle_nod"
  },
  "scared": {
    message: "Exams can feel intimidating, but your preparation builds one concept at a time. Let's focus on the highest-yield topics first and build your confidence.",
    emotion: "reassuring",
    animation: "reassuring_tilt"
  },
  "motivated": {
    message: "That's completely normal. Motivation often follows action rather than preceding it. Try the 5-minute rule: start for just five minutes without pressure.",
    emotion: "encouraging",
    animation: "subtle_nod"
  },
  "procrastinated": {
    message: "No self-blame. What happened is in the past. What matters is the next hour. Let's look at your available time and make a realistic recovery plan.",
    emotion: "calm",
    animation: "gentle_nod"
  },
  "encouragement": {
    message: "You are more capable than you realize! Consistency beats cramming every single time. Keep showing up, and the results will follow.",
    emotion: "excited",
    animation: "celebrate"
  },
  "completed": {
    message: "Fantastic job completing your goal! That's real academic momentum. Celebrate this milestone and take a well-deserved resting break.",
    emotion: "celebrating",
    animation: "celebrate"
  }
};

/**
 * Service to process companion queries using real AI backend or fallback
 */
export async function getCompanionResponse(userText, studentContext = "") {
  const lower = (userText || "").toLowerCase();

  // Try invoking backend LLM
  try {
    const prompt = `You are Mira, an empathetic, warm, and practical 3D AI academic emotional companion for a college student. You are NOT a therapist. Your job is to reduce academic overwhelm, point to the next concrete small step, celebrate progress, and never shame the student. Keep replies short (1-3 sentences), specific to their situation, and practical.

STUDENT CONTEXT:
${studentContext || "Undergraduate student managing courses and study plans."}

Student said: "${userText}"

Respond ONLY with valid JSON:
{
  "message": "Your short, warm, supportive response here (1-3 sentences)",
  "emotion": "one of [neutral, happy, reassuring, concerned, empathetic, thinking, excited, celebrating, calm, encouraging]",
  "animation": "one of [gentle_nod, reassuring_tilt, subtle_nod, celebrate, look_thoughtful]"
}`;

    const res = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          message: { type: "string" },
          emotion: { type: "string" },
          animation: { type: "string" }
        },
        required: ["message", "emotion"]
      }
    });

    if (res && res.message) {
      return {
        message: res.message,
        emotion: res.emotion || "reassuring",
        animation: res.animation || "gentle_nod"
      };
    }
  } catch (err) {
    console.warn("Backend AI call notice, using local response engine:", err.message);
  }

  // Smart fallback matching
  if (lower.includes("overwhelm") || lower.includes("too much") || lower.includes("stressed")) {
    return DEMO_RESPONSES.overwhelmed;
  }
  if (lower.includes("scared") || lower.includes("exam") || lower.includes("fail") || lower.includes("anxious")) {
    return DEMO_RESPONSES.scared;
  }
  if (lower.includes("motivat") || lower.includes("lazy") || lower.includes("tired")) {
    return DEMO_RESPONSES.motivated;
  }
  if (lower.includes("procrastinat") || lower.includes("behind") || lower.includes("wasted")) {
    return DEMO_RESPONSES.procrastinated;
  }
  if (lower.includes("encourag") || lower.includes("help me") || lower.includes("can't do")) {
    return DEMO_RESPONSES.encouragement;
  }
  if (lower.includes("complet") || lower.includes("finish") || lower.includes("done") || lower.includes("goal")) {
    return DEMO_RESPONSES.completed;
  }

  return {
    message: "I'm right here with you. Whatever challenges come up today, we'll break them down and tackle them one step at a time.",
    emotion: "reassuring",
    animation: "gentle_nod"
  };
}
