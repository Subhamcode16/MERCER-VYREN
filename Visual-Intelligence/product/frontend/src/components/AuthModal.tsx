"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { apiFetch } from "@/lib/api";
import { AuthSlider } from "@/components/AuthSlider";
import { Eye, EyeOff, X, ArrowRight } from "lucide-react";
import { useTactileAudio } from "@/components/dashboard/useTactileAudio";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialView?: "login" | "signup";
  onSuccess: () => void;
}

export function AuthModal({ isOpen, onClose, initialView = "login", onSuccess }: AuthModalProps) {
  const teamMode = usePathname()?.startsWith("/team") ?? false;
  const { playHoverSound, playFocusSound, playSubmitSound, playKeypressSound } = useTactileAudio();
  const [view, setView] = useState<"login" | "signup">(initialView);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [receiveMarketing, setReceiveMarketing] = useState(false);

  const handleSwitchView = (newView: "login" | "signup") => {
    playHoverSound();
    setView(newView);
    setError(null);
    setSuccessMessage(null);
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (view === "signup") {
        if (password !== confirmPassword) {
          setError("Passwords do not match");
          setLoading(false);
          return;
        }

        const { data, error: authError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (authError) throw authError;

        if (data.session) {
          await apiFetch("/auth/provision", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${data.session.access_token}`
            },
            body: JSON.stringify({ receive_marketing: receiveMarketing })
          });
          playSubmitSound();
          onSuccess();
        } else {
          localStorage.setItem("atelier_pending_marketing", receiveMarketing ? "true" : "false");
          setSuccessMessage("Confirmation email sent! Please check your email to verify your account, then log in.");
          setView("login");
          setPassword("");
          setConfirmPassword("");
        }
      } else {
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (authError) throw authError;

        await apiFetch("/auth/provision", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${data.session.access_token}`
          },
          body: JSON.stringify({ receive_marketing: receiveMarketing })
        });
        playSubmitSound();
        onSuccess();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : `An error occurred during ${view}`;
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      {/* Soft atmospheric backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-md transition-opacity animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Modal Container — Frosted Warm-Ivory Luxury OS Aesthetic */}
      <div className={`w-full h-[660px] flex overflow-hidden relative z-10 animate-in fade-in zoom-in-95 duration-200 ${teamMode
        ? "max-w-lg rounded-xl border border-[#c9d2c9] bg-[#f6f8f3] shadow-[0_25px_75px_rgba(20,43,29,0.23)]"
        : "max-w-5xl bg-[#faf8f5]/95 backdrop-blur-3xl border border-white/90 rounded-[28px] shadow-[0_30px_80px_rgba(0,0,0,0.22),inset_0_1.5px_2px_rgba(255,255,255,1)]"}`}>
        
        {/* Left side: Image Showcase Slider */}
        {!teamMode && <AuthSlider />}

        {/* Right side: Editorial Form */}
        <div className={`w-full flex flex-col items-center justify-center p-8 sm:p-12 overflow-y-auto relative ${teamMode ? "" : "lg:w-1/2"}`}>
          
          {/* Close Button */}
          <button 
            onClick={onClose}
            aria-label="Close authentication modal"
            className="absolute top-6 right-6 w-9 h-9 flex items-center justify-center rounded-full bg-black/[0.04] hover:bg-black/[0.08] border border-black/[0.06] text-[#0f1419]/60 hover:text-[#0f1419] transition-all duration-200 hover:scale-105"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="w-full max-w-sm">
            
            {/* Dual-Register Masthead */}
            <div className="mb-8 text-left">
              <h2 className="text-3xl font-sans font-extrabold text-[#0f1419] tracking-[-0.03em] leading-tight">
                {teamMode ? (view === "login" ? "Welcome back." : "Start your workspace.") : (view === "login" ? "Welcome Back," : "Create Account,")}
                <span className={`block text-xl sm:text-2xl text-[#0f1419]/75 mt-0.5 ${teamMode ? "font-sans not-italic font-medium" : "font-serif italic font-semibold"}`}>
                  {teamMode
                    ? (view === "login" ? "Your Content Producer is here." : "Meet your first creative colleague.")
                    : (view === "login" ? "to the creative intelligence studio." : "join the brand operating system.")}
                </span>
              </h2>
            </div>

            {successMessage && (
              <div className="mb-5 p-3.5 border border-emerald-500/20 bg-emerald-500/10 text-emerald-800 text-xs font-medium rounded-xl">
                {successMessage}
              </div>
            )}

            {error && (
              <div className="mb-5 p-3.5 border border-red-500/20 bg-red-500/10 text-red-700 text-xs font-medium rounded-xl">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10.5px] uppercase tracking-[0.16em] font-bold text-[#0f1419]/70 mb-1.5 font-sans">
                  Work Email
                </label>
                <input 
                  type="email" 
                  name="email"
                  autoComplete="username"
                  required
                  value={email}
                  onFocus={playFocusSound}
                  onChange={(e) => {
                    playKeypressSound();
                    setEmail(e.target.value);
                  }}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/80 border border-black/[0.08] text-[#0f1419] placeholder:text-[#0f1419]/35 focus:outline-none focus:border-[#0f1419]/40 focus:bg-white focus:ring-1 focus:ring-black/10 transition-all duration-200 text-sm font-medium shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)]"
                  placeholder="designer@vyren.ai"
                />
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-1.5">
                   <label className="block text-[10.5px] uppercase tracking-[0.16em] font-bold text-[#0f1419]/70 font-sans">
                     Password
                   </label>
                   {view === "login" && (
                     <a href="#" className="text-[11px] text-[#0f1419]/60 hover:text-[#0f1419] font-medium transition-colors">
                       Recover Password?
                     </a>
                   )}
                </div>
                <div className="relative w-full">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    name="password"
                    autoComplete={view === "login" ? "current-password" : "new-password"}
                    required
                    value={password}
                    onFocus={playFocusSound}
                    onChange={(e) => {
                      playKeypressSound();
                      setPassword(e.target.value);
                    }}
                    className="w-full px-4 py-2.5 pr-11 rounded-xl bg-white/80 border border-black/[0.08] text-[#0f1419] placeholder:text-[#0f1419]/35 focus:outline-none focus:border-[#0f1419]/40 focus:bg-white focus:ring-1 focus:ring-black/10 transition-all duration-200 text-sm font-medium shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)]"
                    placeholder="••••••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#0f1419]/45 hover:text-[#0f1419] transition-colors p-1"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {view === "signup" && (
                <div>
                  <label className="block text-[10.5px] uppercase tracking-[0.16em] font-bold text-[#0f1419]/70 mb-1.5 font-sans">
                    Confirm Password
                  </label>
                  <div className="relative w-full">
                    <input 
                      type={showPassword ? "text" : "password"} 
                      name="confirmPassword"
                      autoComplete="new-password"
                      required
                      value={confirmPassword}
                      onFocus={playFocusSound}
                      onChange={(e) => {
                        playKeypressSound();
                        setConfirmPassword(e.target.value);
                      }}
                      className="w-full px-4 py-2.5 pr-11 rounded-xl bg-white/80 border border-black/[0.08] text-[#0f1419] placeholder:text-[#0f1419]/35 focus:outline-none focus:border-[#0f1419]/40 focus:bg-white focus:ring-1 focus:ring-black/10 transition-all duration-200 text-sm font-medium shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)]"
                      placeholder="••••••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#0f1419]/45 hover:text-[#0f1419] transition-colors p-1"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              )}

              {view === "signup" && (
                <div className="pt-2 space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <input 
                      type="checkbox" 
                      id="acceptTerms"
                      checked={acceptTerms}
                      onChange={(e) => setAcceptTerms(e.target.checked)}
                      className="w-4 h-4 mt-0.5 bg-white border-black/20 rounded accent-[#0f1419] focus:ring-1 focus:ring-black/20 cursor-pointer"
                    />
                    <label htmlFor="acceptTerms" className="text-[12px] text-[#0f1419]/70 cursor-pointer hover:text-[#0f1419] transition-colors leading-snug">
                      I accept the <a href="#" className="underline font-semibold hover:text-black">Terms of Service</a> & <a href="#" className="underline font-semibold hover:text-black">Privacy Policy</a>
                    </label>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <input 
                      type="checkbox" 
                      id="receiveMarketing"
                      checked={receiveMarketing}
                      onChange={(e) => setReceiveMarketing(e.target.checked)}
                      className="w-4 h-4 mt-0.5 bg-white border-black/20 rounded accent-[#0f1419] focus:ring-1 focus:ring-black/20 cursor-pointer"
                    />
                    <label htmlFor="receiveMarketing" className="text-[12px] text-[#0f1419]/70 cursor-pointer hover:text-[#0f1419] transition-colors leading-snug">
                      Send me creative updates & visual system releases (Optional)
                    </label>
                  </div>
                </div>
              )}

              {view === "login" && (
                <div className="flex items-center gap-2 pt-1">
                  <input 
                    type="checkbox" 
                    id="rememberMe"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 bg-white border-black/20 rounded accent-[#0f1419] focus:ring-1 focus:ring-black/20 cursor-pointer"
                  />
                  <label htmlFor="rememberMe" className="text-[12.5px] text-[#0f1419]/70 cursor-pointer hover:text-[#0f1419] transition-colors font-medium">
                    Remember my workspace session
                  </label>
                </div>
              )}

              <button 
                type="submit" 
                disabled={loading || (view === "signup" && !acceptTerms)}
                onMouseEnter={playHoverSound}
                className="w-full py-3.5 mt-6 bg-[#0f1419] hover:bg-black rounded-full text-white font-bold text-xs tracking-widest uppercase transition-all duration-200 shadow-[0_4px_16px_rgba(0,0,0,0.15)] hover:scale-[1.01] hover:shadow-[0_6px_20px_rgba(0,0,0,0.2)] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? "Authenticating..." : (view === "login" ? "Enter Studio" : "Create Account")}
                {!loading && <ArrowRight className="w-3.5 h-3.5" />}
              </button>
            </form>

            <div className="mt-7 flex items-center gap-4">
              <div className="h-px bg-black/[0.08] flex-1"></div>
              <span className="text-[9.5px] uppercase tracking-[0.2em] font-bold text-[#0f1419]/40">OR</span>
              <div className="h-px bg-black/[0.08] flex-1"></div>
            </div>

            <p className="mt-6 text-xs text-[#0f1419]/60 text-center font-medium">
              {view === "login" ? (
                <>New to VYREN? <button onClick={() => handleSwitchView("signup")} className="text-[#0f1419] font-bold hover:underline ml-1">Create an account</button></>
              ) : (
                <>Already have an account? <button onClick={() => handleSwitchView("login")} className="text-[#0f1419] font-bold hover:underline ml-1">Log in</button></>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
