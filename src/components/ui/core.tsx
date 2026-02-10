import React from "react";
import { cn } from "../../lib/utils";

// Button (Con efecto Neón)
export const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default' | 'outline' | 'ghost' | 'danger' }>(
  ({ className, variant = 'default', ...props }, ref) => {
    const variants = {
      default: "bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:shadow-[0_0_25px_rgba(6,182,212,0.5)] transition-all active:scale-95",
      outline: "border border-slate-700 bg-transparent hover:bg-slate-800 text-slate-300",
      ghost: "hover:bg-slate-800 text-slate-400 hover:text-white",
      danger: "bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 border border-rose-500/50"
    };
    return (
      <button
        ref={ref}
        className={cn("inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm transition-all focus-visible:outline-none disabled:opacity-50 disabled:pointer-events-none", variants[variant], className)}
        {...props}
      />
    );
  }
);

// Card (Efecto Cristal)
export const Card = ({ className, children }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-xl rounded-xl p-6 relative overflow-hidden", className)}>
    {children}
  </div>
);

// Input
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn("flex h-11 w-full rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all hover:border-slate-700", className)}
        {...props}
      />
    );
  }
);