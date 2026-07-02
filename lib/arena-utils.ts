import type { AIProvider } from "@/types/ai";

export interface StreamingMessage {
  text?: string;
  sources?: Array<{ title: string; uri: string }>;
  error?: string;
}

export async function streamDualResponse(
  messages: any[],
  providerA: AIProvider,
  providerB: AIProvider,
  clientApiKey: string,
  clientAnthropicKey: string,
  clientOpenaiKey: string,
  useThinking: boolean,
  activeModelId: string,
  onChunkA: (chunk: StreamingMessage) => void,
  onChunkB: (chunk: StreamingMessage) => void,
  onErrorA: (error: string) => void,
  onErrorB: (error: string) => void,
  onCompleteA: () => void,
  onCompleteB: () => void
) {
  const getUserApiKey = (provider: AIProvider) => {
    if (provider === "google") return clientApiKey;
    if (provider === "anthropic") return clientAnthropicKey;
    return clientOpenaiKey;
  };

  const fetchStream = async (
    provider: AIProvider,
    onChunk: (chunk: StreamingMessage) => void,
    onError: (error: string) => void,
    onComplete: () => void
  ) => {
    try {
      const userApiKey = getUserApiKey(provider);

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages,
          useThinking,
          useSearch: false,
          clientApiKey,
          provider,
          modelId: activeModelId,
          userApiKey,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Provider ${provider} error`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader available from response stream.");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("data: ")) {
            const jsonStr = trimmed.slice(6);
            try {
              const data = JSON.parse(jsonStr);
              onChunk(data);
            } catch (e) {
              console.error("[v0] Stream parse error:", e);
            }
          }
        }
      }

      onComplete();
    } catch (err: any) {
      console.error("[v0] Stream error:", err);
      onError(err.message || "Streaming failed");
    }
  };

  // Fire both streams in parallel
  Promise.all([
    fetchStream(providerA, onChunkA, onErrorA, onCompleteA),
    fetchStream(providerB, onChunkB, onErrorB, onCompleteB),
  ]);
}
