import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CHARACTERS, EMOTIONS, IDLE_BEHAVIORS } from "@/lib/companions";

const eyePath = (type, blink) => {
  if (blink) return "M0 0 L0 0.01";
  switch (type) {
    case "smile": return "M0 3 C 4 -2, 10 -2, 14 3";
    case "soft": return "M0 2 C 4 0, 10 0, 14 2";
    case "concern": return "M0 1 C 4 4, 10 4, 14 1";
    case "wide": return "M0 2 C 4 -1, 10 -1, 14 2 C 10 5, 4 5, 0 2 Z";
    case "look": return "M0 3 C 4 3, 10 3, 14 3";
    case "calm":
    default: return "M0 2.5 L 14 2.5";
  }
};

const mouthPath = (type) => {
  switch (type) {
    case "smile": return "M28 40 C 33 46, 47 46, 52 40";
    case "grin": return "M26 39 C 30 50, 50 50, 54 39 C 50 44, 30 44, 26 39 Z";
    case "small": return "M34 41 C 37 43, 43 43, 46 41";
    case "flat": return "M32 41 L 48 41";
    case "soft":
    default: return "M30 40 C 35 43, 45 43, 50 40";
  }
};

export default function CompanionAvatar({ characterId = "mira", emotion = "neutral", reducedMotion = false }) {
  const char = CHARACTERS[characterId] || CHARACTERS.mira;
  const e = EMOTIONS[emotion] || EMOTIONS.neutral;
  const p = char.palette;
  const [blink, setBlink] = useState(false);
  const [idle, setIdle] = useState("breathing");

  useEffect(() => {
    if (reducedMotion) return;
    const blinkTimer = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 140);
    }, 3500 + Math.random() * 2000);
    const idleTimer = setInterval(() => {
      if (emotion === "neutral" || emotion === "calm") {
        setIdle(IDLE_BEHAVIORS[Math.floor(Math.random() * IDLE_BEHAVIORS.length)]);
      }
    }, 6000);
    return () => { clearInterval(blinkTimer); clearInterval(idleTimer); };
  }, [emotion, reducedMotion]);

  const breathe = reducedMotion ? {} : { y: [0, -4, 0], transition: { duration: 4, repeat: Infinity, ease: "easeInOut" } };
  const tilt = reducedMotion ? {} : { rotate: [e.tilt, e.tilt + 1, e.tilt], transition: { duration: 5, repeat: Infinity, ease: "easeInOut" } };

  return (
    <div className="relative flex h-full w-full items-center justify-center">
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          className="rounded-full blur-3xl"
          style={{ width: "70%", height: "70%", background: p.glow, opacity: e.glow }}
          animate={reducedMotion ? {} : { scale: [1, 1.08, 1], opacity: [e.glow, e.glow * 1.3, e.glow] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
      <motion.svg viewBox="0 0 80 90" className="relative h-[78%] w-auto drop-shadow-2xl" animate={breathe}>
        <motion.g animate={tilt} style={{ originX: "40px", originY: "55px" }}>
          {/* shoulders */}
          <path d="M14 90 C 20 72, 60 72, 66 90 Z" fill={p.glow} opacity="0.9" />
          {/* neck */}
          <rect x="35" y="62" width="10" height="12" rx="4" fill={p.skin} />
          {/* hair back */}
          {char.hair === "long" && <path d="M18 40 C 14 62, 26 78, 30 74 C 30 60, 30 44, 30 44 Z M62 40 C 66 62, 54 78, 50 74 C 50 60, 50 44, 50 44 Z" fill={p.hair} />}
          {/* head */}
          <ellipse cx="40" cy="40" rx="18" ry="22" fill={p.skin} />
          {/* hair front */}
          {char.hair === "long"
            ? <path d="M22 32 C 26 18, 54 18, 58 32 C 54 26, 26 26, 22 32 Z" fill={p.hair} />
            : <path d="M22 30 C 26 20, 54 20, 58 30 C 50 24, 30 24, 22 30 Z" fill={p.hair} />}
          {/* eyebrows */}
          <line x1="28" y1={32 - e.brow} x2="35" y2={31 - e.brow} stroke={p.hair} strokeWidth="1.2" strokeLinecap="round" />
          <line x1="45" y1={31 - e.brow} x2="52" y2={32 - e.brow} stroke={p.hair} strokeWidth="1.2" strokeLinecap="round" />
          {/* eyes */}
          <g>
            <motion.path d={eyePath(e.eyes, blink)} stroke={p.sky} strokeWidth="1.4" fill={e.eyes === "wide" ? p.sky : "none"} strokeLinecap="round" transform="translate(26 36)" />
            <motion.path d={eyePath(e.eyes, blink)} stroke={p.sky} strokeWidth="1.4" fill={e.eyes === "wide" ? p.sky : "none"} strokeLinecap="round" transform="translate(44 36)" />
          </g>
          {/* nose */}
          <path d="M40 40 L 39 43 L 41 43 Z" fill={p.skin} opacity="0.6" />
          {/* mouth */}
          <AnimatePresence mode="wait">
            <motion.path key={e.mouth} d={mouthPath(e.mouth)} stroke={p.lip} strokeWidth="1.6" fill={e.mouth === "grin" ? "#fff" : "none"} strokeLinecap="round" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} />
          </AnimatePresence>
          {/* idle accessory: reading book */}
          <AnimatePresence>
            {reducedMotion ? null : idle === "reading" && (emotion === "neutral" || emotion === "calm") && (
              <motion.g key="book" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <rect x="28" y="70" width="24" height="14" rx="2" fill="#fff" opacity="0.9" />
                <line x1="40" y1="70" x2="40" y2="84" stroke={p.glow} strokeWidth="1" />
              </motion.g>
            )}
          </AnimatePresence>
        </motion.g>
      </motion.svg>
    </div>
  );
}