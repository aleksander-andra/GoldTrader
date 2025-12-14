import React from "react";
import type { ReactNode } from "react";

interface TradingCardProps {
  children: ReactNode;
  className?: string;
  variant?: "default" | "elevated" | "subtle";
}

/**
 * Trading-themed card component with subtle gold accents
 */
export function TradingCard({ children, className = "", variant = "default" }: TradingCardProps) {
  const baseStyles = "rounded-lg border bg-white shadow-sm";

  const variantStyles = {
    default: "border-slate-200 shadow-md",
    elevated: "border-amber-200/50 shadow-lg bg-gradient-to-br from-white to-amber-50/30",
    subtle: "border-slate-100 shadow-sm bg-slate-50/50",
  };

  return (
    <div className={`${baseStyles} ${variantStyles[variant]} ${className}`}>
      {/* Subtle top accent */}
      <div className="h-1 bg-gradient-to-r from-amber-400/30 via-yellow-400/30 to-amber-400/30 rounded-t-lg" />
      <div className="p-6">{children}</div>
    </div>
  );
}
