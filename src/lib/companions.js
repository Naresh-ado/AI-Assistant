// Modular companion character definitions & VRM avatar mapping

export const CHARACTERS = {
  mira: {
    id: "mira",
    name: "Mira",
    pronoun: "she",
    gender: "female",
    role: "Academic Companion",
    tagline: "Warm, steady encouragement",
    description: "Supportive mentor with white hair and patient guidance.",
    modelUrl: "/AvatarModels/Girl/4790635951276610274.vrm",
    voicePitch: 1.1,
    voiceRate: 1.0,
    voiceGender: "female"
  },
  ren: {
    id: "ren",
    name: "Ren",
    pronoun: "he",
    gender: "male",
    role: "Analytical Strategist",
    tagline: "Calm, focused guidance & discipline",
    description: "Sharp and structured companion who keeps your study sessions on track.",
    modelUrl: "/AvatarModels/Boy/1107255136407203461.vrm",
    voicePitch: 0.90,
    voiceRate: 1.02,
    voiceGender: "male"
  },
  hana: {
    id: "hana",
    name: "Hana",
    pronoun: "she",
    gender: "female",
    role: "Energetic Coach",
    tagline: "High-energy motivation & cheer",
    description: "Enthusiastic and motivating partner who celebrates every completed session.",
    modelUrl: "/AvatarModels/Girl/4976500629603652360.vrm",
    voicePitch: 1.15,
    voiceRate: 1.04,
    voiceGender: "female"
  },
  aoi: {
    id: "aoi",
    name: "Aoi",
    pronoun: "she",
    gender: "female",
    role: "Mindful Mentor",
    tagline: "Gentle, thoughtful reflections",
    description: "Empathetic listener helping you navigate exam stress and recover focus.",
    modelUrl: "/AvatarModels/Girl/5244609761843871363.vrm",
    voicePitch: 1.05,
    voiceRate: 0.98,
    voiceGender: "female"
  }
};

export const DEFAULT_COMPANION = "mira";

export function getCompanionConfig(id) {
  return CHARACTERS[id] || CHARACTERS.mira;
}

// Emotion -> avatar parameters
export const EMOTIONS = {
  neutral: { eyes: "calm", mouth: "soft", brow: 0, tilt: 0, glow: 0.25 },
  happy: { eyes: "smile", mouth: "smile", brow: 0, tilt: -2, glow: 0.5 },
  reassuring: { eyes: "soft", mouth: "soft", brow: -1, tilt: 3, glow: 0.4 },
  concerned: { eyes: "concern", mouth: "flat", brow: 2, tilt: -3, glow: 0.2 },
  empathetic: { eyes: "soft", mouth: "small", brow: 1, tilt: 4, glow: 0.45 },
  excited: { eyes: "wide", mouth: "grin", brow: -1, tilt: -4, glow: 0.7 },
  celebrating: { eyes: "wide", mouth: "grin", brow: -2, tilt: -6, glow: 0.85 },
  thinking: { eyes: "look", mouth: "flat", brow: 0, tilt: 5, glow: 0.3 },
  calm: { eyes: "calm", mouth: "soft", brow: 0, tilt: 0, glow: 0.35 },
  encouraging: { eyes: "smile", mouth: "smile", brow: 0, tilt: -3, glow: 0.55 }
};

export function moodBackground(emotion) {
  const map = {
    neutral: ["#000000", "#09090b"],
    happy: ["#000000", "#18181b"],
    reassuring: ["#000000", "#18181b"],
    concerned: ["#000000", "#09090b"],
    empathetic: ["#000000", "#18181b"],
    excited: ["#000000", "#27272a"],
    celebrating: ["#000000", "#27272a"],
    thinking: ["#000000", "#09090b"],
    calm: ["#000000", "#09090b"],
    encouraging: ["#000000", "#18181b"]
  };
  return map[emotion] || map.neutral;
}