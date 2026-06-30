import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { messages, useThinking, useSearch } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured on the server." },
        { status: 500 }
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
    // Note: m.role is either 'user' or 'assistant'. Gemini expects 'user' or 'model'.
    const contents = messages.map((m: any) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }],
    }));

    // Determine model and configuration
    let model = "gemini-3.5-flash";
    const config: any = {
      systemInstruction: "You are Gemini, a helpful, precise, and advanced AI assistant. Format your responses with clean Markdown. When writing code blocks, always specify the programming language (e.g., ```typescript) so that syntax highlighting works properly.",
    };

    if (useThinking) {
      model = "gemini-3.1-pro-preview";
      config.thinkingConfig = {
        thinkingLevel: ThinkingLevel.HIGH,
      };
    } else if (useSearch) {
      model = "gemini-3.5-flash";
      config.tools = [{ googleSearch: {} }];
    }

    // Call generateContentStream
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

          // At the end, send the grounding chunks if any
          if (groundingChunks.length > 0) {
            const data = JSON.stringify({ sources: groundingChunks });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }

          controller.close();
        } catch (err: any) {
          console.error("Stream reader error:", err);
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
  } catch (error: any) {
    console.error("API Route Error:", error);
    if (error.status === 429 || error.message?.includes('429') || error.message?.includes('RESOURCE_EXHAUSTED')) {
      return NextResponse.json(
        { error: "The AI is currently busy or out of free tokens. Please wait about 30 seconds and try again!" },
        { status: 429 }
      );
    }
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
