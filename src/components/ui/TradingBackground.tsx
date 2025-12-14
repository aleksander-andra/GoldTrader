import React from "react";
import { TrendingUp, Coins, BarChart3, DollarSign } from "lucide-react";

/**
 * Subtle trading-themed background decoration component
 * Can be used on login, register, and other pages for consistent branding
 */
export function TradingBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-50/30 via-yellow-50/20 to-transparent" />

      {/* Floating decorative elements */}
      <div className="absolute top-20 left-10 opacity-5">
        <Coins className="size-32 text-amber-600 animate-pulse" style={{ animationDuration: "4s" }} />
      </div>

      <div className="absolute top-40 right-20 opacity-5">
        <BarChart3
          className="size-24 text-yellow-600 rotate-12 animate-pulse"
          style={{ animationDuration: "5s", animationDelay: "1s" }}
        />
      </div>

      <div className="absolute bottom-32 left-1/4 opacity-5">
        <TrendingUp
          className="size-28 text-amber-500 -rotate-12 animate-pulse"
          style={{ animationDuration: "6s", animationDelay: "2s" }}
        />
      </div>

      <div className="absolute bottom-20 right-1/3 opacity-5">
        <DollarSign
          className="size-20 text-yellow-500 rotate-45 animate-pulse"
          style={{ animationDuration: "4.5s", animationDelay: "0.5s" }}
        />
      </div>

      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(to right, #d97706 1px, transparent 1px),
            linear-gradient(to bottom, #d97706 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />

      {/* Gold accent lines */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-400/20 to-transparent" />
      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-400/20 to-transparent" />
    </div>
  );
}
