import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { Icon, type IconName } from "./Icon";
import { Modal } from "./Modal";
import "./radial-menu.css";
import {
  loadLiquidGlass,
  type LiquidGlassInstance,
} from "./liquidGlassRuntime";

export const MAX_SHORTCUTS = 10;

export interface MenuItemDefinition {
  id: string;
  label: string;
  icon: IconName;
  category: "routes" | "workspace";
}

export const ALL_MENU_ITEMS: MenuItemDefinition[] = [
  // Routes / Navigation
  { id: "home", label: "Home", icon: "home", category: "routes" },
  { id: "studio", label: "Workspace", icon: "grid", category: "routes" },
  { id: "team", label: "Team", icon: "group", category: "routes" },
  { id: "metrics", label: "Metrics Dashboard", icon: "metrics", category: "routes" },
  { id: "kanban", label: "Kanban Board", icon: "kanban", category: "routes" },
  { id: "assets", label: "Assets", icon: "assets", category: "routes" },
  { id: "settings", label: "Settings", icon: "settings", category: "routes" },

  // Workspace Actions
  { id: "appearance", label: "Appearance", icon: "palette", category: "workspace" },
  { id: "workforce", label: "New agent", icon: "plus", category: "workspace" },
  { id: "groups", label: "Groups", icon: "group", category: "workspace" },
  { id: "projects", label: "New project", icon: "file", category: "workspace" },
  { id: "workspace", label: "Overview", icon: "shield", category: "workspace" },
  { id: "shortcuts", label: "Shortcuts", icon: "model", category: "workspace" },
];

export type Point = { x: number; y: number };
export type MenuId = string;

export type MenuPreferences = {
  size: number;
  opacity: number;
  enabled: MenuId[];
};

export const defaultPreferences: MenuPreferences = {
  size: 52,
  opacity: 86,
  enabled: [
    "home",
    "team",
    "metrics",
    "kanban",
    "assets",
    "appearance",
    "workforce",
    "groups",
    "settings",
  ],
};

function clamp(point: Point, rad = 104): Point {
  const margin = rad + 32;
  return {
    x: Math.max(margin, Math.min(innerWidth - margin, point.x)),
    y: Math.max(margin, Math.min(innerHeight - margin, point.y)),
  };
}

export function RadialMenu({ onAction }: { onAction: (id: string) => void }) {
  const [open, setOpen] = useState(false),
    [settingsOpen, setSettingsOpen] = useState(false),
    [position, setPosition] = useState<Point>({ x: 0, y: 0 }),
    [ready, setReady] = useState(false),
    [preferences, setPreferences] = useState<MenuPreferences>(() => {
      try {
        const saved = JSON.parse(
          localStorage.getItem("fieldwork-quick-menu-settings") || "null",
        ) as Partial<MenuPreferences> | null;
        if (saved && Array.isArray(saved.enabled) && saved.enabled.length > 0) {
          const validIds = new Set(ALL_MENU_ITEMS.map((i) => i.id));
          const enabled = saved.enabled
            .filter((id) => validIds.has(id))
            .slice(0, MAX_SHORTCUTS);
          return {
            size: Math.min(72, Math.max(42, Number(saved.size) || 52)),
            opacity: Math.min(100, Math.max(35, Number(saved.opacity) || 86)),
            enabled: enabled.length > 0 ? enabled : defaultPreferences.enabled,
          };
        }
        return defaultPreferences;
      } catch {
        return defaultPreferences;
      }
    });

  const drag = useRef<{
      id: number;
      dx: number;
      dy: number;
      moved: boolean;
    } | null>(null),
    glassHost = useRef<HTMLDivElement>(null),
    glassInstance = useRef<LiquidGlassInstance | null>(null);

  const visibleItems = ALL_MENU_ITEMS.filter((item) =>
    preferences.enabled.includes(item.id),
  ).slice(0, MAX_SHORTCUTS);

  const menuItems: { id: string; label: string; icon: IconName }[] = [
    ...visibleItems,
    { id: "menu-settings", label: "Menu settings", icon: "settings" },
  ];

  const dynamicRadius = Math.max(
    104,
    Math.min(150, 96 + (menuItems.length - 6) * 8),
  );

  useEffect(() => {
    let next: Point | null = null;
    const saved = localStorage.getItem("fieldwork-quick-menu-position");
    if (saved)
      try {
        next = JSON.parse(saved) as Point;
      } catch {
        /* use a fresh position */
      }
    next = clamp(
      next || {
        x: innerWidth * (0.62 + Math.random() * 0.18),
        y: innerHeight * (0.24 + Math.random() * 0.24),
      },
      dynamicRadius,
    );
    setPosition(next);
    setReady(true);
    const resize = () => setPosition((point) => clamp(point, dynamicRadius));
    addEventListener("resize", resize);
    return () => removeEventListener("resize", resize);
  }, [dynamicRadius]);

  useEffect(() => {
    localStorage.setItem(
      "fieldwork-quick-menu-settings",
      JSON.stringify(preferences),
    );
  }, [preferences]);

  useEffect(() => {
    if (!glassHost.current) return;
    const update = () => {
      if (!glassHost.current) return;
      const rect = glassHost.current.getBoundingClientRect();
      (glassInstance.current as any)?.updatePosition?.(rect.left, rect.top);
    };
    update();
    const frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [position, open, preferences.size]);

  useEffect(() => {
    if (!glassHost.current) return;
    let active = true;
    loadLiquidGlass()
      .then((create) => {
        if (!active || !glassHost.current || !create) return;
        const rect = glassHost.current.getBoundingClientRect();
        glassInstance.current = (create as any)(glassHost.current, {
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height,
          radius: rect.width / 2,
          tint: "rgba(255, 255, 255, 0.45)",
          refractionStrength: 0.85,
          glassThickness: 24,
          blurRadius: 18,
          chromaticAberration: 0.15,
        });
      })
      .catch(() => {});
    return () => {
      active = false;
      glassInstance.current?.destroy();
      glassInstance.current = null;
    };
  }, []);

  function down(event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return;
    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);
    drag.current = {
      id: event.pointerId,
      dx: event.clientX - position.x,
      dy: event.clientY - position.y,
      moved: false,
    };
  }

  function move(event: ReactPointerEvent<HTMLButtonElement>) {
    const current = drag.current;
    if (!current || current.id !== event.pointerId) return;
    const x = event.clientX - current.dx,
      y = event.clientY - current.dy;
    if (
      !current.moved &&
      (Math.abs(x - position.x) > 4 || Math.abs(y - position.y) > 4)
    )
      current.moved = true;
    if (current.moved) {
      const next = clamp({ x, y }, dynamicRadius);
      setPosition(next);
      const rect = glassHost.current?.getBoundingClientRect();
      if (rect) (glassInstance.current as any)?.updatePosition?.(rect.left, rect.top);
    }
  }

  function up(event: ReactPointerEvent<HTMLButtonElement>) {
    const current = drag.current;
    if (!current || current.id !== event.pointerId) return;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      /* ignore */
    }
    drag.current = null;
    if (current.moved)
      localStorage.setItem(
        "fieldwork-quick-menu-position",
        JSON.stringify(position),
      );
    else setOpen((value) => !value);
  }

  if (!ready) return null;

  const count = menuItems.length;
  const isMaxReached = preferences.enabled.length >= MAX_SHORTCUTS;

  return (
    <>
      <nav
        className={"radial-menu" + (open ? " open" : "")}
        style={
          {
            left: `${position.x}px`,
            top: `${position.y}px`,
            "--radial-size": `${preferences.size}px`,
            "--radial-opacity": preferences.opacity / 100,
          } as CSSProperties
        }
        aria-label="Quick actions"
      >
        {menuItems.map((item, index) => {
          const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
          const x = Math.round(Math.cos(angle) * dynamicRadius);
          const y = Math.round(Math.sin(angle) * dynamicRadius);
          return (
            <button
              key={item.id}
              type="button"
              className="radial-action"
              style={
                {
                  "--radial-x": `${x}px`,
                  "--radial-y": `${y}px`,
                  "--radial-delay": `${index * 24}ms`,
                } as CSSProperties
              }
              title={item.label}
              aria-label={item.label}
              onClick={() => {
                setOpen(false);
                if (item.id === "menu-settings") setSettingsOpen(true);
                else onAction(item.id);
              }}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </button>
          );
        })}
        <div ref={glassHost} className="liquid-glass-host" />
        <button
          type="button"
          className="radial-trigger"
          aria-expanded={open}
          aria-label={open ? "Close quick menu" : "Open quick menu"}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={() => {
            drag.current = null;
          }}
        >
          <Icon name={open ? "close" : "menu"} />
        </button>
      </nav>
      {settingsOpen && (
        <Modal
          title="Quick menu"
          className="radial-settings-modal"
          onClose={() => setSettingsOpen(false)}
        >
          <div className="dialogbody radial-settings-body">
            <p className="radial-settings-intro">
              Tune how the floating menu looks and what it contains.
            </p>

            {/* Capacity Counter */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", fontSize: "12px" }}>
              <span style={{ fontWeight: 600 }}>Active shortcuts</span>
              <span style={{ 
                fontSize: "11px", 
                fontWeight: 700, 
                fontFamily: "monospace", 
                padding: "2px 8px", 
                borderRadius: "999px",
                background: isMaxReached ? "#fef3c7" : "var(--soft)",
                color: isMaxReached ? "#b45309" : "var(--ink)",
                border: "1px solid var(--line)"
              }}>
                {preferences.enabled.length} / {MAX_SHORTCUTS} {isMaxReached ? "(Max Reached)" : ""}
              </span>
            </div>

            <label className="radial-range">
              <span>
                <strong>Button size</strong>
                <output>{preferences.size}px</output>
              </span>
              <input
                type="range"
                min="42"
                max="72"
                step="2"
                value={preferences.size}
                onChange={(event) =>
                  setPreferences((value) => ({
                    ...value,
                    size: Number(event.target.value),
                  }))
                }
              />
            </label>
            <label className="radial-range">
              <span>
                <strong>Glass opacity</strong>
                <output>{preferences.opacity}%</output>
              </span>
              <input
                type="range"
                min="35"
                max="100"
                step="5"
                value={preferences.opacity}
                onChange={(event) =>
                  setPreferences((value) => ({
                    ...value,
                    opacity: Number(event.target.value),
                  }))
                }
              />
            </label>
            <fieldset className="radial-action-options">
              <legend>Routes &amp; Navigation</legend>
              {ALL_MENU_ITEMS.filter((i) => i.category === "routes").map(
                (item) => {
                  const isChecked = preferences.enabled.includes(item.id);
                  const disabled = !isChecked && isMaxReached;
                  return (
                    <label key={item.id} style={{ opacity: disabled ? 0.5 : 1, cursor: disabled ? "not-allowed" : "pointer" }}>
                      <span>
                        <Icon name={item.icon} />
                        {item.label}
                      </span>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={disabled}
                        onChange={(event) => {
                          if (event.target.checked && isMaxReached) return;
                          setPreferences((value) => ({
                            ...value,
                            enabled: event.target.checked
                              ? [...value.enabled, item.id].slice(0, MAX_SHORTCUTS)
                              : value.enabled.filter((id) => id !== item.id),
                          }));
                        }}
                      />
                    </label>
                  );
                },
              )}
            </fieldset>
            <fieldset className="radial-action-options">
              <legend>Workspace Actions</legend>
              {ALL_MENU_ITEMS.filter((i) => i.category === "workspace").map(
                (item) => {
                  const isChecked = preferences.enabled.includes(item.id);
                  const disabled = !isChecked && isMaxReached;
                  return (
                    <label key={item.id} style={{ opacity: disabled ? 0.5 : 1, cursor: disabled ? "not-allowed" : "pointer" }}>
                      <span>
                        <Icon name={item.icon} />
                        {item.label}
                      </span>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={disabled}
                        onChange={(event) => {
                          if (event.target.checked && isMaxReached) return;
                          setPreferences((value) => ({
                            ...value,
                            enabled: event.target.checked
                              ? [...value.enabled, item.id].slice(0, MAX_SHORTCUTS)
                              : value.enabled.filter((id) => id !== item.id),
                          }));
                        }}
                      />
                    </label>
                  );
                },
              )}
            </fieldset>
          </div>
          <div className="dialogfoot">
            <button
              type="button"
              onClick={() => setPreferences(defaultPreferences)}
            >
              Reset
            </button>
            <button
              type="button"
              className="primary"
              onClick={() => setSettingsOpen(false)}
            >
              Save &amp; Apply
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
