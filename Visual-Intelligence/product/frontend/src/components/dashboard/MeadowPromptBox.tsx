"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { Compass, Dna, Layers, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { useTactileAudio } from "./useTactileAudio";

/* --- Icon System from react-workspace --- */
const iconPaths = {
  plus: "M12 5v14M5 12h14",
  close: "m6 6 12 12M18 6 6 18",
  reset: "M4 10a8 8 0 1 1 1 8M4 4v6h6",
  play: "m8 5 11 7-11 7Z",
  menu: "M4 6h16M4 12h16M4 18h16",
  check: "m5 12 4 4L19 6",
  checkCheck: "M18 6 7 17l-5-5M22 10l-7.5 7.5L13 16",
  file: "M14 3H5v18h14V8l-5-5ZM14 3v5h5",
  arrow: "M5 12h14m-6-6 6 6-6 6",
  arrowDown: "M12 5v14m-6-6 6 6 6-6",
  send: "M12 19V5m-6 6 6-6 6 6",
  mic: "M9 4a3 3 0 0 1 6 0v8a3 3 0 0 1-6 0ZM6 11v1a6 6 0 0 0 12 0M12 18v3",
  wave: "M5 10v4M9 7v10M12 5v14M15 8v8M19 10v4",
  shield: "m12 3-8 3v6c0 5 8 9 8 9s8-4 8-9V6Z",
  model: "M4 4h16v16H4ZM8 8h8v8H8Z",
  chevron: "m8 10 4 4 4-4",
  watch: "M9 2h6M12 2v3m6 1 2 2M12 9v5l3 2M20 14a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
};

type IconName = keyof typeof iconPaths;

function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg className={className} aria-hidden="true" viewBox="0 0 24 24">
      <path d={iconPaths[name]} />
    </svg>
  );
}

function IconButton({
  icon,
  label,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: IconName;
  label: string;
}) {
  return (
    <button
      type="button"
      {...props}
      aria-label={label}
      title={label}
      className={"icon-only " + (props.className || "")}
    >
      <Icon name={icon} />
    </button>
  );
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  initials: string;
  color: string;
}

const DEFAULT_MEMBERS: Agent[] = [
  { id: "vyren", name: "VYREN AI", role: "Core Brand Intelligence", initials: "VY", color: "#3b82f6" },
  { id: "strategist", name: "Brand Strategist", role: "Positioning & DNA", initials: "BS", color: "#8b5cf6" },
  { id: "creative", name: "Creative Director", role: "Visual System & Motion", initials: "CD", color: "#ec4899" },
  { id: "campaign", name: "Campaign Director", role: "Omnichannel Studio", initials: "CX", color: "#10b981" },
];

const permissions = [
  {
    id: "ask",
    name: "Ask every time",
    description: "Request confirmation before each action.",
  },
  {
    id: "limited",
    name: "Approve routine actions",
    description:
      "Allow routine reversible work; ask before external or consequential actions.",
  },
  {
    id: "review",
    name: "Prepare for review",
    description: "Research and draft only; take no external action.",
  },
];

const models = [
  {
    id: "balanced",
    name: "Balanced",
    description: "General work · balanced speed and detail",
  },
  {
    id: "fast",
    name: "Fast",
    description: "Short tasks · prioritize quick responses",
  },
  {
    id: "reasoning",
    name: "Reasoning",
    description: "Complex planning · prioritize depth",
  },
];

const commands = [
  {
    id: "summarize",
    name: "summarize",
    description: "Condense the conversation",
    icon: "file" as const,
  },
  {
    id: "rewrite",
    name: "rewrite",
    description: "Improve tone and clarity",
    icon: "model" as const,
  },
  {
    id: "translate",
    name: "translate",
    description: "Translate to another language",
    icon: "arrow" as const,
  },
  {
    id: "todo",
    name: "todo",
    description: "Create a task",
    icon: "check" as const,
  },
  {
    id: "remind",
    name: "remind",
    description: "Set a reminder",
    icon: "watch" as const,
  },
];

const QUICK_ACTIONS = [
  { id: "brand_creation", label: "0 → 1 New Brand Creation", icon: Compass, prompt: "Build a new brand identity, market positioning, and visual direction for..." },
  { id: "brand_evolution", label: "Evolve Existing Brand", icon: Dna, prompt: "Audit my existing brand assets, diagnose inconsistency, and recommend an evolution strategy for..." },
  { id: "campaign_studio", label: "Launch Campaign Studio", icon: Layers, prompt: "Develop an omnichannel creative campaign with multi-surface visual assets for..." },
  { id: "visual_dna", label: "Visual DNA & Material Physics", icon: Zap, prompt: "Define the core visual DNA, material texture physics, and lighting geometry for..." },
];

const MODES = [
  { id: "intelligence", name: "Brand Intelligence" },
  { id: "creative", name: "Creative Direction" },
  { id: "campaign", name: "Campaign Execution" },
];

interface SpeechResult {
  isFinal: boolean;
  0: { transcript: string };
}
interface Recognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onresult: ((e: { results: ArrayLike<SpeechResult> }) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}
type SpeechWindow = Window & {
  SpeechRecognition?: new () => Recognition;
  webkitSpeechRecognition?: new () => Recognition;
};

export interface PromptSettings {
  permission: string;
  model: string;
}

export const MeadowPromptBox: React.FC = () => {
  const router = useRouter();
  const { playHoverSound, playFocusSound, playSubmitSound, playKeypressSound } = useTactileAudio();

  const [selectedMode, setSelectedMode] = useState("creative");
  const [draft, setDraft] = useState("");
  const [settings, setSettings] = useState<PromptSettings>({
    permission: "ask",
    model: "balanced",
  });
  const [files, setFiles] = useState<File[]>([]);
  const members = DEFAULT_MEMBERS;
  const name = "VYREN";

  const [open, setOpen] = useState<
    "attachments" | "permissions" | "models" | null
  >(null);
  const [notice, setNotice] = useState("");
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [bars, setBars] = useState<number[]>(Array(35).fill(4));
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [suggestionDismissed, setSuggestionDismissed] = useState(false);
  const [viewportVersion, setViewportVersion] = useState(0);
  const [suggestionPosition, setSuggestionPosition] = useState({
    left: 12,
    top: 42,
  });

  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const mirror = useRef<HTMLDivElement>(null);
  const caretAnchor = useRef<HTMLSpanElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const triggers = useRef<Record<string, HTMLButtonElement | null>>({});
  const recognition = useRef<Recognition | null>(null);
  const audio = useRef<{ stream: MediaStream; context: AudioContext } | null>(null);
  const frame = useRef(0);
  const mounted = useRef(true);
  const voice = useRef({ base: "", text: "", cancel: false });

  const [selection, setSelection] = useState(0);
  const before = draft.slice(0, selection);
  const mentionMatch = !suggestionDismissed
    ? before.match(/(?:^|\s)@([^@\n\s]{0,40})$/)
    : null;
  const commandMatch = !suggestionDismissed
    ? before.match(/(?:^|\s)\/([a-z-]{0,30})$/i)
    : null;
  const suggestionType = mentionMatch ? "mention" : commandMatch ? "command" : null;
  const mentionCandidates = mentionMatch
    ? members.filter((a) =>
        a.name
          .toLowerCase()
          .replace(/\s/g, "")
          .startsWith(mentionMatch[1].toLowerCase().replace(/\s/g, ""))
      )
    : [];
  const commandCandidates = commandMatch
    ? commands.filter((command) =>
        command.name.startsWith(commandMatch[1].toLowerCase())
      )
    : [];
  const candidates =
    suggestionType === "mention" ? mentionCandidates : commandCandidates;

  useLayoutEffect(() => {
    const el = input.current;
    if (!el) return;
    el.style.height = "auto";
    const max = Math.min(300, innerHeight * 0.32);
    el.style.height = Math.min(el.scrollHeight, max) + "px";
    el.style.overflowY = el.scrollHeight > max ? "auto" : "hidden";
  }, [draft, listening]);

  useLayoutEffect(() => {
    if (!candidates.length || !caretAnchor.current) return;
    const caret = caretAnchor.current.getBoundingClientRect();
    const composer = caretAnchor.current
      .closest(".composer")!
      .getBoundingClientRect();
    const popupWidth = Math.min(310, composer.width - 24);
    const popupHeight = Math.min(310, candidates.length * 58 + 16);
    const left = Math.max(
      12,
      Math.min(caret.left - composer.left, composer.width - popupWidth - 12)
    );
    const roomBelow = innerHeight - caret.bottom - 12;
    const roomAbove = caret.top - 12;
    const opensBelow = roomBelow >= popupHeight || roomBelow >= roomAbove;
    const top = opensBelow
      ? caret.bottom - composer.top + 8
      : caret.top - composer.top - popupHeight + 12;
    setSuggestionPosition({ left, top });
  }, [draft, selection, candidates.length, suggestionType, viewportVersion]);

  useEffect(() => {
    const reposition = () => setViewportVersion((version) => version + 1);
    window.addEventListener("resize", reposition);
    return () => window.removeEventListener("resize", reposition);
  }, []);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (recognition.current) {
        recognition.current.onend = null;
        recognition.current.onresult = null;
        recognition.current.abort();
      }
      cancelAnimationFrame(frame.current);
      audio.current?.stream.getTracks().forEach((t) => t.stop());
      void audio.current?.context.close();
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(null);
    };
    const key = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(null);
        triggers.current[open]?.focus();
      }
    };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", key);
    popup.current
      ?.querySelector<HTMLButtonElement>("button[aria-checked=true],button")
      ?.focus();
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", key);
    };
  }, [open]);

  function toggle(type: typeof open) {
    playHoverSound();
    setOpen((old) => (old === type ? null : type));
  }

  function chooseSuggestion(index: number) {
    const item = candidates[index];
    if (!item || !suggestionType) return;
    playFocusSound();
    const trigger = suggestionType === "mention" ? "@" : "/";
    const start = before.lastIndexOf(trigger);
    const token = trigger + item.name;
    const text = draft.slice(0, start) + token + " " + draft.slice(selection);
    const cursor = start + token.length + 1;
    setDraft(text);
    setSuggestionDismissed(true);
    requestAnimationFrame(() => {
      input.current?.focus();
      input.current?.setSelectionRange(cursor, cursor);
      setSelection(cursor);
    });
  }

  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (
      candidates.length &&
      ["ArrowDown", "ArrowUp", "Enter", "Tab", "Escape"].includes(e.key)
    ) {
      e.preventDefault();
      if (e.key === "Escape") setSuggestionDismissed(true);
      else if (e.key === "Enter" || e.key === "Tab")
        chooseSuggestion(suggestionIndex % candidates.length);
      else
        setSuggestionIndex(
          (i) =>
            (i + (e.key === "ArrowDown" ? 1 : candidates.length - 1)) %
            candidates.length
        );
      return;
    }
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  }

  function send() {
    if (listening) return;
    if (draft.trim()) {
      playSubmitSound();
      const encodedPrompt = encodeURIComponent(draft.trim());
      router.push(`/studio?prompt=${encodedPrompt}&mode=${selectedMode}`);
      setDraft("");
      setSuggestionDismissed(true);
      setSelection(0);
    } else startVoice();
  }

  function insertTrigger(trigger: "@" | "/") {
    playHoverSound();
    const el = input.current;
    const cursor = el?.selectionStart ?? draft.length;
    const prefix = cursor > 0 && !/\s/.test(draft[cursor - 1]) ? " " : "";
    const text = draft.slice(0, cursor) + prefix + trigger + draft.slice(cursor);
    const next = cursor + prefix.length + 1;
    setDraft(text);
    setSelection(next);
    setSuggestionDismissed(false);
    setSuggestionIndex(0);
    requestAnimationFrame(() => {
      input.current?.focus();
      input.current?.setSelectionRange(next, next);
    });
  }

  const MENTION_PALETTES = [
    { bg: "rgba(217, 119, 6, 0.15)", color: "#b45309", shadow: "rgba(217, 119, 6, 0.35)" }, // Amber
    { bg: "rgba(16, 185, 129, 0.15)", color: "#047857", shadow: "rgba(16, 185, 129, 0.35)" }, // Emerald
    { bg: "rgba(59, 130, 246, 0.15)", color: "#1d4ed8", shadow: "rgba(59, 130, 246, 0.35)" }, // Blue
    { bg: "rgba(147, 51, 234, 0.15)", color: "#7e22ce", shadow: "rgba(147, 51, 234, 0.35)" }, // Violet
    { bg: "rgba(244, 63, 94, 0.15)", color: "#be123c", shadow: "rgba(244, 63, 94, 0.35)" }, // Rose
    { bg: "rgba(20, 184, 166, 0.15)", color: "#0f766e", shadow: "rgba(20, 184, 166, 0.35)" }, // Teal
    { bg: "rgba(234, 88, 12, 0.15)", color: "#c2410c", shadow: "rgba(234, 88, 12, 0.35)" }, // Orange
    { bg: "rgba(99, 102, 241, 0.15)", color: "#4338ca", shadow: "rgba(99, 102, 241, 0.35)" }, // Indigo
    { bg: "rgba(236, 72, 153, 0.15)", color: "#be185d", shadow: "rgba(236, 72, 153, 0.35)" }, // Pink
  ];

  function getMentionStyle(nameOrToken: string) {
    let hash = 0;
    const clean = nameOrToken.replace(/^@/, "").toLowerCase();
    for (let i = 0; i < clean.length; i++) {
      hash = (hash * 31 + clean.charCodeAt(i)) >>> 0;
    }
    const p = MENTION_PALETTES[hash % MENTION_PALETTES.length];
    return {
      backgroundColor: p.bg,
      color: p.color,
      boxShadow: `inset 0 -1px ${p.shadow}`,
    };
  }

  function highlightedText(text: string) {
    if (!text) return text;
    const sortedMembers = [...members].sort((a, b) => b.name.length - a.name.length);
    const memberPatterns = sortedMembers.map((a) =>
      a.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    );
    const commandPatterns = commands.map((c) =>
      c.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    );

    const specificPatterns = [
      ...memberPatterns.map((n) => `@${n}`),
      ...commandPatterns.map((c) => `/${c}`),
    ];

    const patternStr = specificPatterns.length
      ? `(${specificPatterns.join("|")}|@[a-zA-Z0-9_.-]+)(?=\\s|$|[.,!?])`
      : `(@[a-zA-Z0-9_.-]+|/[a-zA-Z0-9_-]+)(?=\\s|$|[.,!?])`;

    const regex = new RegExp(patternStr, "gi");
    const parts = text.split(regex);

    return parts.map((part, index) => {
      if (!part) return null;
      if (part.startsWith("@")) {
        const style = getMentionStyle(part);
        return (
          <mark
            key={index}
            className="mention-token"
            style={style}
          >
            {part}
          </mark>
        );
      }
      if (part.startsWith("/")) {
        return (
          <mark
            key={index}
            className="command-token"
          >
            {part}
          </mark>
        );
      }
      return part;
    });
  }

  function cleanAudio() {
    cancelAnimationFrame(frame.current);
    audio.current?.stream.getTracks().forEach((t) => t.stop());
    void audio.current?.context.close();
    audio.current = null;
  }

  function finishVoice(cancel = false) {
    voice.current.cancel = cancel;
    recognition.current?.stop();
  }

  async function meter(session: Recognition) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current || recognition.current !== session) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      const context = new AudioContext();
      const analyser = context.createAnalyser();
      analyser.fftSize = 128;
      context.createMediaStreamSource(stream).connect(analyser);
      audio.current = { stream, context };
      const values = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        if (!mounted.current || !audio.current) return;
        analyser.getByteFrequencyData(values);
        setBars(
          Array.from({ length: 35 }, (_, i) => Math.max(4, values[i] * 0.22))
        );
        frame.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      if (mounted.current)
        setNotice(
          "Microphone levels are unavailable; dictation may still work."
        );
    }
  }

  function startVoice() {
    if (recognition.current) return;
    const Constructor =
      (window as SpeechWindow).SpeechRecognition ||
      (window as SpeechWindow).webkitSpeechRecognition;
    if (!Constructor) {
      setNotice(
        "Live dictation is unavailable in this browser. Use a browser with speech recognition support."
      );
      return;
    }
    setOpen(null);
    voice.current = { base: draft, text: "", cancel: false };
    const rec = new Constructor();
    recognition.current = rec;
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = navigator.language || "en-US";
    rec.onstart = () => {
      if (!mounted.current) return;
      setListening(true);
      setTranscript("");
      setNotice("");
      void meter(rec);
    };
    rec.onresult = (e) => {
      const words = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join(" ");
      voice.current.text = words;
      if (mounted.current) setTranscript(words);
    };
    rec.onerror = (e) => {
      if (mounted.current)
        setNotice(
          e.error === "not-allowed"
            ? "Microphone permission was denied."
            : "Dictation stopped. You can edit any captured text."
        );
    };
    rec.onend = () => {
      recognition.current = null;
      cleanAudio();
      if (!mounted.current) return;
      const text = voice.current.cancel
        ? voice.current.base
        : [voice.current.base, voice.current.text]
            .filter(Boolean)
            .join(" ")
            .trim();
      setDraft(text);
      setListening(false);
      setNotice(
        voice.current.cancel
          ? "Dictation canceled. Original draft restored."
          : "Dictation ready to edit. Nothing was sent."
      );
      requestAnimationFrame(() => input.current?.focus());
    };
    try {
      rec.start();
    } catch {
      recognition.current = null;
      setNotice("Could not start dictation. Please try again.");
    }
  }

  const options = open === "permissions" ? permissions : models;
  const selected = open === "permissions" ? settings.permission : settings.model;

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-4 z-10 relative">
      
      {/* Authentic iOS 18 Liquid Glass Mode Selector with Framer Motion Sliding Pill */}
      <div className="flex items-center justify-center gap-1 self-center p-1 rounded-full bg-white/35 backdrop-blur-xl border border-white/60 shadow-sm mt-1">
        {MODES.map((mode) => {
          const isSelected = selectedMode === mode.id;
          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => {
                playFocusSound();
                setSelectedMode(mode.id);
              }}
              onMouseEnter={playHoverSound}
              className={`relative px-4 sm:px-5 py-1.5 rounded-full text-xs font-semibold tracking-tight transition-colors duration-150 cursor-pointer select-none ${
                isSelected
                  ? "text-[#0f1419] font-bold"
                  : "text-[#0f1419]/70 hover:text-[#0f1419]"
              }`}
            >
              {isSelected && (
                <motion.div
                  layoutId="activeModePill"
                  className="absolute inset-0 bg-white rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
                  initial={false}
                  transition={{
                    type: "spring",
                    stiffness: 480,
                    damping: 34,
                    mass: 0.8,
                  }}
                  style={{ willChange: "transform" }}
                />
              )}
              <span className="relative z-10">{mode.name}</span>
            </button>
          );
        })}
      </div>

      {/* 
        Solid Non-Liquid Glass Prompt Box Component (1:1 from react-workspace)
      */}
      <div className="composerwrap" ref={root}>
        {notice && (
          <div className="prompt-notice" role="status">
            {notice}
            <IconButton
              icon="close"
              label="Dismiss message"
              onClick={() => setNotice("")}
            />
          </div>
        )}
        <form
          className={
            "composer solid-composer-card " +
            (draft.trim() ? "has-text" : "") +
            (listening ? " listening" : "")
          }
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          {open && (
            <div
              ref={popup}
              className={"prompt-popover " + open}
              role="dialog"
              aria-label={
                open === "attachments"
                  ? "Add to your prompt"
                  : open === "permissions"
                    ? "Permission level"
                    : "Choose a model"
              }
            >
              <div className="dialoghead">
                <strong>
                  {open === "attachments"
                    ? "Add to your prompt"
                    : open === "permissions"
                      ? "Permission level"
                      : "Choose a model"}
                </strong>
                <IconButton
                  icon="close"
                  label="Close options"
                  onClick={() => {
                    setOpen(null);
                    triggers.current[open]?.focus();
                  }}
                />
              </div>
              <div className="controls-body">
                {open === "attachments" ? (
                  <>
                    <p>Add reference files to your prompt.</p>
                    <button
                      className="option-card"
                      type="button"
                      onClick={() => picker.current?.click()}
                    >
                      <Icon name="file" />
                      <span>
                        <strong>Choose files</strong>
                        <small>Documents, images, or other reference files</small>
                      </span>
                    </button>
                    {files.map((file, i) => (
                      <div className="drawer-file" key={file.name + i}>
                        <span>
                          {file.name}
                          <small>{Math.ceil(file.size / 1024)} KB</small>
                        </span>
                        <IconButton
                          icon="close"
                          label={"Remove " + file.name}
                          onClick={() => setFiles(files.filter((_, j) => i !== j))}
                        />
                      </div>
                    ))}
                  </>
                ) : (
                  <>
                    <p>
                      {open === "permissions"
                        ? "Choose how your workforce should handle actions."
                        : "Choose a model profile for this conversation."}
                    </p>
                    <div
                      role="radiogroup"
                      aria-label={
                        open === "permissions"
                          ? "Permission level"
                          : "Model profiles"
                      }
                    >
                      {options.map((o) => (
                        <button
                          type="button"
                          key={o.id}
                          className="option-card"
                          role="radio"
                          aria-checked={selected === o.id}
                          onKeyDown={(e) => {
                            if (["ArrowUp", "ArrowDown"].includes(e.key)) {
                              e.preventDefault();
                              const buttons =
                                e.currentTarget.parentElement!.querySelectorAll<HTMLButtonElement>(
                                  "button"
                                );
                              buttons[
                                (options.indexOf(o) +
                                  (e.key === "ArrowDown"
                                    ? 1
                                    : options.length - 1)) %
                                  options.length
                              ].focus();
                            }
                          }}
                          onClick={() => {
                            setSettings({
                              ...settings,
                              [open === "permissions" ? "permission" : "model"]:
                                o.id,
                            });
                            setOpen(null);
                            triggers.current[open]?.focus();
                          }}
                        >
                          <Icon
                            name={open === "permissions" ? "shield" : "model"}
                          />
                          <span>
                            <strong>{o.name}</strong>
                            <small>{o.description}</small>
                          </span>
                          {selected === o.id && <Icon name="check" />}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
          {candidates.length > 0 && !listening && (
            <div
              className="suggestion-list"
              style={suggestionPosition}
              role="listbox"
              aria-label={
                suggestionType === "mention"
                  ? "Mention a teammate"
                  : "Choose a command"
              }
            >
              {candidates.map((item, i) => (
                <button
                  key={item.id}
                  type="button"
                  role="option"
                  aria-selected={i === suggestionIndex % candidates.length}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => chooseSuggestion(i)}
                >
                  {suggestionType === "mention" ? (
                    <>
                      <span
                        className="suggestion-avatar"
                        style={{ background: (item as Agent).color }}
                      >
                        {(item as Agent).initials}
                      </span>
                      <span>
                        <strong>{item.name}</strong>
                        <small>{(item as Agent).role}</small>
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="suggestion-icon">
                        <Icon name={(item as (typeof commands)[number]).icon} />
                      </span>
                      <span>
                        <strong>/{item.name}</strong>
                        <small>
                          {(item as (typeof commands)[number]).description}
                        </small>
                      </span>
                    </>
                  )}
                  <kbd>↵</kbd>
                </button>
              ))}
            </div>
          )}
          {files.length > 0 && (
            <div className="attachment-chips">
              {files.map((f, i) => (
                <span key={f.name + i} className="attachment-chip">
                  <Icon name="file" />
                  <span>{f.name}</span>
                  <IconButton
                    icon="close"
                    label={"Remove " + f.name}
                    onClick={() => setFiles(files.filter((_, j) => i !== j))}
                  />
                </span>
              ))}
            </div>
          )}
          {listening ? (
            <div className="voice-panel">
              <div className="voice-transcript" aria-live="polite">
                {transcript || "Listening…"}
              </div>
              <div className="waveform" aria-hidden="true">
                {bars.map((height, i) => (
                  <i
                    key={i}
                    style={{ height, animation: "none" } as CSSProperties}
                  />
                ))}
              </div>
              <div className="voice-footer">
                <span>Listening · finish to edit before sending</span>
                <div>
                  <IconButton
                    icon="close"
                    label="Cancel dictation"
                    onClick={() => finishVoice(true)}
                  />
                  <IconButton
                    icon="check"
                    label="Finish dictation and edit"
                    onClick={() => finishVoice()}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="prompt-editor">
              <div ref={mirror} className="prompt-highlight" aria-hidden="true">
                {highlightedText(draft.slice(0, selection))}
                <span ref={caretAnchor} className="caret-anchor">
                  &#8203;
                </span>
                {highlightedText(draft.slice(selection))}
                {draft.endsWith("\n") ? "\n " : ""}
              </div>
              <textarea
                ref={input}
                rows={3}
                aria-label="Message assistant"
                placeholder={draft.length === 0 ? "Work with " + name + "…" : ""}
                value={draft}
                onFocus={() => {
                  playFocusSound();
                }}
                onScroll={(e) => {
                  if (mirror.current)
                    mirror.current.scrollTop = e.currentTarget.scrollTop;
                }}
                onChange={(e) => {
                  setDraft(e.target.value);
                  setSelection(e.target.selectionStart);
                  setSuggestionDismissed(false);
                  setSuggestionIndex(0);
                }}
                onSelect={(e) => setSelection(e.currentTarget.selectionStart)}
                onKeyDown={(e) => {
                  if (e.key === " ") {
                    playKeypressSound("space");
                  } else if (e.key === "Backspace" || e.key === "Delete") {
                    playKeypressSound("backspace");
                  } else if (e.key === "Enter") {
                    playKeypressSound("enter");
                  } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
                    playKeypressSound("default");
                  }
                  onKey(e);
                }}
              />
            </div>
          )}
          {!listening && (
            <div className="prompt-toolbar">
              <div className="prompt-left">
                <button
                  ref={(el) => {
                    triggers.current.attachments = el;
                  }}
                  type="button"
                  className="prompt-icon"
                  aria-label="Attach files"
                  aria-haspopup="dialog"
                  aria-expanded={open === "attachments"}
                  onClick={() => toggle("attachments")}
                >
                  <Icon name="plus" />
                </button>
                <button
                  type="button"
                  className="syntax-control"
                  aria-label="Mention a teammate"
                  onClick={() => insertTrigger("@")}
                >
                  @ <span>mention</span>
                </button>
                <button
                  type="button"
                  className="syntax-control"
                  aria-label="Insert a command"
                  onClick={() => insertTrigger("/")}
                >
                  / <span>commands</span>
                </button>
                <button
                  ref={(el) => {
                    triggers.current.permissions = el;
                  }}
                  type="button"
                  className="approval-control"
                  aria-haspopup="dialog"
                  aria-expanded={open === "permissions"}
                  onClick={() => toggle("permissions")}
                >
                  <Icon name="shield" />
                  <span>
                    {settings.permission === "ask"
                      ? "Ask every time"
                      : permissions.find((p) => p.id === settings.permission)
                          ?.name}
                  </span>
                </button>
              </div>
              <div className="prompt-right">
                <button
                  ref={(el) => {
                    triggers.current.models = el;
                  }}
                  className="model-control"
                  type="button"
                  aria-label="Choose model"
                  aria-haspopup="dialog"
                  aria-expanded={open === "models"}
                  onClick={() => toggle("models")}
                >
                  <span>{models.find((m) => m.id === settings.model)?.name}</span>
                  <Icon name="chevron" />
                </button>
                <button
                  type="button"
                  className="prompt-icon"
                  aria-label="Dictate prompt"
                  onClick={startVoice}
                >
                  <Icon name="mic" />
                </button>
                <button
                  type="submit"
                  className="voice-send"
                  aria-label={draft.trim() ? "Send message" : "Start voice mode"}
                >
                  <Icon name={draft.trim() ? "send" : "wave"} />
                </button>
              </div>
            </div>
          )}
        </form>
        <input
          ref={picker}
          type="file"
          multiple
          hidden
          onChange={(e) => {
            setFiles([...files, ...Array.from(e.target.files || [])]);
            e.target.value = "";
          }}
        />
      </div>

      {/* iOS 18 Liquid Glass Quick Action Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3.5 pt-1">
        {QUICK_ACTIONS.map((act, idx) => {
          const IconComp = act.icon;
          return (
            <motion.button
              key={act.id}
              type="button"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.4,
                delay: 0.35 + idx * 0.07,
                ease: [0.16, 1, 0.3, 1],
              }}
              onClick={() => {
                playFocusSound();
                setDraft(act.prompt);
              }}
              onMouseEnter={playHoverSound}
              className="flex items-center gap-3 p-3 sm:p-3.5 rounded-2xl ios-liquid-glass-card hover:!bg-white hover:!border-white hover:shadow-md text-left group min-h-[58px] cursor-pointer select-none transition-all duration-200"
            >
              <div className="w-8 h-8 rounded-xl ios-glass-sub-badge flex items-center justify-center text-[#0f1419] shrink-0 group-hover:bg-[#eef2ee] group-hover:border-[#dce4dc] transition-colors duration-200">
                <IconComp className="w-4 h-4 text-[#0f1419]" />
              </div>
              <span className="text-[12px] font-bold text-[#0f1419] tracking-tight leading-snug">
                {act.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
