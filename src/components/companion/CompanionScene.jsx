import React, { useState } from 'react';
import VRMCharacter from './VRMCharacter';
import CharacterUI from './CharacterUI';
import { ttsService } from '@/services/ttsService';
import { getCompanionResponse } from '@/services/companionService';

export default function CompanionScene({
  characterName = "Mira",
  characterModelUrl = "/AvatarModels/Girl/4790635951276610274.vrm",
  companionConfig = null,
  initialEmotion = "reassuring",
  studentContext = "",
  initialMessages = []
}) {
  const [emotion, setEmotion] = useState(initialEmotion);
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [viewMode, setViewMode] = useState("portrait"); // 'portrait' | 'full'
  const [supportedExpressions, setSupportedExpressions] = useState([]);

  const voiceGender = companionConfig?.voiceGender || (characterName === 'Ren' ? 'male' : 'female');
  const voicePitch = companionConfig?.voicePitch ?? (voiceGender === 'male' ? 0.90 : 1.1);

  // Handle TTS mute toggle
  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    ttsService.setMuted(nextMuted);
  };

  // Handle View Mode Toggle (portrait <-> full)
  const handleToggleViewMode = () => {
    setViewMode((prev) => prev === 'portrait' ? 'full' : 'portrait');
  };

  // Process message submission
  const handleSend = async (textToSend) => {
    const text = (textToSend ?? input).trim();
    if (!text || isTyping) return;

    const userMsg = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);
    setEmotion("thinking");

    try {
      const response = await getCompanionResponse(text, studentContext);
      
      const companionMsg = {
        role: "companion",
        content: response.message,
        emotion: response.emotion || "calm",
        animation: response.animation || "gentle_nod"
      };

      setMessages((prev) => [...prev, companionMsg]);
      setEmotion(companionMsg.emotion);

      // Play voice via TTS with character specific distinct voice
      ttsService.speak(companionMsg.content, {
        characterId: companionConfig?.id || (characterName === 'Ren' ? 'ren' : 'mira'),
        gender: voiceGender,
        pitch: voicePitch,
        onStart: () => setIsSpeaking(true),
        onEnd: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false)
      });

    } catch (err) {
      console.error("Companion response error:", err);
      const fallbackMsg = {
        role: "companion",
        content: "I'm right here with you. Let's take the next small step together.",
        emotion: "reassuring"
      };
      setMessages((prev) => [...prev, fallbackMsg]);
      setEmotion("reassuring");
    } finally {
      setIsTyping(false);
    }
  };

  const viewModeLabel = {
    portrait: "Face View",
    full: "Full Body"
  }[viewMode] || "Focus";

  return (
    <div 
      className="relative w-full h-[84vh] min-h-[600px] rounded-[2.5rem] bg-black border border-white/20 shadow-2xl overflow-hidden grid lg:grid-cols-[1.25fr_1fr]"
    >
      {/* 3D Character Stage */}
      <div className="relative w-full h-full min-h-[350px] flex items-stretch justify-stretch overflow-hidden bg-gradient-to-b from-zinc-950 via-black to-zinc-950">
        {/* Soft Ambient Radial Vignette */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[500px] h-[500px] rounded-full bg-white/[0.03] blur-3xl pointer-events-none" />
        </div>

        {/* 3D VRM Canvas */}
        <VRMCharacter
          key={characterModelUrl}
          modelUrl={characterModelUrl}
          emotion={emotion}
          isSpeaking={isSpeaking}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onExpressionsLoaded={setSupportedExpressions}
        />

        {/* View Mode, Character Name & Mood Badges with thin white line */}
        <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2 pointer-events-none">
          <span className="text-[11px] px-3 py-1 rounded-full bg-black/90 backdrop-blur-md text-white border border-white/20 capitalize font-medium shadow-sm">
            {characterName}
          </span>
          <span className="text-[11px] px-3 py-1 rounded-full bg-black/80 backdrop-blur-md text-zinc-300 border border-white/20 capitalize font-medium shadow-sm">
            {viewModeLabel}
          </span>
          <span className="text-[11px] px-3 py-1 rounded-full bg-black/80 backdrop-blur-md text-zinc-300 border border-white/20 capitalize font-medium shadow-sm">
            {emotion}
          </span>
        </div>
      </div>

      {/* Interactive Conversation UI */}
      <div className="relative w-full h-full overflow-hidden bg-black">
        <CharacterUI
          characterName={characterName}
          emotion={emotion}
          messages={messages}
          input={input}
          setInput={setInput}
          onSend={handleSend}
          isTyping={isTyping}
          isSpeaking={isSpeaking}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          viewMode={viewMode}
          onToggleViewMode={handleToggleViewMode}
          supportedExpressions={supportedExpressions}
        />
      </div>
    </div>
  );
}
