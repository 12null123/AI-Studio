import React from "react";
import { ChevronDown, X } from "lucide-react";
import { PROVIDER_CONFIG } from "@/types/ai";
import type { AIProvider } from "@/types/ai";

interface ArenaHeaderProps {
  isOpen: boolean;
  onToggle: (open: boolean) => void;
  providerA: AIProvider;
  providerB: AIProvider;
  onProviderAChange: (provider: AIProvider) => void;
  onProviderBChange: (provider: AIProvider) => void;
  streamingA: boolean;
  streamingB: boolean;
}

export function ArenaHeader({
  isOpen,
  onToggle,
  providerA,
  providerB,
  onProviderAChange,
  onProviderBChange,
  streamingA,
  streamingB,
}: ArenaHeaderProps) {
  if (!isOpen) {
    return (
      <div className="px-4 py-3 border-b border-white/[0.03] bg-white/[0.01]">
        <button
          onClick={() => onToggle(true)}
          className="text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          Enable Arena Mode (Compare Models)
        </button>
      </div>
    );
  }

  const getProviderColor = (provider: AIProvider) => {
    if (provider === "google") return "indigo";
    if (provider === "anthropic") return "amber";
    return "emerald";
  };

  const getProviderBgColor = (provider: AIProvider) => {
    if (provider === "google") return "bg-indigo-500/5 border-indigo-500/20";
    if (provider === "anthropic") return "bg-amber-500/5 border-amber-500/20";
    return "bg-emerald-500/5 border-emerald-500/20";
  };

  const getProviderTextColor = (provider: AIProvider) => {
    if (provider === "google") return "text-indigo-300";
    if (provider === "anthropic") return "text-amber-300";
    return "text-emerald-300";
  };

  const providers = Object.entries(PROVIDER_CONFIG).map(([key, config]) => ({
    id: key as AIProvider,
    name: config.name,
  }));

  return (
    <div className="px-4 py-3 border-b border-white/[0.03] bg-white/[0.01] space-y-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Arena Mode</h3>
        <button
          onClick={() => onToggle(false)}
          className="text-zinc-600 hover:text-zinc-400 transition-colors"
          title="Close Arena Mode"
        >
          <X size={14} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Provider A */}
        <div className="relative">
          <div className={`px-3 py-2 rounded-lg border ${getProviderBgColor(providerA)}`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Left</span>
              {streamingA && (
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                  <span className="text-[9px] text-zinc-600">Streaming</span>
                </div>
              )}
            </div>
            <select
              value={providerA}
              onChange={(e) => onProviderAChange(e.target.value as AIProvider)}
              disabled={streamingA}
              className={`w-full text-xs font-semibold rounded px-2 py-1 bg-white/[0.05] border border-white/[0.1] ${getProviderTextColor(providerA)} outline-none disabled:opacity-50 cursor-pointer`}
            >
              {providers
                .filter((p) => p.id !== providerB)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* Provider B */}
        <div className="relative">
          <div className={`px-3 py-2 rounded-lg border ${getProviderBgColor(providerB)}`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Right</span>
              {streamingB && (
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[9px] text-zinc-600">Streaming</span>
                </div>
              )}
            </div>
            <select
              value={providerB}
              onChange={(e) => onProviderBChange(e.target.value as AIProvider)}
              disabled={streamingB}
              className={`w-full text-xs font-semibold rounded px-2 py-1 bg-white/[0.05] border border-white/[0.1] ${getProviderTextColor(providerB)} outline-none disabled:opacity-50 cursor-pointer`}
            >
              {providers
                .filter((p) => p.id !== providerA)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
