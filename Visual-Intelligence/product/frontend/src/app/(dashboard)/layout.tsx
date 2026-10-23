"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, createContext, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { UserPopover } from "@/components/UserPopover";
import { useTactileAudio } from "@/components/dashboard/useTactileAudio";
import { Pullcord } from "@/components/workspace/Pullcord";
import { RadialMenu } from "@/components/workspace/RadialMenu";
import { Volume2, VolumeX } from "lucide-react";

export const SidebarContext = createContext<{
  isInWorkspace: boolean;
  setIsInWorkspace: (val: boolean) => void;
}>({
  isInWorkspace: false,
  setIsInWorkspace: () => {},
});

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isWorkspace = 
    pathname?.startsWith("/studio") || 
    pathname?.startsWith("/settings") || 
    pathname?.startsWith("/kanban") || 
    pathname?.startsWith("/campaigns") ||
    pathname?.startsWith("/activity") ||
    pathname?.startsWith("/assets") ||
    pathname?.startsWith("/team");
  const isSettings = pathname?.startsWith("/settings");
  const { session, profile, isLoading, logout, openAuthModal } = useAuth();
  const { isMuted, toggleMute, playHoverSound } = useTactileAudio();
  const { resolvedTheme, toggleTheme } = useTheme();
  const [isInWorkspace, setIsInWorkspace] = useState(false);

  const contextValue = useMemo(() => ({ isInWorkspace, setIsInWorkspace }), [isInWorkspace]);

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] bg-[var(--paper)] flex items-center justify-center">
        <div className="text-xs tracking-[0.25em] uppercase text-[var(--muted)] animate-pulse font-mono">
          Loading VYREN...
        </div>
      </div>
    );
  }

  return (
    <SidebarContext.Provider value={contextValue}>
      <div className={`flex flex-col h-screen overflow-hidden font-sans selection:bg-black selection:text-white ${isWorkspace ? "workspace-theme bg-[var(--paper,#f8f6f0)] text-[var(--ink,#0f1419)]" : "bg-[#87a8b8]"}`}>
        
        {/* Top Header Bar: Wordmark on very left, Auth & Audio on very right */}
        <header 
          className={`fixed top-0 left-0 right-0 z-30 h-16 flex items-center justify-between gap-4 px-8 pointer-events-auto transition-colors duration-200 animate-reveal-down ${
            isWorkspace 
              ? "bg-[var(--surface,#f8f6f0)]/95 backdrop-blur-xl border-b border-[var(--line,#e3dfd4)] shadow-[0_1px_3px_rgba(0,0,0,0.04)] text-[var(--ink,#0f1419)]" 
              : "bg-gradient-to-b from-black/20 via-black/5 to-transparent"
          }`}
        >
          
          {/* Very Left: Logomark on workspace/settings, Brand Wordmark on home page */}
          {isWorkspace ? (
            <div className="flex items-center gap-3">
              <Link 
                href="/home" 
                className="flex items-center gap-2.5 hover:opacity-85 transition-opacity"
                title="VYREN Home"
              >
                <img 
                  src="/logo.png" 
                  alt="VYREN Logomark" 
                  className="h-9 w-auto object-contain rounded-md" 
                />
              </Link>
              {isSettings && (
                <div className="flex items-center gap-2 text-xs font-mono text-[var(--muted)]">
                  <span className="text-[var(--line)]">/</span>
                  <span className="text-[var(--ink)] font-semibold uppercase tracking-wider">System Governance</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col">
              <Link 
                href="/home" 
                className="font-serif text-2xl tracking-[0.24em] text-white hover:opacity-90 transition-opacity drop-shadow-[0_2px_12px_rgba(0,0,0,0.25)] font-semibold"
              >
                V Y R E N
              </Link>
              <span className="text-[9px] tracking-[0.32em] uppercase text-white/85 font-mono font-bold -mt-0.5 drop-shadow-[0_1px_4px_rgba(0,0,0,0.2)]">
                Brand Intelligence OS
              </span>
            </div>
          )}

          {/* Very Right: Workspace Actions, Audio Toggle & Auth Buttons */}
          <div className={`ml-auto flex min-w-0 items-center gap-2.5 ${isWorkspace ? "mr-12" : ""}`}>
            
            {/* Slot for Workspace Action Buttons (moved up from workspace header) */}
            <div id="top-header-workspace-actions" className="flex items-center gap-2" />

            {/* Elegant Hairline Divider on Workspace */}
            {isWorkspace && (
              <div className="h-4 w-[1px] bg-[var(--line)] mx-1" aria-hidden="true" />
            )}

            {/* Audio Toggle Button - Taste Skill tactile treatment */}
            <button
              onClick={toggleMute}
              onMouseEnter={playHoverSound}
              title={isMuted ? "Unmute Sound" : "Mute Sound"}
              aria-label={isMuted ? "Unmute Sound" : "Mute Sound"}
              className={
                isWorkspace
                  ? "w-[34px] h-[34px] rounded-full flex items-center justify-center bg-[var(--surface)] border border-[var(--line)] text-[var(--ink)] shadow-[0_1px_2px_rgba(0,0,0,0.06)] hover:border-[var(--accent)] hover:text-[var(--accent)] hover:shadow transition-all focus:outline-none hover:-translate-y-0.5 active:translate-y-0"
                  : "w-9 h-9 rounded-full flex items-center justify-center bg-white/25 hover:bg-white/40 border border-white/60 text-white backdrop-blur-xl shadow-[0_2px_8px_rgba(0,0,0,0.1)] hover:scale-105 transition-all focus:outline-none"
              }
            >
              {isMuted ? (
                <VolumeX className={isWorkspace ? "w-4 h-4 text-[var(--muted)]" : "w-4 h-4 text-white/70"} />
              ) : (
                <Volume2 className={isWorkspace ? "w-4 h-4 text-[var(--ink)]" : "w-4 h-4 text-white"} />
              )}
            </button>

            {/* User Auth Controls */}
            {session && profile ? (
              <UserPopover profile={profile} logout={logout} isCollapsed={false} isWorkspace={isWorkspace} />
            ) : isSettings ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--surface)] border border-[var(--line)] shadow-2xs">
                <div className="w-5 h-5 rounded-full bg-[var(--accent)] text-[var(--accent-ink)] flex items-center justify-center text-[10px] font-bold font-mono">
                  DJ
                </div>
                <span className="text-xs font-semibold text-[var(--ink)] font-sans">Dr. Julian Mercer</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openAuthModal("login")}
                  onMouseEnter={playHoverSound}
                  className={
                    isWorkspace
                      ? "h-[34px] px-3.5 rounded-full text-xs font-medium tracking-wide bg-[var(--surface)] text-[var(--ink)] border border-[var(--line)] hover:border-[var(--accent)] hover:bg-[var(--soft)] shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:shadow transition-all hover:-translate-y-0.5 active:translate-y-0"
                      : "py-1.5 px-4.5 rounded-full text-xs font-semibold text-white hover:text-white bg-white/20 hover:bg-white/35 border border-white/60 backdrop-blur-xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:scale-105 transition-all"
                  }
                >
                  Log In
                </button>
                <button
                  onClick={() => openAuthModal("signup")}
                  onMouseEnter={playHoverSound}
                  className={
                    isWorkspace
                      ? "h-[34px] px-4 rounded-full text-xs font-semibold tracking-wide bg-[var(--accent)] text-[var(--accent-ink)] shadow-[0_2px_6px_rgba(0,0,0,0.18)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.28)] transition-all hover:-translate-y-0.5 active:translate-y-0"
                      : "py-1.5 px-5 rounded-full text-xs font-bold bg-white text-[#0f1419] hover:bg-white/95 border border-white shadow-[0_4px_14px_rgba(0,0,0,0.15)] hover:scale-105 transition-all"
                  }
                >
                  Sign Up
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Workspace Theme Pullcord Trigger Switch */}
        {isWorkspace && !pathname?.startsWith("/team") && (
          <Pullcord
            night={resolvedTheme === "dark"}
            onToggle={toggleTheme}
          />
        )}

        {/* Main Workspace Viewport */}
        <main className="flex-1 h-full min-h-0 relative flex flex-col min-w-0 overflow-hidden">
          {children}
        </main>

        {!pathname?.startsWith("/studio") && !pathname?.startsWith("/settings") && (
          <RadialMenu
            onAction={(id) => {
              const routes: Record<string, string> = {
                home: "/home",
                studio: "/studio",
                team: "/team",
                metrics: "/activity",
                kanban: "/kanban",
                assets: "/assets",
                settings: "/settings",
              };
              if (id === "appearance") toggleTheme();
              else router.push(routes[id] ?? "/studio");
            }}
          />
        )}

      </div>
    </SidebarContext.Provider>
  );
}
