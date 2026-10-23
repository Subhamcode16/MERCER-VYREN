"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Sparkles, User, Settings, HelpCircle, LogOut, ChevronUp, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";

interface UserProfile {
  email?: string;
  tier: string;
  credit_balance: number;
  max_credits: number;
  role: string;
}

interface UserPopoverProps {
  profile: UserProfile;
  logout: () => void;
  isCollapsed?: boolean;
  isWorkspace?: boolean;
}

function AnimatedNumber({ value }: { value: number }) {
  return (
    <span className="relative inline-flex items-center justify-center overflow-hidden h-[18px] min-w-[14px]">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0, position: "absolute" }}
          transition={{ duration: 0.4, type: "spring", bounce: 0.3 }}
          className="inline-block"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export function UserPopover({ profile, logout, isCollapsed, isWorkspace = false }: UserPopoverProps) {
  const { session } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Extract short username from metadata full name or email
  const userFullName = session?.user?.user_metadata?.full_name || (profile.email ? profile.email.split('@')[0] : "Director");
  
  // Create initials for the avatar
  const initials = userFullName.substring(0, 2).toUpperCase();

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Calculate dots (total 24 dots for UI)
  const TOTAL_DOTS = 24;
  const maxCredits = profile.max_credits || 100;
  // Ensure we don't divide by zero
  const safeMaxCredits = Math.max(maxCredits, 1);
  const filledRatio = Math.min(Math.max(profile.credit_balance / safeMaxCredits, 0), 1);
  const filledDots = Math.round(filledRatio * TOTAL_DOTS);

  return (
    <div className="relative w-44 shrink-0" ref={popoverRef}>
      {/* Popover Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -8, scale: 0.95, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -6, scale: 0.96, filter: "blur(4px)" }}
            transition={{ duration: 0.3, type: "spring", bounce: 0.2 }}
            className="absolute top-full right-0 mt-2 w-72 max-w-[calc(100vw-2rem)] bg-[#111111] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 origin-top-right"
          >
            <div className="p-3 border-b border-white/5 flex items-center gap-3 bg-black/20">
              <div className="relative">
                <div className="absolute -inset-0.5 rounded-full bg-gradient-to-tr from-[#E1D4C0]/50 to-transparent blur-[2px]" />
                <div className="relative w-9 h-9 rounded-full bg-[#1A1A1A] border border-white/20 flex items-center justify-center text-[#E1D4C0] text-[11px] font-bold tracking-wider shrink-0 shadow-inner">
                  {initials}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] text-white font-medium truncate tracking-wide">{userFullName}</div>
                <div className="text-[10px] tracking-wide text-white/40 mt-0.5 uppercase">{profile.tier === 'FREE' ? 'Free Plan' : profile.tier}</div>
              </div>
            </div>

            {/* Credit Counter Section */}
            <div className="px-4 pt-4 pb-3 border-b border-white/5 bg-gradient-to-b from-[#0A0A0A] to-transparent">
              <div className="flex justify-between items-center mb-3">
                <span className="text-[12px] font-semibold text-white tracking-wide">Credits</span>
                <Link href="/settings?tab=usage" onClick={() => setIsOpen(false)} className="text-[11px] text-white/50 hover:text-white transition-colors flex items-center gap-1 font-medium group/link">
                  <span className="flex items-center"><AnimatedNumber value={profile.credit_balance} />&nbsp;left</span>
                  <ChevronRight size={12} className="group-hover/link:translate-x-0.5 transition-transform" />
                </Link>
              </div>
              
              <div className="flex gap-[3px] mb-2">
                {Array.from({ length: TOTAL_DOTS }).map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.5, y: 5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: i * 0.015, duration: 0.4, type: "spring", bounce: 0.4 }}
                    className={`h-[4px] flex-1 rounded-full ${
                      i < filledDots ? 'bg-[#E1D4C0] shadow-[0_0_8px_rgba(225,212,192,0.6)]' : 'bg-white/10'
                    }`}
                  />
                ))}
              </div>
            </div>
            
            <div className="p-1.5 flex flex-col gap-0.5 mt-1">
              <Link 
                href="/pricing"
                className="flex items-center gap-3 px-3 py-2.5 rounded-md text-[13px] tracking-wide text-white/80 hover:bg-[#E1D4C0]/10 hover:text-[#E1D4C0] font-medium transition-colors group"
                onClick={() => setIsOpen(false)}
              >
                <Sparkles size={15} className="text-[#E1D4C0]/70 group-hover:text-[#E1D4C0] transition-colors" />
                <span>Upgrade plan</span>
              </Link>
              
              <Link 
                href="/settings?tab=profile"
                className="flex items-center gap-3 px-3 py-2.5 rounded-md text-[13px] tracking-wide text-white/70 hover:bg-white/5 hover:text-white font-medium transition-colors group"
                onClick={() => setIsOpen(false)}
              >
                <User size={15} className="text-white/40 group-hover:text-white transition-colors" />
                <span>Profile</span>
              </Link>

              <Link 
                href="/settings"
                className="flex items-center gap-3 px-3 py-2.5 rounded-md text-[13px] tracking-wide text-white/70 hover:bg-white/5 hover:text-white font-medium transition-colors group"
                onClick={() => setIsOpen(false)}
              >
                <Settings size={15} className="text-white/40 group-hover:text-white transition-all duration-300 group-hover:rotate-90" />
                <span>Settings</span>
              </Link>
            </div>

            <div className="p-1.5 border-t border-white/5 flex flex-col gap-0.5">
              <Link
                href="/faq"
                className="flex items-center gap-3 px-3 py-2.5 rounded-md text-[13px] tracking-wide text-white/70 hover:bg-white/5 hover:text-white font-medium transition-colors w-full text-left group"
                onClick={() => setIsOpen(false)}
              >
                <HelpCircle size={15} className="text-white/40 group-hover:text-white transition-colors" />
                <span>Help</span>
              </Link>
              <button 
                onClick={() => {
                  setIsOpen(false);
                  logout();
                }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-md text-[13px] tracking-wide text-white/70 hover:bg-white/5 hover:text-red-400 font-medium transition-colors w-full text-left group"
              >
                <LogOut size={15} className="text-white/40 group-hover:text-red-400 transition-all duration-300 group-hover:-translate-x-1" />
                <span>Log out</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trigger Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="Account menu"
        className={`flex h-10 w-full items-center rounded-xl px-2 transition-all group ${
          isWorkspace ? "text-[var(--ink)] hover:bg-[var(--soft)]" : "text-white hover:bg-white/10"
        } ${
          isCollapsed ? "justify-center" : "gap-2"
        }`}
      >
        <div className="w-8 h-8 rounded-full bg-[#1A1A1A] border border-white/10 flex items-center justify-center text-[#E1D4C0] text-[10px] tracking-wider shrink-0 transition-transform group-hover:scale-105 shadow-inner">
          {initials}
        </div>
        {!isCollapsed && (
          <>
            <div className="flex-1 text-left min-w-0 animate-in fade-in duration-300">
              <div className={`text-[12px] font-medium truncate tracking-wide ${isWorkspace ? "text-[var(--ink)]" : "text-white"}`}>{userFullName}</div>
              <div className={`text-[10px] tracking-wide uppercase truncate mt-0.5 flex gap-1 items-center ${isWorkspace ? "text-[var(--muted)]" : "text-white/60"}`}>
                {profile.tier === 'FREE' ? 'Free Plan' : profile.tier}
              </div>
            </div>
            <ChevronUp 
              size={14} 
              className={`transition-transform duration-400 ${isWorkspace ? "text-[var(--muted)]" : "text-white/60"} ${isOpen ? 'rotate-180' : ''}`}
            />
          </>
        )}
      </button>
    </div>
  );
}
