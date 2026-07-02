import React from "react";
import { Copy, Check } from "lucide-react";
import { PROVIDER_CONFIG } from "@/types/ai";
import type { AIProvider } from "@/types/ai";

interface ArenaPanesProps {
  providerA: AIProvider;
  providerB: AIProvider;
  responseA: string;
  responseB: string;
  streamingA: boolean;
  streamingB: boolean;
  sourcesA?: Array<{ title: string; uri: string }>;
  sourcesB?: Array<{ title: string; uri: string }>;
}

export function ArenaPanes({
  providerA,
  providerB,
  responseA,
  responseB,
  streamingA,
  streamingB,
  sourcesA = [],
  sourcesB = [],
}: ArenaPanesProps) {
  const [copiedA, setCopiedA] = React.useState(false);
  const [copiedB, setCopiedB] = React.useState(false);

  const copyToClipboard = (text: string, side: "A" | "B") => {
    navigator.clipboard.writeText(text);
    if (side === "A") {
      setCopiedA(true);
      setTimeout(() => setCopiedA(false), 2000);
    } else {
      setCopiedB(true);
      setTimeout(() => setCopiedB(false), 2000);
    }
  };

  const configA = PROVIDER_CONFIG[providerA];
  const configB = PROVIDER_CONFIG[providerB];

  const getColorClasses = (provider: AIProvider) => {
    if (provider === "google") {
      return {
        border: "border-indigo-500/20",
        dot: "bg-indigo-500",
        text: "text-indigo-400",
        dotSmall: "bg-indigo-400",
        bounce: "bg-indigo-400",
      };
    } else if (provider === "anthropic") {
      return {
        border: "border-amber-500/20",
        dot: "bg-amber-500",
        text: "text-amber-400",
        dotSmall: "bg-amber-400",
        bounce: "bg-amber-400",
      };
    } else {
      return {
        border: "border-emerald-500/20",
        dot: "bg-emerald-500",
        text: "text-emerald-400",
        dotSmall: "bg-emerald-400",
        bounce: "bg-emerald-400",
      };
    }
  };

  const Pane = ({
    provider,
    config,
    response,
    streaming,
    sources,
    side,
    copied,
    onCopy,
  }: {
    provider: AIProvider;
    config: (typeof PROVIDER_CONFIG)[AIProvider];
    response: string;
    streaming: boolean;
    sources: Array<{ title: string; uri: string }>;
    side: "A" | "B";
    copied: boolean;
    onCopy: () => void;
  }) => {
    const colors = getColorClasses(provider);

    return (
      <div className={`flex-1 border ${colors.border} rounded-lg overflow-hidden bg-white/[0.01] flex flex-col`}>
        {/* Header */}
        <div className="px-4 py-3 border-b border-white/[0.03] bg-white/[0.02]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${colors.dot}`} />
              <span className={`text-sm font-semibold ${colors.text}`}>{config.name}</span>
              {streaming && (
                <div className="flex items-center gap-1 ml-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${colors.dotSmall} animate-pulse`} />
                  <span className="text-[9px] text-zinc-600">Streaming...</span>
                </div>
              )}
            </div>
            {response && !streaming && (
              <button
                onClick={onCopy}
                className="p-1.5 hover:bg-white/[0.05] rounded transition-colors"
                title="Copy response"
              >
                {copied ? (
                  <Check size={14} className="text-green-500" />
                ) : (
                  <Copy size={14} className="text-zinc-600 hover:text-zinc-400" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {!response && !streaming && (
            <div className="text-center text-zinc-600 text-sm py-8">
              {side === "A" ? "Left" : "Right"} pane awaiting response...
            </div>
          )}

          {response && (
            <div className="prose prose-invert prose-sm max-w-none">
              <div className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap break-words">
                {response}
              </div>
            </div>
          )}

          {streaming && !response && (
            <div className="flex items-center justify-center h-24">
              <div className="flex gap-1">
                <div className={`w-2 h-2 rounded-full ${colors.bounce} animate-bounce`} style={{ animationDelay: "0ms" }} />
                <div className={`w-2 h-2 rounded-full ${colors.bounce} animate-bounce`} style={{ animationDelay: "150ms" }} />
                <div className={`w-2 h-2 rounded-full ${colors.bounce} animate-bounce`} style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}
        </div>

        {/* Sources */}
        {sources.length > 0 && (
          <div className="border-t border-white/[0.03] p-3 bg-white/[0.01]">
            <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-2">Sources</div>
            <div className="space-y-1">
              {sources.map((source, i) => (
                <a
                  key={i}
                  href={source.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors block truncate"
                  title={source.title}
                >
                  {source.title || "Source"}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-2 gap-4 p-4 bg-white/[0.005]">
      <Pane
        provider={providerA}
        config={configA}
        response={responseA}
        streaming={streamingA}
        sources={sourcesA}
        side="A"
        copied={copiedA}
        onCopy={() => copyToClipboard(responseA, "A")}
      />
      <Pane
        provider={providerB}
        config={configB}
        response={responseB}
        streaming={streamingB}
        sources={sourcesB}
        side="B"
        copied={copiedB}
        onCopy={() => copyToClipboard(responseB, "B")}
      />
    </div>
  );
}
