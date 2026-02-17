import React from "react";
import { cn } from "../../lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'danger' | 'secondary' | 'neon';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    const variants = {
      default: "bg-primary text-slate-950 font-bold hover:bg-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:shadow-[0_0_25px_rgba(6,182,212,0.5)]",
      neon: "btn-neon", // El estilo especial de la rama diseño
      outline: "border border-slate-700 bg-transparent hover:bg-surface/80 text-slate-300",
      ghost: "hover:bg-surface/50 text-slate-400 hover:text-white",
      danger: "bg-danger/10 text-danger hover:bg-danger/20 border border-danger/50 shadow-[0_0_10px_rgba(244,63,94,0.2)]",
      secondary: "bg-surface text-slate-300 hover:bg-slate-800 border border-slate-700"
    };
    const sizes = {
      default: "h-10 px-4 py-2",
      sm: "h-8 px-3 text-xs",
      lg: "h-12 px-8 text-lg",
      icon: "h-10 w-10 p-0 flex items-center justify-center"
    };
    return (
      <button
        ref={ref}
        className={cn("inline-flex items-center justify-center rounded-lg text-sm font-medium transition-all focus-visible:outline-none disabled:opacity-50 disabled:pointer-events-none active:scale-95", variants[variant], sizes[size], className)}
        {...props}
      />
    );
  }
);

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div 
      ref={ref}
      className={cn("glass rounded-xl p-6 relative overflow-hidden border border-white/5", className)} 
      {...props}
    >
      {children}
    </div>
  )
);

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn("flex h-10 w-full rounded-lg border border-slate-700 bg-background/50 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all hover:border-slate-600 shadow-inner", className)}
        {...props}
      />
    );
  }
);