"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import type { CSSProperties } from "react";
import { useWorkspace } from "./useWorkspace";
import { isBusy, stateLabels } from "./types";
import "./styles.css";
import "./react-layout.css";
import { Avatar, MouseTrails } from "./Avatar";
import { Icon, IconButton } from "./Icon";
import { Sidebar, GroupDialog, AgentDialog } from "./Sidebar";
import { Conversation, Handoff } from "./Conversation";
import { Composer } from "./Composer";
import { Notifications } from "./Notifications";
import { ThemePicker, useTheme } from "./ThemePicker";
import { Pullcord } from "./Pullcord";
import { ProjectDialog, TaskRail } from "./TaskRail";
import { RadialMenu } from "./RadialMenu";
import { Modal } from "./Modal";
import { ChapterScrubber, ChapterScrubberDemo, getThreadChapters } from "./ChapterScrubber";

export function VyrenWorkspace() {
  const router = useRouter();
  const workspace = useWorkspace(),
    { state, dispatch } = workspace,
    theme = useTheme();
  const thread = state.threads.find((t) => t.id === state.activeId)!,
    agent = state.agents.find((a) => a.id === thread.agentId),
    members = (thread.memberIds || [])
      .map((id) => state.agents.find((a) => a.id === id)!)
      .filter(Boolean);
  const [menu, setMenu] = useState(false),
    [themesOpen, setThemesOpen] = useState(false),
    [scrubberOpen, setScrubberOpen] = useState(false),
    [projectDialog, setProjectDialog] = useState(false),
    [quickPanel, setQuickPanel] = useState<"workspace" | "shortcuts" | null>(
      null,
    ),
    [agentEdit, setAgentEdit] = useState<{
      id: string;
      mode: "edit" | "delete";
    } | null>(null),
    [groupDialog, setGroupDialog] = useState<string | null>(null),
    [handoff, setHandoff] = useState<string | null>(null),
    [sidebarWidth, setSidebarWidth] = useState(() => {
      if (typeof window === "undefined") return 320;
      const saved = Number(localStorage.getItem("fieldwork-sidebar-width"));
      return saved >= 260 && saved <= 480 ? saved : 320;
    });
  useEffect(() => {
    localStorage.setItem("fieldwork-sidebar-width", String(sidebarWidth));
  }, [sidebarWidth]);

  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const findTarget = () => {
      const el = document.getElementById("top-header-workspace-actions");
      if (el) setPortalTarget(el);
    };
    findTarget();
    const timer = setTimeout(findTarget, 100);
    return () => clearTimeout(timer);
  }, []);
  const groupEdit = state.threads.find((t) => t.id === groupDialog),
    handoffThread = state.threads.find((t) => t.id === handoff);
  const project = state.projects.find((p) => p.id === state.activeProjectId)!,
    projectThreads = state.threads.filter((t) => t.projectId === project.id),
    ownerTasks = projectThreads.filter((t) =>
      thread.memberIds
        ? t.memberIds?.join("|") === thread.memberIds.join("|")
        : t.agentId === thread.agentId,
    ),
    rosterThreads = projectThreads.filter(
      (t, i, a) =>
        a.findIndex(
          (x) =>
            x.agentId === t.agentId &&
            x.memberIds?.join("|") === t.memberIds?.join("|"),
        ) === i,
    );
  function select(id: string) {
    dispatch({ type: "select", id });
    setMenu(false);
  }
  function newAssistant(manager = false) {
    const count = state.agents.length;
    dispatch({
      type: "agent",
      agent: {
        id: crypto.randomUUID(),
        name: manager ? "New manager" : "New assistant " + (count - 4),
        initials: manager ? "NM" : "NA",
        role: manager
          ? "Manager · coordinates your workforce"
          : "Custom workspace",
        manager,
        shape: count % 5,
        color: ["#a7593d", "#356e60", "#65649c", "#8b7247"][count % 4],
        welcome:
          "What should this assistant help you accomplish? Send a task to explore the demo workflow.",
      },
    });
    setMenu(false);
  }
  return (
    <>
      <div
        className={"app " + (menu ? "menu-open" : "")}
        id="app"
        style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}
      >
        <Sidebar
          agents={state.agents}
          threads={rosterThreads}
          activeId={state.activeId}
          onSelect={select}
          projects={state.projects}
          activeProjectId={state.activeProjectId}
          onProject={(id) => {
            dispatch({ type: "project", id });
            setMenu(false);
          }}
          onNew={newAssistant}
          onGroup={() => setGroupDialog("new")}
          onEdit={(agent, mode) => setAgentEdit({ id: agent.id, mode })}
          width={sidebarWidth}
          onWidth={setSidebarWidth}
        >
          <TaskRail
            project={project}
            owner={thread}
            tasks={ownerTasks}
            activeId={thread.id}
            agents={state.agents}
            onSelect={select}
            onCreate={(name) =>
              dispatch({
                type: "new-task",
                id: crypto.randomUUID(),
                ownerId: thread.id,
                name,
              })
            }
          />
        </Sidebar>
        {menu && (
          <button
            className="navigation-backdrop"
            aria-label="Close assistant navigation"
            onClick={() => setMenu(false)}
          />
        )}
        <main className="main">
          <header className="header">
            <div className="identity">
              <IconButton
                icon="menu"
                label="Toggle assistant navigation"
                className="mobilemenu"
                aria-expanded={menu}
                onClick={() => setMenu(!menu)}
              />
              <Avatar
                agent={agent}
                members={thread.memberIds ? members : undefined}
                state={thread.state}
              />
              <div>
                <div className="context-path">
                  {project.name} / {agent?.name || "Group"}
                </div>
                <div className="title">{thread.name}</div>
                <div className="subtitle">
                  {thread.memberIds && thread.state === "idle"
                    ? "Ready to collaborate"
                    : stateLabels[thread.state]}
                </div>
              </div>
            </div>
          </header>
          {thread.memberIds && (
            <div className="group-status">
              <div className="member-stack">
                {members.map((a) => (
                  <Avatar
                    key={a.id}
                    agent={a}
                    state={thread.typingIds.includes(a.id) ? "working" : "idle"}
                  />
                ))}
              </div>
              <span>{members.length} agents · shared task & conversation</span>
              <span className="group-demo-tag">Simulated collaboration</span>
              {thread.typingIds.length > 0 && (
                <div className="group-typing" role="status">
                  {thread.typingIds.map((id) => (
                    <span key={id}>
                      <i
                        className="typing-pip"
                        style={{
                          background: state.agents.find((a) => a.id === id)
                            ?.color,
                        }}
                      />
                      {state.agents.find((a) => a.id === id)?.name} is typing
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
          <Conversation
            thread={thread}
            agents={state.agents}
            onHandoff={() => {
              setHandoff(thread.id);
              workspace.setState(thread, "human_control");
            }}
            onApprove={() => workspace.approve(thread)}
            onRevise={() => {
              workspace.entry(
                thread,
                "user",
                "Please sharpen the recommendations.",
              );
              workspace.entry(
                thread,
                "message",
                "Revision request recorded. Connect this action to your editor or generation service to create a new output version.",
              );
            }}
            onRoutine={() => {
              workspace.entry(
                thread,
                "event",
                "Weekly demo routine · Monday at 09:00 · your workspace timezone",
              );
              dispatch({ type: "routine", id: thread.id });
            }}
          />
          <Composer
            key={thread.id}
            name={thread.name}
            draft={thread.draft}
            onDraft={(text) =>
              dispatch({
                type: "prompt",
                id: thread.id,
                patch: { draft: text },
              })
            }
            onSend={(text) => {
              workspace.send(thread, text);
              dispatch({ type: "prompt", id: thread.id, patch: { draft: "" } });
            }}
            members={thread.memberIds ? members : state.agents}
            settings={thread.settings}
            onSettings={(settings) =>
              dispatch({ type: "prompt", id: thread.id, patch: { settings } })
            }
            files={thread.files}
            onFiles={(files) =>
              dispatch({ type: "prompt", id: thread.id, patch: { files } })
            }
          />
        </main>
      </div>
      <aside className="workspace-chapter-scrubber card-left" aria-label="Chapter scrubber rail">
        <ChapterScrubber
          key={thread.id}
          chapters={getThreadChapters(thread)}
          onSelectChapter={(ch) => {
            const el = document.getElementById("event-" + ch.id);
            el?.scrollIntoView({ behavior: "smooth", block: "center" });
          }}
        />
      </aside>
      <MouseTrails />
      <RadialMenu
        onAction={(id) => {
          if (id === "home") router.push("/home");
          else if (id === "studio") router.push("/studio");
          else if (id === "team") router.push("/team");
          else if (id === "metrics") router.push("/activity");
          else if (id === "kanban") router.push("/kanban");
          else if (id === "assets") router.push("/assets");
          else if (id === "settings") router.push("/settings");
          else if (id === "appearance") setThemesOpen(true);
          else if (id === "workforce") newAssistant(false);
          else if (id === "groups")
            setGroupDialog(
              thread.memberIds && !isBusy(thread.state) ? thread.id : "new",
            );
          else if (id === "projects") setProjectDialog(true);
          else if (id === "workspace" || id === "shortcuts") setQuickPanel(id);
        }}
      />
      {themesOpen && (
        <ThemePicker
          palette={theme.palette}
          night={theme.night}
          onChange={theme.setPalette}
          onClose={() => setThemesOpen(false)}
        />
      )}
      {scrubberOpen && (
        <Modal
          title="Chapter scrubber"
          onClose={() => setScrubberOpen(false)}
        >
          <div className="dialogbody" style={{ padding: "12px 16px 24px" }}>
            <ChapterScrubberDemo thread={thread} />
          </div>
        </Modal>
      )}
      {projectDialog && (
        <ProjectDialog
          onClose={() => setProjectDialog(false)}
          onCreate={(name) => {
            dispatch({ type: "new-project", id: crypto.randomUUID(), name });
            setProjectDialog(false);
          }}
        />
      )}
      {quickPanel && (
        <Modal
          title={
            quickPanel === "workspace" ? "Workspace" : "Keyboard shortcuts"
          }
          onClose={() => setQuickPanel(null)}
        >
          <div className="dialogbody">
            {quickPanel === "workspace" ? (
              <>
                <p>
                  <strong>Your workspace</strong>
                </p>
                <p className="subtitle">
                  Personal workspace · local demonstration
                </p>
                <p>
                  Account, storage, integrations, and workspace preferences will
                  live here.
                </p>
              </>
            ) : (
              <div className="shortcut-list">
                <span>
                  Send message <kbd>Enter</kbd>
                </span>
                <span>
                  New line <kbd>Shift + Enter</kbd>
                </span>
                <span>
                  Choose suggestion <kbd>Enter / Tab</kbd>
                </span>
                <span>
                  Close a menu <kbd>Escape</kbd>
                </span>
              </div>
            )}
          </div>
        </Modal>
      )}
      {groupDialog && (
        <GroupDialog
          key={groupDialog}
          agents={state.agents}
          thread={groupEdit}
          onClose={() => setGroupDialog(null)}
          onSave={(name, ids) => {
            dispatch({
              type: "group",
              id: groupEdit?.id || crypto.randomUUID(),
              name,
              memberIds: ids,
            });
            setGroupDialog(null);
            setMenu(false);
          }}
        />
      )}
      {agentEdit && state.agents.find((agent) => agent.id === agentEdit.id) && (
        <AgentDialog
          agent={state.agents.find((agent) => agent.id === agentEdit.id)!}
          mode={agentEdit.mode}
          onClose={() => setAgentEdit(null)}
          onSave={(name, role) => {
            dispatch({ type: "update-agent", id: agentEdit.id, name, role });
            setAgentEdit(null);
          }}
          onDelete={() => {
            dispatch({ type: "delete-agent", id: agentEdit.id });
            setAgentEdit(null);
          }}
        />
      )}
      {handoffThread && (
        <Handoff
          name={handoffThread.name}
          onClose={() => {
            workspace.setState(handoffThread, "action_needed");
            setHandoff(null);
          }}
          onResume={() => {
            workspace.continueWork(handoffThread);
            setHandoff(null);
          }}
        />
      )}
      {portalTarget &&
        createPortal(
          <div className="headbuttons flex items-center gap-2">
            <Notifications
              items={state.notifications}
              projects={state.projects}
              threads={state.threads}
              dispatch={dispatch}
              onDecision={workspace.decide}
              onOpen={select}
            />
            {isBusy(thread.state) && (
              <button
                type="button"
                aria-label="Cancel run"
                title="Cancel run"
                className="workspace-cancel-btn"
                onClick={() => workspace.cancelRun(thread.id)}
              >
                <Icon name="close" />
              </button>
            )}
            <button
              type="button"
              aria-label={
                thread.state === "idle" ? "Start studio run" : "Run in progress"
              }
              title={
                thread.state === "idle" ? "Start studio run" : "Run in progress"
              }
              className={`workspace-run-btn ${thread.state === "idle" ? "idle" : "running"}`}
              disabled={thread.state !== "idle"}
              onClick={() => workspace.start(thread)}
            >
              <Icon name="play" />
              <span className="workspace-run-label">
                {thread.state === "idle" ? "Start Run" : "Running"}
              </span>
            </button>
          </div>,
          portalTarget,
        )}
    </>
  );
}

export { VyrenWorkspace as App };
