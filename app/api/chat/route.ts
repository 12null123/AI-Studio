import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { normalizePayload } from "@/lib/payload-normalizer";
import { AIProvider } from "@/types/ai";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      messages, 
      useThinking, 
      useSearch, 
      clientApiKey,
      provider: bodyProvider,
      modelId: bodyModelId,
      userApiKey: bodyUserApiKey
    } = body;

    // Extract provider, modelId, and userApiKey from headers or body
    const provider = (req.headers.get("x-ai-provider") || bodyProvider || "google") as AIProvider;
    
    // Default to clientApiKey or custom keys passed
    const userApiKey = req.headers.get("x-user-api-key") || bodyUserApiKey;

    // 1. Google Gemini Handling (native SDK with server-side / user keys)
    if (provider === "google") {
      const apiKey = userApiKey || process.env.GEMINI_API_KEY || clientApiKey;
      if (!apiKey) {
        return NextResponse.json(
          { 
            error: "Google Gemini API Key is missing. Please provide your API Key in Settings.",
            isKeyMissing: true 
          },
          { status: 400 }
        );
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      // Format messages for @google/genai
      const contents = messages.map((m: any) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

      // Determine model and configuration
      let model = bodyModelId || "gemini-3.5-flash";
      const config: any = {
        systemInstruction: "You are Gemini, a helpful, precise, and advanced AI assistant. Format your responses with clean Markdown. When writing code blocks, always specify the programming language (e.g., ```typescript) so that syntax highlighting works properly.",
      };

      if (useThinking) {
        model = "gemini-3.1-pro-preview";
        config.thinkingConfig = {
          thinkingLevel: ThinkingLevel.HIGH,
        };
      } else if (useSearch && model === "gemini-3.5-flash") {
        config.tools = [{ googleSearch: {} }];
      }

      const responseStream = await ai.models.generateContentStream({
        model,
        contents,
        config,
      });

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            let groundingChunks: any[] = [];
            for await (const chunk of responseStream) {
              const text = chunk.text || "";

              // Check for grounding metadata
              const candidates = chunk.candidates;
              if (candidates?.[0]?.groundingMetadata?.groundingChunks) {
                const chunks = candidates[0].groundingMetadata.groundingChunks;
                const mapped = chunks
                  .map((c: any) => ({
                    title: c.web?.title || c.title || "",
                    uri: c.web?.uri || c.uri || "",
                  }))
                  .filter((c: any) => c.uri);
                
                // Append unique sources
                for (const item of mapped) {
                  if (!groundingChunks.some((g) => g.uri === item.uri)) {
                    groundingChunks.push(item);
                  }
                }
              }

              if (text) {
                const data = JSON.stringify({ text });
                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              }
            }

            if (groundingChunks.length > 0) {
              const data = JSON.stringify({ sources: groundingChunks });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }

            controller.close();
          } catch (err: any) {
            console.error("Gemini stream error:", err);
            let errorMessage = err.message || "Streaming error";
            if (err.status === 429 || errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
              errorMessage = "The AI is currently busy or out of free tokens. Please wait about 30 seconds and try again!";
            }
            const data = JSON.stringify({ error: errorMessage });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          "Connection": "keep-alive",
        },
      });
    }

    // 2. OpenRouter BYOK with Strict Model Whitelist
    if (provider === "openrouter") {
      // Strict whitelist of allowed free programming models (verified against production API)
      const OPENROUTER_WHITELIST = [
        "openrouter/free",
        "nvidia/nemotron-3-ultra:free",
        "poolside/laguna-m1:free",
        "deepseek/deepseek-r1:free",
        "nvidia/nemotron-3-super:free",
        "cohere/north-mini-code:free"
      ];

      const modelId = bodyModelId || "openrouter/free";

      // Enforce Model Restrictions
      if (!OPENROUTER_WHITELIST.includes(modelId)) {
        return NextResponse.json(
          { error: `Unauthorized model "${modelId}". You can only use the 6 allowed free OpenRouter models.` },
          { status: 403 }
        );
      }

      if (!userApiKey) {
        return NextResponse.json(
          { 
            error: "OpenRouter API Key is missing. Please provide your OpenRouter BYOK key in Settings.",
            isKeyMissing: true 
          },
          { status: 400 }
        );
      }

      // Format messages for OpenRouter
      const openRouterMsgs = messages.map((m: any) => ({
        role: m.role || "user",
        content: m.content || ""
      }));

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${userApiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": req.headers.get("host") || "http://localhost:3000",
          "X-Title": "Osy Studio - AI Chat"
        },
        body: JSON.stringify({
          model: modelId,
          messages: openRouterMsgs,
          stream: true
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        let parsedError = errorText;
        try {
          const parsed = JSON.parse(errorText);
          parsedError = parsed.error?.message || (typeof parsed.error === 'object' ? JSON.stringify(parsed.error) : parsed.error) || errorText;
        } catch {}

        if (response.status === 429) {
          return NextResponse.json(
            { error: "OpenRouter Quota Exceeded. Your API key has insufficient credits or hit rate limits." },
            { status: 429 }
          );
        }

        return NextResponse.json(
          { error: `OpenRouter API Error: ${parsedError}` },
          { status: response.status }
        );
      }

      if (!response.body) {
        return NextResponse.json(
          { error: "No response body returned from OpenRouter." },
          { status: 500 }
        );
      }

      const encoder = new TextEncoder();
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      const stream = new ReadableStream({
        async start(controller) {
          let buffer = "";
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";

              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;

                if (trimmed.startsWith("data: ")) {
                  const dataStr = trimmed.slice(6).trim();
                  if (dataStr === "[DONE]") continue;

                  try {
                    const parsed = JSON.parse(dataStr);
                    const text = parsed.choices?.[0]?.delta?.content || "";

                    if (text) {
                      const outData = JSON.stringify({ text });
                      controller.enqueue(encoder.encode(`data: ${outData}\n\n`));
                    }
                  } catch (e) {
                    // Ignore parse errors of incomplete chunks
                  }
                }
              }
            }
            controller.close();
          } catch (err: any) {
            console.error("OpenRouter stream error:", err);
            const outData = JSON.stringify({ error: err.message || "Streaming error" });
            controller.enqueue(encoder.encode(`data: ${outData}\n\n`));
            controller.close();
          }
        }
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          "Connection": "keep-alive",
        },
      });
    }

    // 3. OpenAI & Anthropic BYOK Stateless Proxy Streaming
    if (!userApiKey) {
      return NextResponse.json(
        { 
          error: `${provider.toUpperCase()} API Key is missing. Please provide your API Key in Settings.`,
          isKeyMissing: true 
        },
        { status: 400 }
      );
    }

    // Format chat payload
    const unifiedMsgs = messages.map((m: any, i: number) => ({
      id: m.id || String(i),
      role: m.role || "user",
      content: m.content || "",
      timestamp: m.timestamp || Date.now()
    }));

    const modelId = bodyModelId || (provider === "anthropic" ? "claude-sonnet-5" : "gpt-5.5");
    const payload = normalizePayload(provider, modelId, unifiedMsgs, { searchGrounding: useSearch });

    let targetUrl = "";
    const headers: Record<string, string> = { "Content-Type": "application/json" };

    if (provider === "anthropic") {
      targetUrl = "https://api.anthropic.com/v1/messages";
      headers["x-api-key"] = userApiKey;
      headers["anthropic-version"] = "2023-06-01";
      (payload as any).stream = true;
    } else if (provider === "openai") {
      targetUrl = "https://api.openai.com/v1/chat/completions";
      headers["Authorization"] = `Bearer ${userApiKey}`;
      (payload as any).stream = true;
    }

    const response = await fetch(targetUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      let parsedError = errorText;
      try {
        const parsed = JSON.parse(errorText);
        // Sometimes the error is nested deeply, stringify it if it's still an object
        parsedError = parsed.error?.message || (typeof parsed.error === 'object' ? JSON.stringify(parsed.error) : parsed.error) || errorText;
      } catch {}
      
      if (response.status === 429) {
        return NextResponse.json(
          { error: `${provider.toUpperCase()} Quota Exceeded. Your custom BYOK key has insufficient funds, hit rate limits, or lacks tier permissions for this model.` },
          { status: 429 }
        );
      }
      
      if (response.status === 404) {
        return NextResponse.json(
          { error: `${provider.toUpperCase()} Model Not Found. The selected model string may be restricted for your API key tier.` },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { error: `${provider.toUpperCase()} API Error: ${parsedError}` },
        { status: response.status }
      );
    }

    if (!response.body) {
      return NextResponse.json(
        { error: "No response body returned from upstream AI provider." },
        { status: 500 }
      );
    }

    const encoder = new TextEncoder();
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        let buffer = "";
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed) continue;

              if (trimmed.startsWith("data: ")) {
                const dataStr = trimmed.slice(6).trim();
                if (dataStr === "[DONE]") continue;

                try {
                  const parsed = JSON.parse(dataStr);
                  let text = "";

                  if (provider === "openai") {
                    text = parsed.choices?.[0]?.delta?.content || "";
                  } else if (provider === "anthropic") {
                    if (parsed.type === "content_block_delta" && parsed.delta?.text) {
                      text = parsed.delta.text;
                    }
                  }

                  if (text) {
                    const outData = JSON.stringify({ text });
                    controller.enqueue(encoder.encode(`data: ${outData}\n\n`));
                  }
                } catch (e) {
                  // Ignore parse errors of incomplete chunks
                }
              }
            }
          }
          controller.close();
        } catch (err: any) {
          console.error(`Error reading ${provider} stream:`, err);
          const outData = JSON.stringify({ error: err.message || "Streaming error" });
          controller.enqueue(encoder.encode(`data: ${outData}\n\n`));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
      },
    });

  } catch (error: any) {
    console.error("API Route Error:", error);
    return NextResponse.json(
      { error: error.message || "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
