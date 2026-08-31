import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  Loader2, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  Sparkles, 
  Bot,
  User,
  HeartHandshake
} from 'lucide-react';

const QUICK_BUTTONS = [
  { label: "I'm overwhelmed", message: "I'm overwhelmed with everything I have to do." },
  { label: "I need motivation", message: "I don't feel motivated to study right now." },
  { label: "I'm scared about my exam", message: "I'm scared about my exam coming up." },
  { label: "I procrastinated", message: "I procrastinated and now I'm behind." },
  { label: "I need encouragement", message: "I need some encouragement to keep going." },
  { label: "I completed my goal", message: "I just completed my study goal for today!" }
];

export default function CharacterUI({
  characterName = "Mira",
  emotion = "calm",
  messages = [],
  input = "",
  setInput,
  onSend,
  isTyping = false,
  isSpeaking = false,
  isMuted = false,
  onToggleMute,
  viewMode = "portrait",
  onToggleViewMode
}) {
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const viewModeLabel = {
    portrait: "Face View",
    full: "Full Body"
  }[viewMode] || "Focus";

  return (
    <div className="flex flex-col h-full bg-black border-l border-white/20 text-white select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/20 bg-zinc-950/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-2xl bg-zinc-900 border border-white/20 flex items-center justify-center text-white font-bold shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-black ${isSpeaking ? 'bg-emerald-400 animate-pulse' : 'bg-emerald-500'}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-base leading-tight tracking-wide text-white">{characterName}</h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-900 border border-white/15 text-zinc-300 font-medium uppercase tracking-wider">
                3D AI Companion
              </span>
            </div>
            <p className="text-xs text-zinc-400 capitalize flex items-center gap-1.5 mt-0.5">
              <span>Mood:</span>
              <span className="text-white font-medium">{emotion}</span>
              {isSpeaking && <span className="text-emerald-400 font-medium text-[11px]">· Speaking</span>}
            </p>
          </div>
        </div>

        {/* Action Controls with thin white line */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleViewMode}
            title={`Current: ${viewModeLabel}. Click to switch view.`}
            className="p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white border border-white/20 transition flex items-center gap-1.5 text-xs font-medium shadow-sm hover:border-white/40"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px] font-medium">{viewModeLabel}</span>
          </button>
          <button
            onClick={onToggleMute}
            title={isMuted ? 'Unmute Voice' : 'Mute Voice'}
            className={`p-2.5 rounded-xl transition border shadow-sm ${
              isMuted
                ? 'bg-rose-950/40 text-rose-300 border-rose-500/40 hover:bg-rose-950/60'
                : 'bg-zinc-900 hover:bg-zinc-800 text-white border-white/20 hover:border-white/40'
            }`}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Message History */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-black">
        <AnimatePresence initial={false}>
          {messages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.25 }}
              className={`flex items-start gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role !== 'user' && (
                <div className="w-7 h-7 rounded-xl bg-zinc-900 border border-white/15 flex items-center justify-center shrink-0 mt-0.5 text-xs text-white">
                  <Bot className="w-4 h-4" />
                </div>
              )}
              
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-zinc-900 text-white border border-white/30 shadow-md rounded-tr-sm'
                    : 'bg-zinc-950 text-zinc-100 border border-white/15 shadow-sm rounded-tl-sm'
                }`}
              >
                {msg.content}
              </div>

              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-xl bg-zinc-900 border border-white/20 flex items-center justify-center shrink-0 mt-0.5 text-xs text-zinc-300">
                  <User className="w-4 h-4" />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {isTyping && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 text-zinc-400 text-xs px-2 py-1"
          >
            <div className="w-6 h-6 rounded-xl bg-zinc-900 border border-white/15 flex items-center justify-center">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
            </div>
            <span>{characterName} is reflecting…</span>
          </motion.div>
        )}

        <div ref={scrollRef} />
      </div>

      {/* Quick Prompts Area */}
      <div className="px-4 pt-3 pb-2 border-t border-white/15 bg-zinc-950/60">
        <p className="text-[11px] text-zinc-400 font-medium mb-2 uppercase tracking-wider flex items-center gap-1.5">
          <HeartHandshake className="w-3.5 h-3.5 text-zinc-300" /> Quick support:
        </p>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_BUTTONS.map((q) => (
            <button
              key={q.label}
              disabled={isTyping}
              onClick={() => onSend(q.message)}
              className="text-xs bg-zinc-900 hover:bg-zinc-800 active:scale-95 disabled:opacity-40 rounded-xl px-3 py-1.5 text-zinc-200 border border-white/15 hover:border-white/40 transition duration-150 shadow-sm"
            >
              {q.label}
            </button>
          ))}
        </div>
      </div>

      {/* Message Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSend();
        }}
        className="p-4 pt-3 border-t border-white/20 flex items-center gap-2 bg-zinc-950"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Talk with ${characterName} about your study day…`}
          disabled={isTyping}
          className="flex-1 bg-zinc-900 text-white placeholder-zinc-500 text-sm rounded-xl px-4 py-3 outline-none border border-white/20 focus:border-white/60 focus:ring-1 focus:ring-white/20 transition disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isTyping || !input.trim()}
          className="h-11 w-11 flex items-center justify-center rounded-xl bg-white text-black hover:bg-zinc-200 disabled:opacity-30 disabled:hover:bg-white transition shrink-0 border border-white shadow-lg"
        >
          {isTyping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </form>
    </div>
  );
}
