import { Router } from 'express';
import { authMiddleware } from './auth.js';

const router = Router();

// ─── Call AI with multi-provider fallback ─────────────────────────────────────
async function callAI(messages, jsonMode = false) {
  // 1. Try Gemini (primary - fastest, working key)
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    const candidateModels = [
      process.env.GEMINI_MODEL || 'gemini-flash-lite-latest',
      'gemini-flash-latest',
      'gemini-2.5-flash'
    ];
    for (const model of candidateModels) {
      try {
        const geminiPrompt = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: geminiPrompt }] }],
              generationConfig: jsonMode
                ? { responseMimeType: 'application/json', temperature: 0.2 }
                : { temperature: 0.2 }
            })
          }
        );
        if (res.ok) {
          const data = await res.json();
          const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (content) return content;
        }
      } catch (e) {
        console.warn(`Gemini (${model}) warning:`, e.message);
      }
    }
  }

  // 2. Try Groq (Llama 3.3 — free, fast)
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    try {
      const body = {
        model: 'llama-3.3-70b-versatile',
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        temperature: 0.3
      };
      if (jsonMode) body.response_format = { type: 'json_object' };

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqKey}`
        },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) return content;
      }
    } catch (e) {
      console.warn('Groq call warning:', e.message);
    }
  }

  // 3. Try Mistral
  const mistralKey = process.env.MISTRAL_API_KEY;
  if (mistralKey && !mistralKey.startsWith('mock_')) {
    try {
      const body = {
        model: 'mistral-large-latest',
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        temperature: 0.3
      };
      if (jsonMode) body.response_format = { type: 'json_object' };

      const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mistralKey}`
        },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) return content;
      }
    } catch (e) {
      console.warn('Mistral call warning:', e.message);
    }
  }

  // 4. Try OpenAI
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    try {
      const body = {
        model: 'gpt-4o-mini',
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        temperature: 0.3
      };
      if (jsonMode) body.response_format = { type: 'json_object' };

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiKey}`
        },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) return content;
      }
    } catch (e) {
      console.warn('OpenAI call warning:', e.message);
    }
  }

  // 5. Try Local Ollama
  if (process.env.USE_OLLAMA === 'true' || process.env.OLLAMA_MODEL) {
    try {
      const model = process.env.OLLAMA_MODEL || 'llama3';
      const prompt = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');
      const res = await fetch('http://127.0.0.1:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt,
          stream: false,
          format: jsonMode ? 'json' : undefined
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.response) return data.response;
      }
    } catch (e) {
      // Ollama not running locally — silently skip
    }
  }

  return null;
}

// ─── Parse JSON safely from AI output ────────────────────────────────────────
function safeParseJSON(text) {
  if (!text) return null;
  const clean = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  try { return JSON.parse(clean); } catch { return null; }
}

// ─── POST /api/ai/extract-course ──────────────────────────────────────────────
router.post('/extract-course', authMiddleware, async (req, res) => {
  try {
    const { text, filename } = req.body;
    const cleanRawText = (text || '').trim();

    const systemMsg = `You are an expert Academic Syllabus Parser and Curriculum Architect.
Your task is to analyze the provided course syllabus text and extract a precise, high-fidelity academic topic tree.

Extraction Guidelines:
1. Identify the official Course Name (e.g. "Data Structures and Algorithms", "Database Management Systems", "Operating Systems", "Microeconomics").
2. Extract all Units, Modules, or Chapters in order.
3. Extract specific, granular, actionable topic titles (break down comma-separated lists into individual distinct topics).
4. Assign accurate 'importance':
   - "high": Core theoretical theorems, algorithms, heavily tested exam concepts, major architectural foundations.
   - "medium": Standard applications, methods, problem solving, analysis.
   - "low": Overviews, historical context, introductory summaries.
5. Assign realistic 'estimated_minutes' per topic (typically 45-90 minutes).
6. Filter out administrative noise (grading breakdown, instructor office hours, textbook ISBNs, attendance rules, page numbers).
7. Return ONLY clean, valid JSON matching the exact schema below.`;

    const userMsg = `Extract a clean, complete, structured course topic tree from this syllabus text:

Document filename: ${filename || 'Syllabus.pdf'}

--- SYLLABUS CONTENT ---
${cleanRawText ? cleanRawText.substring(0, 14000) : `Course: ${filename}`}
--- END SYLLABUS CONTENT ---

Return JSON in this EXACT structure:
{
  "course_name": "Accurate Full Course Title",
  "description": "2-sentence summary of the course scope and key topics covered.",
  "units": [
    {
      "unit_name": "Unit 1: Unit Title or Module Name",
      "topics": [
        {
          "title": "Specific Topic or Concept Name",
          "importance": "high" | "medium" | "low",
          "estimated_minutes": 60,
          "prerequisites": []
        }
      ]
    }
  ]
}`;

    const aiResult = await callAI([
      { role: 'system', content: systemMsg },
      { role: 'user', content: userMsg }
    ], true);

    if (aiResult) {
      const parsed = safeParseJSON(aiResult);
      if (parsed && parsed.units && Array.isArray(parsed.units) && parsed.units.length > 0) {
        // Validate that units have topics
        const cleanedUnits = parsed.units.map((u, i) => ({
          unit_name: u.unit_name || `Unit ${i + 1}`,
          topics: (u.topics || []).filter(t => t.title && t.title.trim()).map(t => ({
            title: t.title.trim(),
            importance: ['high', 'medium', 'low'].includes(t.importance) ? t.importance : 'medium',
            estimated_minutes: Number(t.estimated_minutes) || 60,
            prerequisites: Array.isArray(t.prerequisites) ? t.prerequisites : []
          }))
        })).filter(u => u.topics.length > 0);

        if (cleanedUnits.length > 0) {
          return res.json({
            status: 'success',
            output: {
              course_name: parsed.course_name || filename?.replace(/\.[^/.]+$/, '') || 'Extracted Course',
              description: parsed.description || `Comprehensive syllabus structure for ${parsed.course_name || 'this course'}.`,
              units: cleanedUnits
            }
          });
        }
      }
    }

    // High-Accuracy Rule-Based Fallback Parser for local parsing
    const parsedData = parseSyllabusRuleBased(cleanRawText, filename);
    return res.json({ status: 'success', output: parsedData });

  } catch (err) {
    console.error('extract-course error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── High-Accuracy Rule-Based Syllabus Parser ────────────────────────────────
function parseSyllabusRuleBased(rawText, filename) {
  if (!rawText || !rawText.trim()) {
    const courseName = filename ? filename.replace(/\.[^/.]+$/, '').replace(/[_\-]+/g, ' ') : 'Academic Course';
    return {
      course_name: courseName,
      description: `Course outline for ${courseName}`,
      units: []
    };
  }

  // Normalize line endings and characters
  let text = rawText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/Alpha\s*[-–—]\s*Beta/gi, 'Alpha-Beta')
    .replace(/First\s*[-–—]\s*Order/gi, 'First-Order')
    .replace(/Problem\s*[-–—]\s*Solving/gi, 'Problem-Solving')
    .replace(/Rule\s*[-–—]\s*Based/gi, 'Rule-Based')
    .replace(/[–—]/g, ' - ')
    .replace(/’/g, "'");

  // Remove page tags like [Page 1], [Page 2], etc.
  text = text.replace(/\[Page\s*\d+\]/gi, '');

  let rawLines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // 1. Extract Course Title from initial header lines
  let courseName = '';
  for (let i = 0; i < Math.min(rawLines.length, 15); i++) {
    const l = rawLines[i];
    const codeMatch = l.match(/^(?:course\s*[:\-]\s*)?([A-Z]{2,4}\s*\d{3,4}\s*[:\-]?\s*[A-Za-z\s]{3,})/i);
    if (codeMatch && codeMatch[1].length > 4) {
      courseName = codeMatch[1].trim();
      break;
    }
    if (/^[A-Z0-9\s\-:&]{5,60}$/.test(l) && !l.includes('MEETING') && !l.includes('UNIVERSITY') && !l.includes('DEPARTMENT') && !l.includes('PROGRAMME') && !l.includes('DEGREE')) {
      if (!courseName && l.length > 6) {
        courseName = l;
      }
    }
  }

  if (!courseName) {
    courseName = filename ? filename.replace(/\.[^/.]+$/, '').replace(/[_\-]+/g, ' ') : 'Academic Course';
  }

  // 2. Intelligent Syllabus Section Isolation:
  // Prefer the explicit "Syllabus" section if available
  let syllabusStartIndex = -1;
  let syllabusEndIndex = -1;

  for (let i = 0; i < rawLines.length; i++) {
    const l = rawLines[i];
    if (/^syllabus\b/i.test(l) && l.length < 30) {
      syllabusStartIndex = i + 1;
      break;
    }
  }

  if (syllabusStartIndex !== -1) {
    for (let i = syllabusStartIndex; i < rawLines.length; i++) {
      const l = rawLines[i];
      if (/^(course\s*contents\s*and\s*lecture\s*schedule|text\s*books?|reference\s*books?|references?|course\s*designers?|assessment\s*pattern)\b/i.test(l)) {
        syllabusEndIndex = i;
        break;
      }
    }
    if (syllabusEndIndex === -1) syllabusEndIndex = rawLines.length;
    rawLines = rawLines.slice(syllabusStartIndex, syllabusEndIndex);
  } else {
    for (let i = 0; i < rawLines.length; i++) {
      const l = rawLines[i];
      if (/^(course\s*contents\s*and\s*lecture\s*schedule|course\s*schedule|course\s*contents?)\b/i.test(l) && l.length < 50) {
        syllabusStartIndex = i + 1;
        break;
      }
    }

    const endMarkers = [
      /^(text\s*books?|reference\s*books?|references?|course\s*designer|course\s*designers?|assessment\s*pattern|evaluation\s*pattern|model\s*question|mini\s*project)/i,
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
    ];

    if (syllabusStartIndex !== -1) {
      for (let i = syllabusStartIndex; i < rawLines.length; i++) {
        const l = rawLines[i];
        if (endMarkers.some(p => p.test(l))) {
          syllabusEndIndex = i;
          break;
        }
      }
      if (syllabusEndIndex === -1) syllabusEndIndex = rawLines.length;
      rawLines = rawLines.slice(syllabusStartIndex, syllabusEndIndex);
    } else {
      for (let i = 0; i < rawLines.length; i++) {
        const l = rawLines[i];
        if (endMarkers.some(p => p.test(l))) {
          rawLines = rawLines.slice(0, i);
          break;
        }
      }
    }
  }

  // Administrative noise patterns
  const noisePatterns = [
    /^(passed in|approved in|board of studies|academic council|degree programme|curriculum|regulations?)/i,
    /^(category\s+[ltpc]|category\s*:|p\s*c\s*\d|l\s*t\s*p\s*c|\bpc\s*\d+\b|\bcredits?\b|\bhours?\b|\blecture\b)/i,
    /^(preamble|course objective|course outcome|assessment|evaluation|prerequisites?|text\s*books?|references?|outcomes?)/i,
    /^(course\s*contents\s*and\s*lecture\s*schedule|module\s*no\.?|s\.?no\.?|topic\s*name|no\.?\s*of\s*lectures?|co\s*mapped)/i,
    /^(course\s*designer|faculty|instructor|total\s*hours|total\s*lectures|mini\s*project\s*reviews)/i,
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
    /^page\s*\d+/i,
    /^\d+\s*(?:CO\d+)?$/i,
    /^CO\d+$/i,
    /^\d+\s*$/
  ];

  const isNoise = (line) => noisePatterns.some(p => p.test(line));

  const lines = rawLines.filter(l => !isNoise(l));

  // 3. Detect Syllabus Style & Extract Units/Topics
  const units = [];

  const splitSubTopics = (str) => {
    if (!str) return [];
    let cleaned = str
      .replace(/\s*\(\s*\d+\s*\)\s*$/g, '')
      .replace(/\s+\d+\s*(CO\d+)?$/i, '')
      .replace(/\s+CO\d+$/i, '')
      .trim();

    const parts = cleaned
      .split(/(?:\s+-\s+|\s*;\s*|\.\s+(?=[A-Z])|\s*,\s*(?=[A-Z]))/)
      .map(p => p.trim().replace(/^[\d\.\-\*\•\)]+\s*/, '').replace(/\.$/, '').trim())
      .filter(p => p.length >= 3 && !isNoise(p) && !/^\d+$/.test(p) && !/^CO\d+$/i.test(p) && !/^\d+\s+CO\d+$/i.test(p));

    return parts.length > 0 ? parts : [cleaned.replace(/\.$/, '')];
  };

  const colonSectionRegex = /^([A-Za-z0-9\s\/\&\-]{3,45})\s*:\s*(.+)$/;
  const explicitUnitRegex = /^(?:unit|module|chapter|part)\s*[-–:]?\s*([0-9ivx]+)\s*[:\-–]?\s*(.*)$/i;
  const tableModuleHeaderRegex = /^([0-9ivx]+)\s+([A-Za-z\s\/\&\-]+?)(?:\s*\(\s*\d+\s*\))?$/i;
  const tableRowRegex = /^(\d+\.\d+)\s+([A-Za-z].+?)(?:\s+\d+\s*(?:CO\d+)?)?$/i;

  let currentUnit = null;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Check Explicit Unit Header (e.g. "Unit 1: Introduction")
    const expMatch = line.match(explicitUnitRegex);
    if (expMatch) {
      const uNum = expMatch[1];
      const uTitle = expMatch[2]?.trim() || `Unit ${uNum}`;
      currentUnit = {
        unit_name: uTitle.toLowerCase().startsWith('unit') || uTitle.toLowerCase().startsWith('module') ? uTitle : `Unit ${uNum}: ${uTitle}`,
        topics: []
      };
      units.push(currentUnit);
      continue;
    }

    // Check Table Module Header (e.g. "1 Introduction (5)" or "2 Problem-Solving Methods (9)")
    const tableHeaderMatch = line.match(tableModuleHeaderRegex);
    if (tableHeaderMatch && tableHeaderMatch[2].length > 3 && !tableHeaderMatch[2].toLowerCase().includes('preamble')) {
      const uNum = tableHeaderMatch[1];
      const uTitle = tableHeaderMatch[2].trim();
      currentUnit = {
        unit_name: `Unit ${uNum}: ${uTitle}`,
        topics: []
      };
      units.push(currentUnit);
      continue;
    }

    // Check Colon-Headed Section (e.g. "Introduction: Turing Test - ...")
    const colonMatch = line.match(colonSectionRegex);
    if (colonMatch && !colonMatch[1].toLowerCase().includes('course') && !colonMatch[1].toLowerCase().includes('http') && !colonMatch[1].toLowerCase().includes('preamble') && !colonMatch[1].toLowerCase().includes('category') && !colonMatch[1].toLowerCase().includes('designer')) {
      const headerTitle = colonMatch[1].trim();
      const contentText = colonMatch[2].trim();

      const unitNum = units.length + 1;
      currentUnit = {
        unit_name: `Unit ${unitNum}: ${headerTitle}`,
        topics: []
      };
      units.push(currentUnit);

      const subTopics = splitSubTopics(contentText);
      subTopics.forEach((st, idx) => {
        currentUnit.topics.push({
          title: st,
          importance: idx === 0 || st.toLowerCase().includes('first-order') || st.toLowerCase().includes('bayes') || st.toLowerCase().includes('search') || st.toLowerCase().includes('reinforcement') ? 'high' : 'medium',
          estimated_minutes: 60,
          prerequisites: []
        });
      });
      continue;
    }

    // Check Table Row format (e.g. "1.1 Turing Test - Intelligent Agents 1 CO1")
    const tableMatch = line.match(tableRowRegex);
    if (tableMatch) {
      const numbering = tableMatch[1];
      const majorNum = numbering.split('.')[0];
      const topicText = tableMatch[2].replace(/\s+\d+\s*(CO\d+)?$/i, '').trim();

      let targetUnit = units.find(u => u.unit_name.startsWith(`Unit ${majorNum}`) || u.unit_name.startsWith(`Module ${majorNum}`));
      if (!targetUnit) {
        targetUnit = {
          unit_name: `Unit ${majorNum}`,
          topics: []
        };
        units.push(targetUnit);
      }

      const subTopics = splitSubTopics(topicText);
      subTopics.forEach((st) => {
        targetUnit.topics.push({
          title: st,
          importance: 'medium',
          estimated_minutes: 60,
          prerequisites: []
        });
      });
      continue;
    }

    // If we are currently inside a unit and this line contains topics
    if (currentUnit && line.length > 4) {
      const subTopics = splitSubTopics(line);
      subTopics.forEach((st) => {
        if (!currentUnit.topics.some(existing => existing.title.toLowerCase() === st.toLowerCase())) {
          currentUnit.topics.push({
            title: st,
            importance: 'medium',
            estimated_minutes: 60,
            prerequisites: []
          });
        }
      });
    }
  }

  // Fallback if no structured units could be found
  if (!units.length || !units.some(u => u.topics.length > 0)) {
    const chunkedTopics = [];
    lines.forEach((l) => {
      const parts = splitSubTopics(l);
      parts.forEach(p => {
        if (p.length > 3 && !chunkedTopics.includes(p)) {
          chunkedTopics.push(p);
        }
      });
    });

    if (chunkedTopics.length > 0) {
      const perUnit = Math.ceil(chunkedTopics.length / Math.min(5, Math.ceil(chunkedTopics.length / 4)));
      for (let u = 0; u < Math.ceil(chunkedTopics.length / perUnit); u++) {
        const slice = chunkedTopics.slice(u * perUnit, (u + 1) * perUnit);
        if (slice.length > 0) {
          units.push({
            unit_name: `Unit ${u + 1}: ${slice[0]}`,
            topics: slice.map((title, tidx) => ({
              title,
              importance: tidx === 0 ? 'high' : 'medium',
              estimated_minutes: 60,
              prerequisites: []
            }))
          });
        }
      }
    }
  }

  const finalUnits = units
    .filter(u => u.topics && u.topics.length > 0)
    .map(u => ({
      unit_name: u.unit_name,
      topics: u.topics.map((t, idx) => ({
        title: t.title,
        importance: idx % 3 === 0 ? 'high' : t.importance || 'medium',
        estimated_minutes: t.estimated_minutes || 60,
        prerequisites: t.prerequisites || []
      }))
    }));

  return {
    course_name: courseName || 'Academic Course',
    description: `Structured curriculum for ${courseName} with ${finalUnits.reduce((s, u) => s + u.topics.length, 0)} core topics.`,
    units: finalUnits
  };
}

// ─── POST /api/ai/invoke-llm ──────────────────────────────────────────────────
router.post('/invoke-llm', authMiddleware, async (req, res) => {
  try {
    const { prompt, props, json_mode } = req.body;
    const aiResult = await callAI([{ role: 'user', content: prompt }], json_mode);
    if (aiResult) {
      return res.json({ status: 'success', output: json_mode ? safeParseJSON(aiResult) : aiResult });
    }
    const fallback = builtInResponse(prompt, props || {});
    return res.json({ status: 'success', output: fallback });
  } catch (err) {
    console.error('invoke-llm error:', err);
    res.status(500).json({ error: err.message });
  }
});

function builtInResponse(prompt, props) {
  const promptLower = (prompt || '').toLowerCase();
  if (props.plan_title || props.daily_schedule || props.strategy_summary) {
    return {
      plan_title: 'Adaptive Academic Success Plan',
      strategy_summary: 'Prioritizing high-weight course topics with balanced daily study blocks and targeted review sessions.',
      daily_target_hours: 4,
      daily_schedule: [
        { day: 'Day 1', title: 'Core Concepts & Fundamentals', hours: 3.5, focus_topics: ['Key Definitions', 'Foundational Principles'] },
        { day: 'Day 2', title: 'Problem Solving & Exercises', hours: 4.0, focus_topics: ['Practice Problems', 'Chapter Exercises'] },
        { day: 'Day 3', title: 'Advanced Topics & Application', hours: 3.5, focus_topics: ['Complex Cases', 'Lab Reports'] },
        { day: 'Day 4', title: 'Comprehensive Review & Self-Quiz', hours: 4.0, focus_topics: ['Mock Test', 'Formula Review'] }
      ],
      rescue_advice: 'Focus on active recall and spaced repetition for maximum retention!'
    };
  }

  const isGood = promptLower.includes('completed') || promptLower.includes('goal') || promptLower.includes('done');
  const isOverwhelmed = promptLower.includes('overwhelm') || promptLower.includes('scared') || promptLower.includes('behind');
  return {
    message: isGood
      ? "Amazing work completing your goal! That consistency is exactly what builds long-term academic success. Keep it up!"
      : isOverwhelmed
      ? "I hear you — feeling overwhelmed is completely normal. Let's take one small step: identify the single most important thing for today and do just that."
      : "You're making steady progress! Remember to take short breaks to keep your mind sharp. You've got this.",
    reply: isGood
      ? "Amazing work completing your goal!"
      : isOverwhelmed
      ? "I hear you — let's take one small step at a time."
      : "You're making steady progress. Keep going!",
    emotion: isGood ? 'celebrating' : isOverwhelmed ? 'empathetic' : 'encouraging',
    animation: isGood ? 'celebrate' : isOverwhelmed ? 'gentle_nod' : 'wave'
  };
}

export default router;
