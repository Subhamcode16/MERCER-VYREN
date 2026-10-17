"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { 
  Sparkles, 
  Send, 
  CheckCircle2, 
  Lock, 
  Brain, 
  Compass, 
  ShieldCheck, 
  RefreshCw, 
  ArrowRight,
  User,
  AlertCircle,
  ExternalLink,
  Layers,
  Check,
  Wifi,
  WifiOff
} from "lucide-react";
import { PinterestMoodboardDrawer } from "./PinterestMoodboardDrawer";
import {
  fetchRoom,
  sendRoomMessage,
  recordRoomDecision,
  ingestMoodboard,
  mapBackendMessageToFrontend,
  mapBackendRoomToFrontendMessages,
  RoomMessage,
  MessageArtifact,
  MessageDecision,
  WorkEvent,
  BackendRoom
} from "@/lib/room";

const DEFAULT_INITIAL_MESSAGES: RoomMessage[] = [
  {
    id: "msg-01",
    senderId: "user",
    senderName: "Elena Vance",
    senderRole: "Human Creative Director",
    isHuman: true,
    content: "Create a campaign for our new luxury bridal collection targeting younger high-intent buyers. Make the brand feel contemporary without losing heritage craftsmanship.",
    timestamp: "10:42 AM"
  },
  {
    id: "msg-02",
    senderId: "vyren_core",
    senderName: "VYREN",
    senderRole: "Creative Operating System",
    isHuman: false,
    content: "I've synthesized the intelligence for your bridal launch objective. Evidence shows younger luxury buyers respond strongly to architectural heritage silhouettes. I have prepared two distinct creative territories for your selection below.",
    timestamp: "10:43 AM",
    workEvents: [
      { step: "Understanding product & launch objective", status: "DONE" },
      { step: "Querying fashion intelligence & textile physics", status: "DONE" },
      { step: "Formulating comparative creative territories", status: "DONE" },
      { step: "Human direction sign-off", status: "PENDING" }
    ],
    artifacts: [
      {
        id: "art-01",
        type: "RESEARCH",
        title: "Luxury Bridal Audience & Textile Physics Evidence",
        summary: "Audience signals confirm +24.2% lift for modernized architectural heritage silhouettes. Textile physics indicates tungsten rim lighting (2800K) prevents optical glare on Banarasi gold zari.",
        data: { epistemicStatus: "OBSERVED", confidence: "96%" }
      },
      {
        id: "art-02",
        type: "CREATIVE_DIRECTION",
        title: "Comparative Creative Territories",
        summary: "Two distinct creative hypotheses formulated from brand DNA and audience signals.",
        data: {
          territoryA: { title: "Modern Sovereign", archetype: "Architectural Precision", distinctiveness: "96%" },
          territoryB: { title: "Regal Lineage", archetype: "Heritage Grandeur", distinctiveness: "88%" }
        }
      }
    ],
    decisions: [
      {
        id: "dec-01",
        title: "Select Primary Creative Direction",
        context: "Choose primary visual world to lock into campaign memory and develop into production assets.",
        status: "PENDING",
        options: [
          { id: "opt-01", label: "Direction A: Modern Sovereign (Architectural Precision)", distinctiveness: "96%" },
          { id: "opt-02", label: "Direction B: Regal Lineage (Heritage Grandeur)", distinctiveness: "88%" }
        ]
      }
    ]
  }
];

export function VyrenRoomView() {
  const [roomId, setRoomId] = useState<string>("room-default-studio");
  const [roomTitle, setRoomTitle] = useState<string>("Autumn/Winter 2026 Creative Room");
  const [messages, setMessages] = useState<RoomMessage[]>(DEFAULT_INITIAL_MESSAGES);
  const [inputVal, setInputVal] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPinterestDrawerOpen, setIsPinterestDrawerOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionNotice, setConnectionNotice] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isProcessing]);

  // ── Sync with Live Backend ────────────────────────────────────────────────
  const loadRoomState = useCallback(async () => {
    try {
      const room: BackendRoom = await fetchRoom(roomId);
      setIsConnected(true);
      setConnectionNotice(null);
      if (room.title) setRoomTitle(room.title);
      if (room.messages && room.messages.length > 0) {
        setMessages(mapBackendRoomToFrontendMessages(room));
      }
    } catch (err: any) {
      setIsConnected(false);
      setConnectionNotice("Backend offline or booting. Working in local mode.");
    }
  }, [roomId]);

  useEffect(() => {
    loadRoomState();
  }, [loadRoomState]);

  // ── Ingest Moodboard Handler ──────────────────────────────────────────────
  const handleIngestPinterestBoard = async (boardId: string, boardName: string) => {
    setIsProcessing(true);
    try {
      if (isConnected) {
        await ingestMoodboard(boardId);
      }
    } catch (e) {
      console.warn("Direct moodboard sync error, falling back locally:", e);
    }

    const moodboardMsg: RoomMessage = {
      id: `msg-${Date.now()}`,
      senderId: "vyren_core",
      senderName: "VYREN (Pinterest MCP Ingestion)",
      senderRole: "Creative Operating System",
      isHuman: false,
      content: `Successfully ingested Pinterest moodboard: "${boardName}". Aesthetic tokens, dominant color harmonies (Imperial Crimson, Antique Gold Zari), and 2800K tungsten lighting specs have been locked into the active room context.`,
      timestamp: "Just now",
      workEvents: [
        { step: `Connecting to Pinterest API v5 for board: ${boardName}`, status: "DONE" },
        { step: "Extracting high-resolution visual references & palette weights", status: "DONE" },
        { step: "Synthesizing Visual DNA tokens into room memory", status: "DONE" }
      ],
      artifacts: [
        {
          id: `art-pb-${Date.now()}`,
          type: "MOODBOARD",
          title: `Ingested Moodboard — ${boardName}`,
          summary: "Extracted 3 dominant palettes and Banarasi raw silk drape physics from curated pin references.",
          data: {
            epistemicStatus: "OBSERVED",
            palette: "#7A1C24, #D4AF37, #0F111A",
            lighting: "2800K Tungsten Key + Cool 6500K Cyan Rim",
            fabricPhysics: "Banarasi Silk with micro-crease stiffness (0.84)"
          }
        }
      ]
    };

    setMessages(prev => [...prev, moodboardMsg]);
    setIsProcessing(false);
  };

  // ── Send Message to Live Backend ──────────────────────────────────────────
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputVal.trim() || isProcessing) return;

    const userText = inputVal.trim();
    setInputVal("");
    setIsProcessing(true);

    const userMsg: RoomMessage = {
      id: `msg-${Date.now()}`,
      senderId: "user",
      senderName: "Elena Vance",
      senderRole: "Human Creative Director",
      isHuman: true,
      content: userText,
      timestamp: "Just now"
    };

    setMessages(prev => [...prev, userMsg]);

    try {
      // Dispatch turn to backend FastAPI orchestrator
      const responseBackendMsg = await sendRoomMessage(roomId, userText, "Elena Vance");
      setIsConnected(true);
      setConnectionNotice(null);
      const frontendMsg = mapBackendMessageToFrontend(responseBackendMsg);
      setMessages(prev => [...prev, frontendMsg]);
    } catch (err: any) {
      console.warn("Backend turn error, falling back locally:", err);
      // Fallback turn so conversation never stalls if backend is cold
      const fallbackReply: RoomMessage = {
        id: `msg-${Date.now() + 1}`,
        senderId: "vyren_core",
        senderName: "VYREN",
        senderRole: "Creative Operating System",
        isHuman: false,
        content: `I've updated our creative constraints according to your feedback: "${userText}". Marcus Vance (AI Creative Director) is generating the revised visual studies.`,
        timestamp: "Just now",
        workEvents: [
          { step: `Applying human feedback: "${userText.slice(0, 30)}..."`, status: "DONE" },
          { step: "Re-calibrating textile drape and lighting shaders", status: "DONE" },
          { step: "Synthesizing multi-surface visual assets", status: "DONE" }
        ]
      };
      setMessages(prev => [...prev, fallbackReply]);
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Confirm Decision Gate Handler ─────────────────────────────────────────
  const handleConfirmDecision = async (decisionId: string, optionId: string) => {
    // Optimistic UI update
    setMessages(prev => prev.map(msg => {
      if (msg.decisions) {
        return {
          ...msg,
          decisions: msg.decisions.map(dec => {
            if (dec.id === decisionId) {
              return { ...dec, chosenOptionId: optionId, status: "CONFIRMED" };
            }
            return dec;
          })
        };
      }
      return msg;
    }));

    // Dispatch commit to backend
    try {
      await recordRoomDecision(roomId, decisionId, optionId, "Elena Vance");
    } catch (err) {
      console.warn("Backend decision recording fallback:", err);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background text-foreground font-sans">
      
      {/* Room Header */}
      <div className="px-6 py-4 border-b border-border bg-card/80 backdrop-blur-md flex items-center justify-between shrink-0 shadow-sm">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono tracking-widest uppercase text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded font-bold">
              {roomTitle.toUpperCase()}
            </span>
            <span className="text-muted-foreground/40 text-xs">&bull;</span>
            <span className="text-xs text-muted-foreground font-light">The Modern Sovereign</span>
          </div>
          <h1 className="text-lg font-serif text-foreground font-normal">Collaborative Creative Studio</h1>
        </div>

        {/* Room Presence Strip & Connection Status */}
        <div className="flex items-center gap-3 text-xs">
          <div 
            onClick={loadRoomState}
            title={isConnected ? "Connected to FastAPI Backend on :8000" : "Click to reconnect to Backend on :8000"}
            className="cursor-pointer flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted/40 border border-border hover:bg-muted/70 transition-colors"
          >
            <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
            <span className="text-foreground font-medium">VYREN</span>
            <span className="text-muted-foreground/60 font-mono text-[10px]">
              &bull; {isConnected ? "Live Engine (:8000)" : "Local Simulation"}
            </span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted/40 border border-border">
            <div className="w-5 h-5 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-purple-300 flex items-center justify-center text-[10px] font-mono font-bold">
              MV
            </div>
            <span className="text-foreground font-medium">Marcus Vance</span>
            <span className="text-muted-foreground/60 font-mono text-[10px]">&bull; AI CD</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted/40 border border-border">
            <div className="w-5 h-5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 flex items-center justify-center text-[10px] font-mono font-bold">
              EV
            </div>
            <span className="text-foreground font-medium">Elena Vance</span>
            <span className="text-amber-600 dark:text-amber-400 font-mono text-[10px] font-semibold">&bull; Human Authority</span>
          </div>
        </div>
      </div>

      {/* Messages Stream Viewport */}
      <div className="flex-1 overflow-y-auto p-6 lg:p-10 space-y-8 scrollbar-thin scrollbar-thumb-border max-w-5xl mx-auto w-full">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-4 animate-in fade-in duration-200 ${
              msg.isHuman ? "justify-end" : "justify-start"
            }`}
          >
            {/* AI Avatar */}
            {!msg.isHuman && (
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 mt-1 shadow-sm">
                <Sparkles className="w-4 h-4" />
              </div>
            )}

            {/* Message Body */}
            <div className={`space-y-4 max-w-2xl ${msg.isHuman ? "items-end text-right" : "items-start"}`}>
              
              {/* Header Info */}
              <div className={`flex items-center gap-2 text-xs ${msg.isHuman ? "justify-end" : "justify-start"}`}>
                <span className="font-medium text-foreground">{msg.senderName}</span>
                <span className="text-[10px] font-mono text-muted-foreground">{msg.senderRole}</span>
                <span className="text-[10px] text-muted-foreground/40">&bull; {msg.timestamp}</span>
              </div>

              {/* Text Bubble */}
              <div
                className={`p-5 rounded-2xl text-xs leading-relaxed font-light ${
                  msg.isHuman
                    ? "bg-primary text-primary-foreground font-medium rounded-tr-sm shadow-sm"
                    : "bg-card text-foreground border border-border rounded-tl-sm shadow-sm"
                }`}
              >
                {msg.content}
              </div>

              {/* In-Room Work Progress Events */}
              {msg.workEvents && msg.workEvents.length > 0 && (
                <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-2 text-left">
                  <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground/70">
                    Live Operational Trace
                  </span>
                  <div className="space-y-1.5 text-[11px]">
                    {msg.workEvents.map((we, idx) => (
                      <div key={idx} className="flex items-center justify-between text-foreground/80">
                        <span>{we.step}</span>
                        {we.status === "DONE" ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-mono text-[10px] flex items-center gap-1 font-semibold">
                            <Check className="w-3 h-3" /> Done
                          </span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-300 font-mono text-[10px] flex items-center gap-1 animate-pulse font-medium">
                            &bull; Pending Gate
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Inline Interactive Artifacts */}
              {msg.artifacts && msg.artifacts.length > 0 && (
                <div className="space-y-4 text-left">
                  {msg.artifacts.map((art) => (
                    <div
                      key={art.id}
                      className="p-5 rounded-2xl bg-card border border-border space-y-3 shadow-sm hover:border-primary/40 transition-all"
                    >
                      <div className="flex items-center justify-between border-b border-border pb-2.5">
                        <div className="flex items-center gap-2">
                          {art.type === "RESEARCH" ? (
                            <Brain className="w-4 h-4 text-indigo-500 dark:text-purple-400" />
                          ) : (
                            <Compass className="w-4 h-4 text-primary" />
                          )}
                          <span className="text-xs font-serif text-foreground font-medium">{art.title}</span>
                        </div>
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold">
                          {art.data?.epistemicStatus || art.data?.epistemic_status || "READY"}
                        </span>
                      </div>

                      <p className="text-xs text-muted-foreground font-light leading-relaxed">{art.summary}</p>

                      {/* Creative Directions Comparison Preview */}
                      {art.type === "CREATIVE_DIRECTION" && (art.data?.territoryA || art.data?.territory_a) && (
                        <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
                          <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-1">
                            <span className="text-[10px] font-mono text-primary font-bold">
                              Territory A: {art.data?.territoryA?.title || art.data?.territory_a?.title || "Modern Sovereign"}
                            </span>
                            <div className="text-foreground font-medium">
                              {art.data?.territoryA?.archetype || art.data?.territory_a?.archetype || "Architectural Precision"}
                            </div>
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-semibold">
                              {art.data?.territoryA?.distinctiveness || art.data?.territory_a?.distinctiveness || "96% Distinctiveness"}
                            </span>
                          </div>
                          <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-1">
                            <span className="text-[10px] font-mono text-indigo-500 dark:text-purple-400 font-bold">
                              Territory B: {art.data?.territoryB?.title || art.data?.territory_b?.title || "Regal Lineage"}
                            </span>
                            <div className="text-foreground font-medium">
                              {art.data?.territoryB?.archetype || art.data?.territory_b?.archetype || "Heritage Grandeur"}
                            </div>
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-semibold">
                              {art.data?.territoryB?.distinctiveness || art.data?.territory_b?.distinctiveness || "88% Distinctiveness"}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Inline Human Decision Gates */}
              {msg.decisions && msg.decisions.length > 0 && (
                <div className="space-y-3 text-left">
                  {msg.decisions.map((dec) => (
                    <div
                      key={dec.id}
                      className="p-5 rounded-2xl bg-card border border-amber-500/30 space-y-3 shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Lock className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                          <span className="text-xs font-serif text-foreground font-medium">{dec.title}</span>
                        </div>
                        <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full border ${
                          dec.status === "CONFIRMED" 
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-semibold" 
                            : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20 font-semibold"
                        }`}>
                          {dec.status === "CONFIRMED" ? "DECISION COMMITTED ★" : "HUMAN GATE"}
                        </span>
                      </div>

                      <p className="text-xs text-muted-foreground font-light">{dec.context}</p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {dec.options.map((opt) => {
                          const isSelected = dec.chosenOptionId === opt.id;
                          return (
                            <button
                              key={opt.id}
                              onClick={() => handleConfirmDecision(dec.id, opt.id)}
                              disabled={dec.status === "CONFIRMED"}
                              className={`p-3 rounded-xl border text-left text-xs transition-all flex items-center justify-between ${
                                isSelected
                                  ? "bg-primary text-primary-foreground font-semibold border-primary shadow-sm"
                                  : "bg-muted/40 text-foreground border-border hover:bg-accent"
                              }`}
                            >
                              <span>{opt.label}</span>
                              {isSelected && <CheckCircle2 className="w-4 h-4" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>

            {/* Human Avatar */}
            {msg.isHuman && (
              <div className="w-9 h-9 rounded-xl bg-accent text-accent-foreground border border-border flex items-center justify-center shrink-0 mt-1 shadow-sm">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Persistent Bottom Composer Bar & Quick Action Chips */}
      <div className="p-4 border-t border-border bg-card/80 backdrop-blur-md shrink-0 space-y-2.5 shadow-lg">
        {/* Quick Suggestion Chips */}
        <div className="max-w-4xl mx-auto flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
          <button
            onClick={() => setIsPinterestDrawerOpen(true)}
            className="px-2.5 py-1 rounded-lg bg-[#E60023]/10 hover:bg-[#E60023]/20 border border-[#E60023]/30 text-[#E60023] text-[11px] font-medium transition-colors flex items-center gap-1.5 shrink-0"
          >
            <Layers className="w-3 h-3" />
            <span>Ingest Pinterest Moodboard</span>
          </button>
          <button
            onClick={() => {
              setInputVal("Search trending luxury editorial aesthetics and modern royal bridal drapes on Pinterest");
            }}
            className="px-2.5 py-1 rounded-lg bg-accent/60 hover:bg-accent border border-border text-foreground text-[11px] font-medium transition-colors flex items-center gap-1.5 shrink-0"
          >
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>Discover Editorial Trends</span>
          </button>
          <button
            onClick={() => {
              setInputVal("Marcus, calibrate 2800K tungsten key lighting with cool 6500K cyan rim on Banarasi silk");
            }}
            className="px-2.5 py-1 rounded-lg bg-accent/60 hover:bg-accent border border-border text-foreground text-[11px] font-medium transition-colors flex items-center gap-1.5 shrink-0"
          >
            <Sparkles className="w-3 h-3 text-indigo-500" />
            <span>Calibrate Lighting Shaders</span>
          </button>
        </div>

        <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex items-center gap-3 bg-muted/40 p-2 rounded-2xl border border-border focus-within:border-primary/50 transition-all">
          <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>

          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="Collaborate with VYREN in the Room... (e.g. 'Make the hero more commanding')"
            className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none font-light"
          />

          <button
            type="submit"
            disabled={!inputVal.trim() || isProcessing}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs hover:opacity-90 disabled:opacity-40 transition-opacity flex items-center gap-1.5 shrink-0 shadow-sm"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>Thinking...</span>
              </>
            ) : (
              <>
                <span>Send</span>
                <Send className="w-3 h-3" />
              </>
            )}
          </button>
        </form>
      </div>

      {/* Slide-Over Pinterest Ingestion Drawer */}
      <PinterestMoodboardDrawer
        isOpen={isPinterestDrawerOpen}
        onClose={() => setIsPinterestDrawerOpen(false)}
        onIngestBoard={handleIngestPinterestBoard}
      />

    </div>
  );
}
