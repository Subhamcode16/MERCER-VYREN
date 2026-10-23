"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, BookOpen, Check, CircleHelp, LockKeyhole, PenLine, ShieldCheck } from "lucide-react";
import { ApiError, apiFetch } from "@/lib/api";
import styles from "./TeamWorkroom.module.css";

type Bot = {
  id: string;
  name: string;
  role: string;
  mandate: string;
  state: string;
  configuration_version: number;
  skill_bindings: string[];
  tool_capabilities: string[];
};

type BotTask = {
  id: string;
  state: string;
  blocked_reason: string | null;
  result: {
    caption_draft: string;
    source_references: string[];
    retrieved_memory: Array<{ text: string; source_reference: string; epistemic_label: string }>;
    uncertainty: string;
    approval_state: string;
    media_generated: boolean;
    model_route: { model: string };
  } | null;
};

type BotMemory = {
  id: string;
  text: string;
  source_reference: string;
  epistemic_label: string;
};

type ToolAudit = {
  operation: string;
  status: string;
  reason: string;
  configuration_version: number | null;
};

export function BotFoundationPanel() {
  const [bot, setBot] = useState<Bot | null>(null);
  const [brandName, setBrandName] = useState("");
  const [status, setStatus] = useState<"loading" | "empty" | "ready" | "saving" | "error">("loading");
  const [error, setError] = useState("");
  const [brief, setBrief] = useState("");
  const [task, setTask] = useState<BotTask | null>(null);
  const [taskStatus, setTaskStatus] = useState<"idle" | "loading" | "working" | "error">("idle");
  const [taskError, setTaskError] = useState("");
  const [memories, setMemories] = useState<BotMemory[]>([]);
  const [memoryText, setMemoryText] = useState("");
  const [memorySource, setMemorySource] = useState("");
  const [memoryError, setMemoryError] = useState("");
  const [savingMemory, setSavingMemory] = useState(false);
  const [taskAudit, setTaskAudit] = useState<ToolAudit[]>([]);

  useEffect(() => {
    let active = true;
    apiFetch("/api/bots")
      .then(async (found: Bot | null) => {
        if (!active) return;
        setBot(found);
        setStatus(found ? "ready" : "empty");
        if (!found) return;
        apiFetch(`/api/bots/${found.id}/memories`)
          .then((items: BotMemory[]) => { if (active) setMemories(items); })
          .catch(() => { if (active) setMemoryError("Approved memory could not be loaded."); });
        setTaskStatus("loading");
        try {
          const tasks = await apiFetch(`/api/bots/${found.id}/tasks`) as BotTask[];
          if (active) setTask(tasks[0] ?? null);
          if (tasks[0]) {
            const attempts = await apiFetch(`/api/bots/${found.id}/tasks/${tasks[0].id}/audit`) as ToolAudit[];
            if (active) setTaskAudit(attempts);
          }
        } catch {
          if (active) setTaskError("The latest draft could not be loaded.");
        } finally {
          if (active) setTaskStatus("idle");
        }
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setError(cause instanceof ApiError && (cause.status === 401 || cause.status === 403)
          ? "Sign in to meet your Content Producer."
          : "The bot service is unavailable. Please try again when the backend is running.");
        setStatus("error");
      });
    return () => { active = false; };
  }, []);

  async function createBot(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!brandName.trim()) return;
    setStatus("saving");
    setError("");
    try {
      const created = await apiFetch("/api/bots", {
        method: "POST",
        body: JSON.stringify({ brand_name: brandName.trim() }),
      }) as Bot;
      setBot(created);
      setStatus("ready");
    } catch {
      setError("The bot could not be created. Check the service and try again.");
      setStatus("error");
    }
  }

  async function prepareDraft(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!bot || !brief.trim()) return;
    setTaskStatus("working");
    setTaskError("");
    setTaskAudit([]);
    try {
      const created = await apiFetch(`/api/bots/${bot.id}/tasks`, {
        method: "POST",
        headers: { "X-Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({ objective: "Prepare an Instagram caption concept", brief: brief.trim() }),
      }) as BotTask;
      setTask(created);
      const drafted = await apiFetch(`/api/bots/${bot.id}/tasks/${created.id}/run-preview`, {
        method: "POST",
      }) as BotTask;
      setTask(drafted);
      setTaskAudit(await apiFetch(`/api/bots/${bot.id}/tasks/${created.id}/audit`) as ToolAudit[]);
      setBrief("");
      setTaskStatus("idle");
    } catch {
      setTaskError("The draft could not be completed. Its saved task state remains available after refresh.");
      setTaskStatus("error");
    }
  }

  async function saveMemory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!bot || !memoryText.trim() || !memorySource.trim()) return;
    setSavingMemory(true);
    setMemoryError("");
    try {
      await apiFetch(`/api/bots/${bot.id}/memories`, {
        method: "POST",
        body: JSON.stringify({
          text: memoryText.trim(),
          source_reference: memorySource.trim(),
          epistemic_label: "owner_stated",
        }),
      });
      setMemories(await apiFetch(`/api/bots/${bot.id}/memories`) as BotMemory[]);
      setMemoryText("");
      setMemorySource("");
    } catch {
      setMemoryError("Approved memory could not be saved. Please try again.");
    } finally {
      setSavingMemory(false);
    }
  }

  const stateLabel = status === "ready"
    ? "Available for direction"
    : status === "loading" || status === "saving"
      ? "Connecting"
      : status === "empty" ? "Ready to create" : "Not connected";

  return (
    <section aria-label="Your Content Producer" className={styles.workroom}>
      <div className={styles.botMasthead}>
        <div className={styles.botIdentity}>
          <div className={styles.botMonogram} aria-hidden="true"><span>V</span><i /></div>
          <div>
            <p className={styles.eyebrow}>YOUR FIRST COLLEAGUE</p>
            <h2>{bot?.name ?? "Content Producer"}</h2>
            <p className={styles.botSubline}>Creative production · Your brand, your direction</p>
          </div>
        </div>
        <span className={`${styles.availability} ${status === "ready" ? "" : styles.availabilityMuted}`}><i aria-hidden="true" />{stateLabel}</span>
      </div>

      {(status === "loading" || status === "saving") && (
        <div className={styles.entryState} role="status">
          <span className={styles.loadingPulse} aria-hidden="true" />
          <h3>{status === "saving" ? "Creating your colleague" : "Looking for your colleague"}</h3>
          <p>Checking the saved identity and workspace.</p>
        </div>
      )}

      {status === "error" && (
        <div className={styles.entryState} role="alert">
          <LockKeyhole size={24} strokeWidth={1.6} />
          <h3>{error}</h3>
          <p>Your workspace is private. Sign in using the button in the top bar, or retry when the service is available.</p>
        </div>
      )}

      {status === "empty" && (
        <div className={styles.onboarding}>
          <div className={styles.onboardingCopy}>
            <p className={styles.eyebrow}>START HERE</p>
            <h3>Give your first bot a place to belong.</h3>
            <p>Choose the brand it will work for. VYREN will create one persistent Content Producer whose identity and approved memory stay with that brand.</p>
            <div className={styles.boundaryNote}><ShieldCheck size={17} /> It can prepare a local draft. Publishing stays with you.</div>
          </div>
          <form onSubmit={createBot} className={styles.onboardingForm}>
            <label htmlFor="first-brand">Brand name</label>
            <input id="first-brand" value={brandName} onChange={event => setBrandName(event.target.value)}
              required maxLength={100} placeholder="For example, ILYREN" />
            <button type="submit" className={styles.primaryButton}>Create Content Producer <ArrowUpRight size={17} /></button>
          </form>
        </div>
      )}

      {status === "ready" && bot && (
        <div className={styles.workGrid}>
          <aside className={styles.identityColumn} aria-label="Bot identity and authority">
            <p className={styles.eyebrow}>WHO YOU ARE WORKING WITH</p>
            <h3>A collaborator with a clear remit.</h3>
            <p className={styles.mandate}>{bot.mandate}</p>
            <dl className={styles.identityFacts}>
              <div><dt>Role</dt><dd>{bot.role.replaceAll("_", " ")}</dd></div>
              <div><dt>Configuration</dt><dd>Version {bot.configuration_version}</dd></div>
              <div><dt>Available tool</dt><dd>{bot.tool_capabilities.length ? "Read approved role memory" : "None bound"}</dd></div>
            </dl>
            <div className={styles.authorityBox}>
              <ShieldCheck size={20} strokeWidth={1.6} />
              <div><strong>You hold the final say.</strong><span>This bot cannot publish, spend, or turn a draft into approved brand memory.</span></div>
            </div>
          </aside>

          <div className={styles.workColumn}>
            <div className={styles.sectionHeading}>
              <div><p className={styles.eyebrow}>WORK TOGETHER</p><h3>Give it a brief.</h3></div>
              <span className={styles.stepNumber}>01 / 02</span>
            </div>
            <p className={styles.supportText}>Share approved facts and the angle you want to explore. The current preview produces a local caption concept for your review.</p>
            <form onSubmit={prepareDraft} className={styles.briefForm}>
              <label htmlFor="bot-brief">The brief</label>
              <textarea id="bot-brief" value={brief} onChange={event => setBrief(event.target.value)}
                required maxLength={5000} rows={5}
                placeholder="What should this Instagram post say? Include the facts and context you approve." />
              <div className={styles.briefFooter}>
                <span><LockKeyhole size={15} /> Nothing will be published.</span>
                <button type="submit" className={styles.primaryButton} disabled={taskStatus === "working"}>
                  {taskStatus === "working" ? "Preparing draft…" : "Prepare a local draft"} <ArrowUpRight size={17} />
                </button>
              </div>
            </form>

            <div className={styles.draftSection} aria-live="polite">
              <div className={styles.sectionHeading}>
                <div><p className={styles.eyebrow}>REVIEW THE WORK</p><h3>Latest draft</h3></div>
                <span className={styles.stepNumber}>02 / 02</span>
              </div>
              {taskStatus === "loading" && <p role="status" className={styles.mutedLine}>Loading the latest saved work…</p>}
              {taskError && <p role="alert" className={styles.errorLine}>{taskError}</p>}
              {!task && taskStatus !== "loading" && <div className={styles.emptyDraft}><PenLine size={22} strokeWidth={1.5} /><p>No draft yet. Start with a brief above.</p></div>}
              {task && (
                <div className={styles.draftResult}>
                  <div className={styles.draftStatus}><span>{task.state.replaceAll("_", " ").toLowerCase()}</span><span>Not approved</span></div>
                  {task.blocked_reason && <p className={styles.errorLine}>Blocked: {task.blocked_reason.replaceAll("_", " ")}</p>}
                  {task.result && <>
                    <p className={styles.caption}>{task.result.caption_draft}</p>
                    <div className={styles.provenance}>
                      <p><strong>Source</strong> {task.result.source_references.join(", ") || "No external source"}</p>
                      <p><strong>Route</strong> {task.result.model_route.model}</p>
                      <p><strong>Uncertainty</strong> {task.result.uncertainty}</p>
                      {task.result.retrieved_memory.length > 0 && <p><strong>Guidance</strong> {task.result.retrieved_memory.map(item => `${item.text} (${item.source_reference}; ${item.epistemic_label})`).join(" · ")}</p>}
                    </div>
                    <p className={styles.draftBoundary}><CircleHelp size={16} /> Local concept only. No media generated; no publication approval.</p>
                  </>}
                  {taskAudit.length > 0 && <details className={styles.auditDisclosure}>
                    <summary>View tool audit</summary>
                    <ul>{taskAudit.map((attempt, index) => <li key={index}>{attempt.operation}: {attempt.status.toLowerCase()} · {attempt.reason} · config v{attempt.configuration_version ?? "?"}</li>)}</ul>
                  </details>}
                </div>
              )}
            </div>
          </div>

          <aside className={styles.memoryColumn} aria-label="Approved role memory">
            <div className={styles.memoryTitle}><BookOpen size={20} strokeWidth={1.6} /><span>What it remembers</span></div>
            <p className={styles.supportText}>Only guidance you add here becomes eligible role memory. Every item keeps its source.</p>
            <div className={styles.memoryList}>
              {memories.length === 0 && <p className={styles.noMemory}>No approved role memory yet.</p>}
              {memories.map(item => <article key={item.id} className={styles.memoryItem}>
                <p>{item.text}</p>
                <span><Check size={13} /> {item.source_reference} · {item.epistemic_label.replaceAll("_", " ")}</span>
              </article>)}
            </div>
            <form onSubmit={saveMemory} className={styles.memoryForm}>
              <h4>Add guidance</h4>
              <label htmlFor="memory-text">What should it remember?</label>
              <textarea id="memory-text" value={memoryText} onChange={event => setMemoryText(event.target.value)}
                required maxLength={2000} rows={3} placeholder="A brand voice rule or creative preference" />
              <label htmlFor="memory-source">Where did this come from?</label>
              <input id="memory-source" value={memorySource} onChange={event => setMemorySource(event.target.value)}
                required maxLength={500} placeholder="Approved brief, founder direction…" />
              <button type="submit" disabled={savingMemory} className={styles.secondaryButton}>{savingMemory ? "Saving…" : "Save approved guidance"}</button>
              {memoryError && <p role="alert" className={styles.errorLine}>{memoryError}</p>}
            </form>
          </aside>
        </div>
      )}

      <div className={styles.futureStrip}>
        <div><p className={styles.eyebrow}>WHAT COMES LATER</p><strong>A bigger team, when the first colleague is proven.</strong></div>
        <p>Multi-bot collaboration, individual computer sessions, and shared brand memory are planned. They are not active here yet.</p>
      </div>
    </section>
  );
}
