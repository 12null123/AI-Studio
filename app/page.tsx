"use client";

import * as React from "react";
import { useState, useEffect, useRef } from "react";
import { getStorageManager, StorageKey, AIProvider } from "@/lib/secure-storage/manager";
import { PROVIDER_CONFIG } from "@/types/ai";
import { ArenaHeader } from "@/components/ArenaHeader";
import { ArenaPanes } from "@/components/ArenaPanes";
import { streamDualResponse } from "@/lib/arena-utils";
import {
  Plus,
  MessageSquare,
  Trash2,
  Edit2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Search,
  Globe,
  Send,
  Copy,
  Check,
  Menu,
  Settings,
  HelpCircle,
  Clock,
  ExternalLink,
  ChevronDown,
  Info,
  Key,
  ShieldAlert,
  Download,
  Upload,
  FileText,
  X,
  Paperclip,
  Eye
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from "react-markdown";
import { useIsMobile } from "@/hooks/use-mobile";

// Types
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Array<{ title: string; uri: string }>;
  timestamp: number;
  files?: Array<{ id: string; name: string; size: number; content: string }>;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  useThinking: boolean;
  useSearch: boolean;
  createdAt: number;
}

// Spark Icon Component (Google Gemini Diamond Gradient Spark)
interface GeminiSparkProps {
  className?: string;
  active?: boolean;
  mono?: boolean;
}

function GeminiSpark({ className = "w-6 h-6", active = false, mono = false }: GeminiSparkProps) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} ${active ? 'animate-pulse' : ''}`} fill="none" xmlns="http://www.w3.org/2000/svg">
      {!mono && (
        <defs>
          <linearGradient id="gemini-spark-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7a9efd" />
            <stop offset="35%" stopColor="#a374fc" />
            <stop offset="70%" stopColor="#f559aa" />
            <stop offset="100%" stopColor="#ff9a62" />
          </linearGradient>
        </defs>
      )}
      <path
        fill={mono ? "currentColor" : "url(#gemini-spark-grad)"}
        d="M12 2C12 2 12.3 8.7 13 9.4C13.7 10.1 20.4 10.4 20.4 10.4C20.4 10.4 13.7 10.7 13 11.4C12.3 12.1 12 18.8 12 18.8C12 18.8 11.7 12.1 11 11.4C10.3 10.7 3.6 10.4 3.6 10.4C3.6 10.4 10.3 10.7 11 9.4C11.7 8.7 12 2 12 2Z"
      />
      <path
        fill={mono ? "currentColor" : "url(#gemini-spark-grad)"}
        d="M19 4C19 4 19.15 6.65 19.4 6.9C19.65 7.15 22.3 7.3 22.3 7.3C22.3 7.3 19.65 7.45 19.4 7.7C19.15 7.95 19 10.6 19 10.6C19 10.6 18.85 7.95 18.6 7.7C18.35 7.45 15.7 7.3 15.7 7.3C15.7 7.3 18.35 7.15 18.6 6.9C18.85 6.65 19 4 19 4Z"
        opacity="0.8"
      />
    </svg>
  );
}

// CodeBlock helper
function CodeBlock({ language, value }: { language: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    try {
      const blob = new Blob([value], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      // Smart language file extension map
      let extension = "txt";
      const lang = language.toLowerCase();
      if (["typescript", "ts", "tsx"].includes(lang)) extension = "tsx";
      else if (["javascript", "js", "jsx"].includes(lang)) extension = "jsx";
      else if (["python", "py"].includes(lang)) extension = "py";
      else if (lang === "html") extension = "html";
      else if (lang === "css") extension = "css";
      else if (["rust", "rs"].includes(lang)) extension = "rs";
      else if (lang === "go") extension = "go";
      else if (lang === "json") extension = "json";
      else if (["sh", "bash"].includes(lang)) extension = "sh";
      else if (lang === "sql") extension = "sql";
      else if (["markdown", "md"].includes(lang)) extension = "md";
      else if (["cpp", "c++"].includes(lang)) extension = "cpp";
      else if (lang === "c") extension = "c";
      else if (["yaml", "yml"].includes(lang)) extension = "yml";
      
      a.download = `workspace_file.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 2000);
    } catch (err) {
      console.error("Failed to download file directly:", err);
    }
  };

  const displayLanguage = language ? language.toUpperCase() : "CODE";
  return (
    <div className="group/code my-5 rounded-2xl border border-white/[0.04] bg-[#09090b]/90 overflow-hidden shadow-2xl backdrop-blur-sm transition-all duration-300 hover:border-white/[0.08]">
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#0f0f11] border-b border-b-white/[0.03] text-xs font-mono text-neutral-400 select-none">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/30" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/20 border border-amber-500/30" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/20 border border-emerald-500/30" />
          </div>
          <span className="ml-2 font-bold text-zinc-500 text-[10px] tracking-widest">{displayLanguage}</span>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Direct download button visible on hover/regularly */}
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 text-neutral-500 hover:text-neutral-200 transition-all py-0.5 px-2 rounded-md hover:bg-white/[0.03] active:scale-95 duration-200 opacity-80 group-hover/code:opacity-100"
            title="Download snippet as file"
          >
            {downloaded ? (
              <>
                <Check size={11} className="text-emerald-400 animate-scale-up" />
                <span className="text-emerald-400 font-semibold text-[10px] uppercase tracking-wider">Saved!</span>
              </>
            ) : (
              <>
                <Download size={11} />
                <span className="text-[10px] font-semibold uppercase tracking-wider">Download</span>
              </>
            )}
          </button>

          <span className="h-3 w-[1px] bg-white/[0.06]" />

          {/* Copy code button */}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 hover:text-white text-neutral-500 transition-colors py-0.5 px-2 rounded-md hover:bg-white/[0.03] active:scale-95 duration-200"
            title="Copy to clipboard"
          >
            {copied ? (
              <>
                <Check size={11} className="text-emerald-400 animate-scale-up" />
                <span className="text-emerald-400 font-semibold text-[10px] uppercase tracking-wider">Copied!</span>
              </>
            ) : (
              <>
                <Copy size={11} />
                <span className="text-[10px] font-semibold uppercase tracking-wider">Copy</span>
              </>
            )}
          </button>
        </div>
      </div>
      <div className="p-4.5 overflow-x-auto font-mono text-[13px] text-neutral-300 leading-relaxed bg-[#060607]/40">
        <pre><code>{value}</code></pre>
      </div>
    </div>
  );
}

export default function Home() {
  const isMobile = useIsMobile();
  
  // Storage manager
  const storageManager = getStorageManager();
  const [storageReady, setStorageReady] = useState(false);
  
  // State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [input, setInput] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);
  
  // Quick settings toggles (applies to the next prompt)
  const [useThinking, setUseThinking] = useState(false);
  const [useSearch, setUseSearch] = useState(false);
  
  // Editing a past chat title
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  
  // Custom client-side API key states for multi-provider
  const [clientApiKey, setClientApiKey] = useState<string>("");
  const [clientAnthropicKey, setClientAnthropicKey] = useState<string>("");
  const [clientOpenaiKey, setClientOpenaiKey] = useState<string>("");
  const [clientOpenrouterKey, setClientOpenrouterKey] = useState<string>("");

  const [activeProvider, setActiveProvider] = useState<"google" | "anthropic" | "openai" | "openrouter">("google");
  const [activeModelId, setActiveModelId] = useState<string>("gemini-3.5-flash");
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);

  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [tempGoogleKey, setTempGoogleKey] = useState("");
  const [tempAnthropicKey, setTempAnthropicKey] = useState("");
  const [tempOpenaiKey, setTempOpenaiKey] = useState("");
  const [tempOpenrouterKey, setTempOpenrouterKey] = useState("");
  const [showKeyText, setShowKeyText] = useState(false);

  // Arena Mode state
  const [isArenaMode, setIsArenaMode] = useState(false);
  const [arenaProviderA, setArenaProviderA] = useState<"google" | "anthropic" | "openai" | "openrouter">("google");
  const [arenaProviderB, setArenaProviderB] = useState<"google" | "anthropic" | "openai" | "openrouter">("anthropic");
  const [arenaResponseA, setArenaResponseA] = useState("");
  const [arenaResponseB, setArenaResponseB] = useState("");
  const [arenaStreamingA, setArenaStreamingA] = useState(false);
  const [arenaStreamingB, setArenaStreamingB] = useState(false);
  const [arenaSourcesA, setArenaSourcesA] = useState<Array<{ title: string; uri: string }>>([]);
  const [arenaSourcesB, setArenaSourcesB] = useState<Array<{ title: string; uri: string }>>([]);
  
  // Floating toast notification state
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const showNotification = (message: string, type: "success" | "error" | "info" = "success") => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };
  
  // Claude-style attached files state
  interface PastedFile {
    id: string;
    name: string;
    content: string;
    size: number;
  }
  const [attachedFiles, setAttachedFiles] = useState<PastedFile[]>([]);

  // Format file size nicely
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  const toggleThinkingMode = () => {
    const newThinking = !useThinking;
    setUseThinking(newThinking);
    if (newThinking) {
      if (activeProvider === 'google') setActiveModelId("gemini-3.1-pro-preview");
      else if (activeProvider === 'anthropic') setActiveModelId("claude-fable-5");
      else if (activeProvider === 'openai') setActiveModelId("gpt-5.5-pro");
    } else {
      if (activeProvider === 'google') setActiveModelId("gemini-3.5-flash");
      else if (activeProvider === 'anthropic') setActiveModelId("claude-sonnet-5");
      else if (activeProvider === 'openai') setActiveModelId("gpt-5.5");
    }
  };

  // Get active model display name
  const getActiveModelName = () => {
    const providerConfig = PROVIDER_CONFIG[activeProvider];
    if (providerConfig) {
      const model = providerConfig.models.find(m => m.id === activeModelId);
      if (model) return model.name;
    }
    
    // Fallbacks
    if (activeProvider === "google") {
      return useThinking ? "Gemini 3.1 Pro" : "Gemini 3.5 Flash";
    }
    if (activeProvider === "anthropic") {
      return useThinking ? "Claude Fable 5" : "Claude Sonnet 5";
    }
    if (activeProvider === "openai") {
      return useThinking ? "GPT-5.5 Pro" : "GPT-5.5";
    }
    return "Gemini 3.5 Flash";
  };

  // Strip XML documents from content to display only the user prompt text
  const getPromptTextOnly = (content: string) => {
    return content.replace(/<document name="[^"]*">[\s\S]*?<\/document>/g, "").trim();
  };

  // Claude-style paste interceptor
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = e.clipboardData.getData("text");
    if (pastedText && pastedText.length >= 1200) {
      e.preventDefault(); // Stop from inserting into textarea
      
      const newFileId = Math.random().toString(36).substring(7);
     
      // Deduce a clean title from the first line, falling back to "Pasted Text"
      let title = "Pasted Text";
      const firstLine = pastedText.split("\n")[0].trim().substring(0, 30);
      if (firstLine && firstLine.length > 3) {
        const sanitized = firstLine.replace(/[^a-zA-Z0-9\s-_]/g, "").trim();
        if (sanitized) {
          title = sanitized;
        }
      }
      
      const newFile: PastedFile = {
        id: newFileId,
        name: `${title}.txt`,
        content: pastedText,
        size: pastedText.length
      };
      setAttachedFiles((prev) => [...prev, newFile]);
      showNotification(`Large text auto-converted to document: ${newFile.name}`, "info");
    }
  };

  // Custom file upload handler for text/code files
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if it's text or code
    const isTextLike = 
      file.type.startsWith("text/") ||
      file.name.endsWith(".txt") || 
      file.name.endsWith(".js") || 
      file.name.endsWith(".jsx") || 
      file.name.endsWith(".ts") || 
      file.name.endsWith(".tsx") || 
      file.name.endsWith(".json") || 
      file.name.endsWith(".css") || 
      file.name.endsWith(".md") || 
      file.name.endsWith(".html") ||
      file.name.endsWith(".py") ||
      file.name.endsWith(".java") ||
      file.name.endsWith(".cpp") ||
      file.name.endsWith(".c") ||
      file.name.endsWith(".rs") ||
      file.name.endsWith(".sh") ||
      file.name.endsWith(".yml") ||
      file.name.endsWith(".yaml");

    if (!isTextLike) {
      showNotification("Please select a text or code document (e.g. .txt, .js, .ts, .json, .py, etc.)", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const newFile: PastedFile = {
        id: Math.random().toString(36).substring(7),
        name: file.name,
        content: content,
        size: file.size
      };
      setAttachedFiles((prev) => [...prev, newFile]);
      showNotification(`Document attached: ${file.name}`, "success");
    };
    reader.readAsText(file);
    e.target.value = ""; // Reset input
  };

  // Sync temp keys when modal opens
  useEffect(() => {
    if (isKeyModalOpen) {
      setTempGoogleKey(clientApiKey);
      setTempAnthropicKey(clientAnthropicKey);
      setTempOpenaiKey(clientOpenaiKey);
      setTempOpenrouterKey(clientOpenrouterKey);
    }
  }, [isKeyModalOpen, clientApiKey, clientAnthropicKey, clientOpenaiKey, clientOpenrouterKey]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Suggested starter prompts
  const suggestedPrompts = [
    {
      category: "Help me write",
      text: "a professional email explaining a delayed deployment",
      icon: <Sparkles className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 transition-colors duration-300" />
    },
    {
      category: "Brainstorm ideas",
      text: "for a sleek Next.js portfolio website layout",
      icon: <Globe className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 transition-colors duration-300" />
    },
    {
      category: "Explain concepts",
      text: "quantum computing in simple analogies for a 5-year-old",
      icon: <HelpCircle className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 transition-colors duration-300" />
    },
    {
      category: "Debug my code",
      text: "analyze and optimize a React useEffect loop",
      icon: <Search className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 transition-colors duration-300" />
    }
  ];

  // Initialize storage on mount
  useEffect(() => {
    const initializeStorage = async () => {
      try {
        await storageManager.initialize();
        
        // Load conversations
        const savedChats = await storageManager.getAppState(StorageKey.CONVERSATIONS);
        if (savedChats) {
          try {
            setConversations(JSON.parse(savedChats));
          } catch (e) {
            console.error("[v0] Failed to parse conversations:", e);
          }
        }
        
        // Load active chat ID
        const savedActiveId = await storageManager.getAppState(StorageKey.ACTIVE_CHAT_ID);
        if (savedActiveId) {
          setActiveId(savedActiveId);
        } else if (savedChats) {
          // Fallback to first chat if no active ID
          try {
            const parsed = JSON.parse(savedChats);
            if (parsed.length > 0) setActiveId(parsed[0].id);
          } catch {}
        }
        
        // Load API keys
        const googleKey = await storageManager.getCredential(AIProvider.GOOGLE);
        if (googleKey) setClientApiKey(googleKey);
        
        const anthropicKey = await storageManager.getCredential(AIProvider.ANTHROPIC);
        if (anthropicKey) setClientAnthropicKey(anthropicKey);
        
        const openaiKey = await storageManager.getCredential(AIProvider.OPENAI);
        if (openaiKey) setClientOpenaiKey(openaiKey);

        const openrouterKey = await storageManager.getCredential(AIProvider.OPENROUTER);
        if (openrouterKey) setClientOpenrouterKey(openrouterKey);
        
        // Load provider and model settings
        const provider = await storageManager.getAppState(StorageKey.ACTIVE_PROVIDER);
        if (provider) setActiveProvider(provider as any);
        
        const modelId = await storageManager.getAppState(StorageKey.ACTIVE_MODEL_ID);
        if (modelId) setActiveModelId(modelId);
        
        setStorageReady(true);
        console.log("[v0] Storage initialized successfully");
      } catch (error) {
        console.error("[v0] Failed to initialize storage:", error);
        setStorageReady(true);
      }
    };
    
    initializeStorage();
  }, [storageManager]);

  // Auto-sync conversations changes to encrypted storage
  useEffect(() => {
    if (!storageReady) return;
    const sync = async () => {
      try {
        await storageManager.setAppState(StorageKey.CONVERSATIONS, JSON.stringify(conversations));
      } catch (error) {
        console.error("[v0] Failed to sync conversations:", error);
      }
    };
    sync();
  }, [conversations, storageReady, storageManager]);

  // Auto-sync activeId changes to encrypted storage
  useEffect(() => {
    if (!storageReady) return;
    const sync = async () => {
      try {
        if (activeId) {
          await storageManager.setAppState(StorageKey.ACTIVE_CHAT_ID, activeId);
        } else {
          await storageManager.removeAppState(StorageKey.ACTIVE_CHAT_ID);
        }
      } catch (error) {
        console.error("[v0] Failed to sync activeId:", error);
      }
    };
    sync();
  }, [activeId, storageReady, storageManager]);

  // Auto-sync clientApiKey changes to encrypted storage
  useEffect(() => {
    if (!storageReady) return;
    const sync = async () => {
      try {
        if (clientApiKey) {
          await storageManager.setCredential(AIProvider.GOOGLE, clientApiKey);
        } else {
          await storageManager.removeCredential(AIProvider.GOOGLE);
        }
      } catch (error) {
        console.error("[v0] Failed to sync Google key:", error);
      }
    };
    sync();
  }, [clientApiKey, storageReady, storageManager]);

  // Auto-sync clientAnthropicKey changes to encrypted storage
  useEffect(() => {
    if (!storageReady) return;
    const sync = async () => {
      try {
        if (clientAnthropicKey) {
          await storageManager.setCredential(AIProvider.ANTHROPIC, clientAnthropicKey);
        } else {
          await storageManager.removeCredential(AIProvider.ANTHROPIC);
        }
      } catch (error) {
        console.error("[v0] Failed to sync Anthropic key:", error);
      }
    };
    sync();
  }, [clientAnthropicKey, storageReady, storageManager]);

  // Auto-sync clientOpenaiKey changes to encrypted storage
  useEffect(() => {
    if (!storageReady) return;
    const sync = async () => {
      try {
        if (clientOpenaiKey) {
          await storageManager.setCredential(AIProvider.OPENAI, clientOpenaiKey);
        } else {
          await storageManager.removeCredential(AIProvider.OPENAI);
        }
      } catch (error) {
        console.error("[v0] Failed to sync OpenAI key:", error);
      }
    };
    sync();
  }, [clientOpenaiKey, storageReady, storageManager]);

  // Auto-sync activeProvider changes to encrypted storage
  useEffect(() => {
    if (!storageReady) return;
    const sync = async () => {
      try {
        if (activeProvider) {
          await storageManager.setAppState(StorageKey.ACTIVE_PROVIDER, activeProvider);
        }
      } catch (error) {
        console.error("[v0] Failed to sync provider:", error);
      }
    };
    sync();
  }, [activeProvider, storageReady, storageManager]);

  // Auto-sync activeModelId changes to encrypted storage
  useEffect(() => {
    if (!storageReady) return;
    const sync = async () => {
      try {
        if (activeModelId) {
          await storageManager.setAppState(StorageKey.ACTIVE_MODEL_ID, activeModelId);
        }
      } catch (error) {
        console.error("[v0] Failed to sync model ID:", error);
      }
    };
    sync();
  }, [activeModelId, storageReady, storageManager]);

  // Export all conversations to a JSON file
  const exportChats = () => {
    try {
      if (conversations.length === 0) {
        showNotification("No chat history to export.", "info");
        return;
      }
      const dataStr = JSON.stringify(conversations, null, 2);
      const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
      const exportFileDefaultName = `gemini-chats-backup-${new Date().toISOString().slice(0, 10)}.json`;
      
      const linkElement = document.createElement("a");
      linkElement.setAttribute("href", dataUri);
      linkElement.setAttribute("download", exportFileDefaultName);
      linkElement.click();
      showNotification("Chats exported successfully!", "success");
    } catch (e) {
      console.error("Failed to export chats:", e);
      showNotification("Failed to export chats.", "error");
    }
  };

  // Import conversations from a JSON file
  const handleImportChats = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const file = e.target.files?.[0];
    if (!file) return;

    fileReader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed)) {
          // Quick schema validation
          const isValid = parsed.every(
            (c) => c && typeof c.id === "string" && typeof c.title === "string" && Array.isArray(c.messages)
          );
          if (isValid) {
            const merged = [...parsed, ...conversations];
            // Remove duplicates by id
            const unique = merged.filter(
              (char, index) => merged.findIndex((item) => item.id === char.id) === index
            );
            setConversations(unique);
            if (unique.length > 0) {
              setActiveId(unique[0].id);
            }
            showNotification(`Imported ${parsed.length} chats successfully!`, "success");
          } else {
            showNotification("Invalid file format. Ensure it's a Gemini chat backup.", "error");
          }
        } else {
          showNotification("Backup file format is not an array of chats.", "error");
        }
      } catch (err) {
        console.error("Failed to parse backup file:", err);
        showNotification("Failed to parse JSON file.", "error");
      }
    };
    fileReader.readAsText(file, "UTF-8");
    e.target.value = ""; // Reset file input
  };

  // Save conversations to localstorage (legacy wrapper for other calls)
  const saveToStorage = (updated: Conversation[]) => {
    setConversations(updated);
  };

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversations, activeId, isStreaming]);

  // Handle sidebar responsive width
  useEffect(() => {
    if (isMobile) {
      setIsSidebarOpen(false);
    } else {
      setIsSidebarOpen(true);
    }
  }, [isMobile]);

  // Textarea height auto-adjust
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  // Load saved draft on active conversation switch or initial load
  useEffect(() => {
    if (!storageReady || !activeId) {
      setInput("");
      return;
    }
    
    const loadDraft = async () => {
      try {
        const draftKey = `gemini_input_draft_${activeId}`;
        const draft = await storageManager.getAppState(draftKey as any);
        if (draft) {
          setInput(draft);
        } else {
          setInput("");
        }
      } catch (error) {
        console.error("[v0] Failed to load draft:", error);
        setInput("");
      }
    };
    
    loadDraft();
  }, [activeId, storageReady, storageManager]);

  // Auto-sync input drafts to encrypted storage
  useEffect(() => {
    if (!storageReady || !activeId) return;
    
    const sync = async () => {
      try {
        const draftKey = `gemini_input_draft_${activeId}`;
        if (input.trim()) {
          await storageManager.setAppState(draftKey as any, input);
        } else {
          await storageManager.removeAppState(draftKey as any);
        }
      } catch (error) {
        console.error("[v0] Failed to sync draft:", error);
      }
    };
    
    sync();
  }, [input, activeId, storageReady, storageManager]);

  const activeConversation = conversations.find((c) => c.id === activeId);

  // Create conversation
  const createNewChat = (title = "New chat") => {
    const newId = Math.random().toString(36).substring(7);
    const newConv: Conversation = {
      id: newId,
      title,
      messages: [],
      useThinking,
      useSearch,
      createdAt: Date.now()
    };
    const updated = [newConv, ...conversations];
    saveToStorage(updated);
    setActiveId(newId);
    return newConv;
  };

  // Delete conversation
  const deleteChat = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = conversations.filter((c) => c.id !== id);
    saveToStorage(filtered);
    if (activeId === id) {
      if (filtered.length > 0) {
        setActiveId(filtered[0].id);
      } else {
        setActiveId("");
      }
    }
  };

  // Rename conversation
  const startRename = (id: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(id);
    setEditTitle(title);
  };

  const handleRenameSave = (id: string) => {
    if (!editTitle.trim()) return;
    const updated = conversations.map((c) =>
      c.id === id ? { ...c, title: editTitle.trim() } : c
    );
    saveToStorage(updated);
    setEditingId(null);
  };

  // Submit message
  const handleSendMessage = async (customPrompt?: string) => {
    const promptText = (customPrompt || input).trim();
    if ((!promptText && attachedFiles.length === 0) || isStreaming) return;

    // Reset standard input
    if (!customPrompt) setInput("");
    // Use attached files if they exist and this is a user input submission (not starter prompt)
    const filesToSend = customPrompt ? [] : [...attachedFiles];
    if (!customPrompt) setAttachedFiles([]);

    let currentConv = activeConversation;
    let localConversations = [...conversations];
    // Create new chat if none exists or active conversation has been deleted
    if (!currentConv || !activeId) {
      const displayTitle = promptText 
        ? (promptText.length > 24 ? promptText.substring(0, 24) + "..." : promptText)
        : (filesToSend.length > 0 ? filesToSend[0].name : "New chat");
      const newId = Math.random().toString(36).substring(7);
      const newConv: Conversation = {
        id: newId,
        title: displayTitle,
        messages: [],
        useThinking,
        useSearch,
        createdAt: Date.now()
      };
      localConversations = [newConv, ...localConversations];
      currentConv = newConv;
      setActiveId(newId);
    }

    // Format content with attachments if any
    let apiContent = promptText;
    if (filesToSend.length > 0) {
      const attachmentsText = filesToSend.map(file => 
        `<document name="${file.name}">\n${file.content}\n</document>`
      ).join("\n\n");
      apiContent = promptText 
        ? `${promptText}\n\n${attachmentsText}`
        : `Please analyze the attached document:\n\n${attachmentsText}`;
    }

    // Add user message to state
    const userMessage: Message = {
      id: Math.random().toString(36).substring(7),
      role: "user",
      content: apiContent,
      files: filesToSend.length > 0 ? filesToSend : undefined,
      timestamp: Date.now()
    };

    const updatedMessages = [...currentConv.messages, userMessage];
    let updatedConv = {
      ...currentConv,
      messages: updatedMessages,
      useThinking,
      useSearch
    };
    // Update conversation title if it was "New chat"
    if (currentConv.title === "New chat") {
      const displayTitle = promptText 
        ? (promptText.length > 24 ? promptText.substring(0, 24) + "..." : promptText)
        : (filesToSend.length > 0 ? filesToSend[0].name : "New chat");
      updatedConv.title = displayTitle;
    }

    const nextConversations = localConversations.map((c) =>
      c.id === updatedConv.id ? updatedConv : c
    );
    saveToStorage(nextConversations);
    setIsStreaming(true);

    // Prepare assistant state for streaming
    const assistantMessageId = Math.random().toString(36).substring(7);
    const initialAssistantMessage: Message = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      timestamp: Date.now()
    };
    // Optimistically update conversations with empty assistant message
    const conversationsWithAssistant = nextConversations.map((c) =>
      c.id === updatedConv.id
        ? { ...updatedConv, messages: [...updatedMessages, initialAssistantMessage] }
        : c
    );
    setConversations(conversationsWithAssistant);

    try {
      const userApiKey = activeProvider === "google"
        ? (clientApiKey || undefined)
        : activeProvider === "anthropic"
        ? (clientAnthropicKey || undefined)
        : activeProvider === "openai"
        ? (clientOpenaiKey || undefined)
        : (clientOpenrouterKey || undefined);

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages,
          useThinking,
          useSearch,
          clientApiKey: clientApiKey || undefined,
          provider: activeProvider,
          modelId: activeModelId,
          userApiKey
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (errorData.isKeyMissing) {
          setIsKeyModalOpen(true);
        }
        throw new Error(errorData.error || "Failed to fetch response from the AI provider.");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader available from response stream.");
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulatedContent = "";
      let sources: Array<{ title: string; uri: string }> = [];

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
              if (data.text) {
                accumulatedContent += data.text;
                // Live update state
                setConversations((prev) =>
                  prev.map((c) =>
                    c.id === updatedConv.id
                      ? {
                          ...c,
                          messages: c.messages.map((m) =>
                            m.id === assistantMessageId ? { ...m, content: accumulatedContent } : m
                          )
                        }
                      : c
                  )
                );
              }
              if (data.sources) {
                sources = data.sources;
                setConversations((prev) =>
                  prev.map((c) =>
                    c.id === updatedConv.id
                      ? {
                          ...c,
                          messages: c.messages.map((m) =>
                            m.id === assistantMessageId ? { ...m, sources } : m
                          )
                        }
                      : c
                  )
                );
              }
              if (data.error) {
                throw new Error(data.error);
              }
            } catch (e) {
              console.error("Stream parse error:", e);
            }
          }
        }
      }

      // Finalize saving full response to storage
      setConversations((prev) => {
        const final = prev.map((c) =>
          c.id === updatedConv.id
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === assistantMessageId
                    ? { ...m, content: accumulatedContent, sources: sources.length > 0 ? sources : undefined }
                    : m
                )
              }
            : c
        );
        return final;
      });

      // Handle Arena Mode streaming if enabled
      if (isArenaMode) {
        setArenaStreamingA(true);
        setArenaStreamingB(true);

        streamDualResponse(
          updatedMessages,
          arenaProviderA,
          arenaProviderB,
          clientApiKey,
          clientAnthropicKey,
          clientOpenaiKey,
          useThinking,
          useSearch,
          activeModelId,
          // onChunkA (chunk) => {
          (chunk) => {
            if (chunk.text) {
              setArenaResponseA((prev) => prev + chunk.text);
            }
            if (chunk.sources) {
              setArenaSourcesA(chunk.sources);
            }
          },
          // onChunkB (chunk) => {
          (chunk) => {
            if (chunk.text) {
              setArenaResponseB((prev) => prev + chunk.text);
            }
            if (chunk.sources) {
              setArenaSourcesB(chunk.sources);
            }
          },
          // onErrorA
          (error) => {
            setArenaResponseA(`Error: ${error}`);
            setArenaStreamingA(false);
          },
          // onErrorB
          (error) => {
            setArenaResponseB(`Error: ${error}`);
            setArenaStreamingB(false);
          },
          // onCompleteA
          () => setArenaStreamingA(false),
          // onCompleteB
          () => setArenaStreamingB(false)
        );
      }
    } catch (err: any) {
      console.error("Failed to generate stream response:", err);
      // Append error message to assistant chat content
      setConversations((prev) => {
        const final = prev.map((c) =>
          c.id === updatedConv.id
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === assistantMessageId
                    ? {
                        ...m,
                        content: `Error: ${err.message || "Something went wrong while connecting to the AI server. Ensure your API keys are configured in the Settings > Secrets menu."}`
                      }
                    : m
                )
              }
            : c
        );
        return final;
      });

      // Restore draft to input textarea to prevent total system wipe on failures
      if (!customPrompt) {
        setInput(promptText);
        showNotification("Draft restored. Connection issue encountered.", "error");
      }
    } finally {
      setIsStreaming(false);
    }
  };

  // Send message on Enter, Shift+Enter for newline
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div id="app-root" className="flex h-screen w-screen overflow-hidden bg-[#070709] text-neutral-200 font-sans">
      {/* 1. Collapsible Sidebar */}
      <AnimatePresence initial={false}>
        {isSidebarOpen && (
          <motion.div
            id="sidebar-panel"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: isMobile ? "100%" : 288, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className={`flex-shrink-0 h-full bg-[#08080a]/98 border-r border-white/[0.04] backdrop-blur-2xl flex flex-col z-30 ${
              isMobile ? "absolute inset-y-0 left-0" : "relative"
            }`}
          >
            {/* Sidebar Header */}
            <div className="h-16 px-5 flex items-center justify-between border-b border-white/[0.02]">
              <div className="flex items-center gap-1.5 select-none">
                <span className="text-[10px] tracking-[0.2em] uppercase font-bold text-zinc-500 flex items-center gap-2">
                  <GeminiSpark className="w-3.5 h-3.5 text-zinc-500" mono={true} /> Gemini Workspace
                </span>
                <button
                  onClick={() => {
                    createNewChat();
                    if (isMobile) setIsSidebarOpen(false);
                  }}
                  className="p-1 text-zinc-500 hover:text-zinc-200 transition-colors flex items-center justify-center rounded-md"
                  title="New Thread"
                >
                  <Plus size={13} strokeWidth={2.5} />
                </button>
              </div>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="p-1.5 hover:bg-white/[0.04] rounded-lg transition-all text-neutral-500 hover:text-neutral-200"
                title="Collapse sidebar"
              >
                <ChevronLeft size={15} />
              </button>
            </div>
            
            {/* Past Chats Scroll Container */}
            <div className="flex-1 overflow-y-auto px-2 pt-4 space-y-1 scrollbar-thin scrollbar-thumb-white/[0.02]">
              <div className="flex items-center justify-between px-3 mb-2.5 mt-2">
                <span className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold">
                  Recent Threads
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={exportChats}
                    className="p-1 hover:bg-white/[0.04] text-neutral-500 hover:text-neutral-300 rounded-lg transition-colors"
                    title="Export Backup (.json)"
                  >
                    <Download size={11} />
                  </button>
                  <label
                    className="p-1 hover:bg-white/[0.04] text-neutral-500 hover:text-neutral-300 rounded-lg transition-colors cursor-pointer"
                    title="Import Backup (.json)"
                  >
                    <Upload size={11} />
                    <input type="file" accept=".json" onChange={handleImportChats} className="hidden" />
                  </label>
                </div>
              </div>
              
              {conversations.length === 0 ? (
                <div className="p-3 text-center text-xs text-neutral-600 select-none italic">
                  No active threads
                </div>
              ) : (
                conversations.map((conv) => {
                  const isChatActive = conv.id === activeId;
                  const isEditing = conv.id === editingId;
                  
                  return (
                    <div
                      key={conv.id}
                      onClick={() => {
                        setActiveId(conv.id);
                        if (isMobile) setIsSidebarOpen(false);
                      }}
                      className={`group/item relative flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all duration-200 cursor-pointer ${
                        isChatActive
                          ? "bg-white/[0.04] text-neutral-100 font-medium shadow-inner"
                          : "text-neutral-400 hover:bg-white/[0.015] hover:text-neutral-200"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                        <MessageSquare size={14} className={isChatActive ? "text-neutral-400" : "text-neutral-600"} />
                        {isEditing ? (
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onBlur={() => handleRenameSave(conv.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleRenameSave(conv.id);
                              if (e.key === "Escape") setEditingId(null);
                            }}
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                            className="bg-neutral-900 border border-white/[0.08] text-xs px-2 py-0.5 rounded text-white focus:outline-none focus:border-white/[0.2] w-full"
                          />
                        ) : (
                          <span className="truncate text-xs leading-none">
                            {conv.title}
                          </span>
                        )}
                      </div>
                      
                      {!isEditing && (
                        <div className="opacity-0 group-hover/item:opacity-100 flex items-center gap-1 transition-opacity duration-150 absolute right-2 bg-gradient-to-l from-[#08080a] pl-4 h-full top-0 rounded-r-xl">
                          <button
                            onClick={(e) => startRename(conv.id, conv.title, e)}
                            className="p-1 hover:text-white text-neutral-500 transition-colors"
                            title="Rename"
                          >
                            <Edit2 size={11} />
                          </button>
                          <button
                            onClick={(e) => deleteChat(conv.id, e)}
                            className="p-1 hover:text-rose-400 text-neutral-500 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
            
            {/* Sidebar Secrets Config Footer Button */}
            <div className="p-3 border-t border-white/[0.02] bg-[#050506]/40 flex flex-col gap-1">
              <button
                onClick={() => setIsKeyModalOpen(true)}
                className="w-full py-2 px-3 rounded-xl border border-white/[0.03] hover:border-white/[0.08] bg-white/[0.01] hover:bg-white/[0.03] text-xs text-neutral-400 hover:text-neutral-200 transition-all duration-200 flex items-center justify-between group"
              >
                <div className="flex items-center gap-2">
                  <Key size={13} className="text-zinc-500 group-hover:text-zinc-300 transition-colors" />
                  <span>Configure API Secrets</span>
                </div>
                <Settings size={12} className="opacity-40 group-hover:opacity-100 transition-opacity" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Workspace Frame */}
      <div className="flex-1 h-full flex flex-col relative min-w-0 overflow-hidden">
        {/* Workspace Sub-Header */}
        <ArenaHeader 
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          isArenaMode={isArenaMode}
          setIsArenaMode={setIsArenaMode}
          activeProvider={activeProvider}
          setActiveProvider={setActiveProvider}
          activeModelId={activeModelId}
          setActiveModelId={setActiveModelId}
          isModelDropdownOpen={isModelDropdownOpen}
          setIsModelDropdownOpen={setIsModelDropdownOpen}
          useThinking={useThinking}
          toggleThinkingMode={toggleThinkingMode}
          useSearch={useSearch}
          setUseSearch={setUseSearch}
          getActiveModelName={getActiveModelName}
          arenaProviderA={arenaProviderA}
          setArenaProviderA={setArenaProviderA}
          arenaProviderB={arenaProviderB}
          setArenaProviderB={setArenaProviderB}
        />

        {/* Central Interactivity Board */}
        <div className="flex-1 overflow-hidden relative">
          {isArenaMode ? (
            <ArenaPanes 
              arenaResponseA={arenaResponseA}
              arenaResponseB={arenaResponseB}
              arenaStreamingA={arenaStreamingA}
              arenaStreamingB={arenaStreamingB}
              arenaSourcesA={arenaSourcesA}
              arenaSourcesB={arenaSourcesB}
              arenaProviderA={arenaProviderA}
              arenaProviderB={arenaProviderB}
              CodeBlock={CodeBlock}
              ReactMarkdown={ReactMarkdown}
            />
          ) : (
            <div className="h-full overflow-y-auto px-4 md:px-0 scrollbar-thin scrollbar-thumb-white/[0.02]">
              {!activeConversation || activeConversation.messages.length === 0 ? (
                /* Empty Workspace Welcomer Panel */
                <div className="max-w-2xl mx-auto pt-20 pb-32 flex flex-col items-center justify-center h-full text-center px-4">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="flex flex-col items-center"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-white/[0.04] to-transparent border border-white/[0.05] shadow-xl flex items-center justify-center mb-6 relative group">
                      <div className="absolute inset-0 bg-white/[0.01] blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl" />
                      <GeminiSpark className="w-7 h-7" active={isStreaming} />
                    </div>
                    
                    <h1 className="text-2xl font-semibold tracking-tight text-neutral-100 mb-2">
                      Frontier Model Arena Engine
                    </h1>
                    <p className="text-sm text-neutral-500 max-w-md mb-10 leading-relaxed font-normal">
                      A contextual prototyping sandbox supporting direct cross-stack bridges, multi-turn streams, and multi-provider model testing.
                    </p>
                  </motion.div>

                  {/* Starter Suggestions Matrix */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full max-w-xl">
                    {suggestedPrompts.map((prompt, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 + 0.1, duration: 0.35 }}
                        onClick={() => handleSendMessage(prompt.text)}
                        className="group p-3.5 rounded-xl border border-white/[0.03] bg-white/[0.01] hover:bg-white/[0.03] hover:border-white/[0.07] text-left transition-all duration-300 cursor-pointer shadow-sm hover:shadow-md relative overflow-hidden"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider group-hover:text-neutral-400 transition-colors">
                            {prompt.category}
                          </span>
                          <div className="p-1 rounded-md bg-white/[0.02] border border-white/[0.03] group-hover:border-white/[0.08] transition-all">
                            {prompt.icon}
                          </div>
                        </div>
                        <p className="text-xs text-neutral-400 group-hover:text-neutral-200 transition-colors duration-300 font-normal line-clamp-2 pr-2">
                          "{prompt.text}"
                        </p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ) : (
                /* Ongoing Message Chain Streamboard */
                <div className="max-w-3xl mx-auto pt-6 pb-36 space-y-8 px-4">
                  {activeConversation.messages.map((msg) => {
                    const isUser = msg.role === "user";
                    const isGoogle = activeProvider === "google";
                    
                    return (
                      <div
                        key={msg.id}
                        className={`flex gap-4.5 ${isUser ? "justify-end" : "justify-start"}`}
                      >
                        {!isUser && (
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-b from-white/[0.05] to-transparent border border-white/[0.04] flex items-center justify-center flex-shrink-0 shadow-md">
                            <GeminiSpark className="w-4 h-4" active={false} mono={!isGoogle} />
                          </div>
                        )}
                        
                        <div className={`max-w-[85%] flex flex-col gap-2 ${isUser ? "items-end" : "items-start"}`}>
                          {/* Attached files container in chat item bubble */}
                          {msg.files && msg.files.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-1.5 justify-end w-full">
                              {msg.files.map((file) => (
                                <div 
                                  key={file.id} 
                                  className="flex items-center gap-2 bg-[#0d0d10]/95 border border-white/[0.05] px-3 py-1.5 rounded-xl text-xs text-neutral-300 shadow-sm"
                                >
                                  <FileText size={13} className="text-zinc-500" />
                                  <span className="max-w-[140px] truncate font-medium">{file.name}</span>
                                  <span className="text-[10px] text-zinc-600 font-mono">({formatFileSize(file.size)})</span>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className={`rounded-2xl text-[14.5px] leading-relaxed shadow-sm px-4.5 py-3 ${
                            isUser
                              ? "bg-neutral-100 text-neutral-900 font-normal"
                              : "text-neutral-200 w-full"
                          }`}>
                            {isUser ? (
                              <p className="whitespace-pre-wrap select-text">{getPromptTextOnly(msg.content)}</p>
                            ) : msg.content === "" ? (
                              <div className="flex items-center gap-2 py-2 select-none">
                                <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce duration-600" />
                                <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce duration-600 delay-150" />
                                <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce duration-600 delay-300" />
                              </div>
                            ) : (
                              <div className="prose prose-invert prose-neutral max-w-none prose-sm selection:bg-white/[0.1] prose-p:leading-relaxed prose-pre:p-0 prose-pre:bg-transparent prose-pre:border-0 select-text">
                                <ReactMarkdown
                                  components={{
                                    code({ node, className, children, ...props }) {
                                      const match = /language-(\w+)/.exec(className || "");
                                      const codeVal = String(children).replace(/\n$/, "");
                                      return match ? (
                                        <CodeBlock language={match[1]} value={codeVal} />
                                      ) : (
                                        <code className={`${className} bg-white/[0.05] px-1.5 py-0.5 rounded-md font-mono text-xs text-zinc-300 border border-white/[0.02]`} {...props}>
                                          {children}
                                        </code>
                                      );
                                    }
                                  }}
                                >
                                  {msg.content}
                                </ReactMarkdown>
                              </div>
                            )}
                          </div>
                          
                          {/* Found Grounded Search Sources list banner */}
                          {!isUser && msg.sources && msg.sources.length > 0 && (
                            <motion.div 
                              initial={{ opacity: 0, y: 4 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="mt-2.5 w-full rounded-xl border border-white/[0.03] bg-white/[0.01] p-3 shadow-inner"
                            >
                              <div className="flex items-center gap-1.5 mb-2 select-none">
                                <Globe size={11} className="text-emerald-500 animate-pulse" />
                                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
                                  Grounding Citations ({msg.sources.length})
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {msg.sources.map((src, idx) => (
                                  <a
                                    key={idx}
                                    href={src.uri}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-[11px] bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.03] hover:border-white/[0.08] text-neutral-400 hover:text-neutral-200 py-1 px-2.5 rounded-lg transition-all duration-200"
                                  >
                                    <span className="font-mono text-[9px] text-zinc-600 bg-white/[0.02] w-3.5 h-3.5 rounded-full flex items-center justify-center border border-white/[0.04]">
                                      {idx + 1}
                                    </span>
                                    <span className="truncate max-w-[160px] font-medium">{src.title}</span>
                                    <ExternalLink size={10} className="opacity-40" />
                                  </a>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Global Floating Action Shell & Prompt Input Bar */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-[#070709] via-[#070709]/95 to-transparent pt-12 pb-6 px-4 select-none z-20">
          <div className="max-w-3xl mx-auto flex flex-col gap-2 relative">
            
            {/* Attached file chips row inside input bar frame */}
            {attachedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 px-1 mb-1 max-h-[100px] overflow-y-auto">
                {attachedFiles.map((file) => (
                  <div 
                    key={file.id} 
                    className="flex items-center gap-2 bg-[#0c0c0e]/95 border border-white/[0.06] pl-3 pr-2 py-1 rounded-xl text-xs text-neutral-200 shadow-md group/chip animate-scale-up"
                  >
                    <FileText size={12} className="text-zinc-400" />
                    <span className="max-w-[120px] truncate font-medium">{file.name}</span>
                    <span className="text-[9px] text-zinc-600 font-mono">({formatFileSize(file.size)})</span>
                    <button 
                      onClick={() => setAttachedFiles(prev => prev.filter(f => f.id !== file.id))}
                      className="p-0.5 rounded-md hover:bg-white/[0.06] text-neutral-500 hover:text-neutral-200 transition-all ml-1"
                      title="Remove document attachment"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="relative rounded-2xl border border-white/[0.04] bg-[#0c0c0e]/85 backdrop-blur-xl transition-all duration-300 focus-within:border-white/[0.1] focus-within:shadow-[0_0_30px_rgba(255,255,255,0.015)] shadow-xl overflow-hidden">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder={isArenaMode ? "Input unified prompt to trigger multi-provider battle stream..." : `Message ${getActiveModelName()}...`}
                rows={1}
                disabled={isStreaming}
                className="w-full bg-transparent text-neutral-200 placeholder-neutral-500 text-[14.5px] leading-relaxed pl-4.5 pr-28 pt-3.5 pb-12 focus:outline-none resize-none min-h-[52px] max-h-[200px] font-normal"
              />
              
              {/* Input Action Panel Row */}
              <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between border-t border-white/[0.01] pt-2 pointer-events-auto">
                <div className="flex items-center gap-1.5">
                  {/* File attach button linking to invisible input */}
                  <label className="p-1.5 hover:bg-white/[0.04] rounded-lg transition-all text-neutral-500 hover:text-neutral-300 cursor-pointer flex items-center justify-center">
                    <Paperclip size={14} />
                    <input 
                      type="file" 
                      onChange={handleFileUpload} 
                      className="hidden" 
                      accept=".txt,.js,.jsx,.ts,.tsx,.json,.css,.md,.html,.py,.java,.cpp,.c,.rs,.sh,.yml,.yaml" 
                    />
                  </label>
                  
                  <span className="h-3.5 w-[1px] bg-white/[0.04] mx-0.5" />

                  {/* Thinking Accelerator Switch */}
                  <button
                    onClick={toggleThinkingMode}
                    className={`flex items-center gap-1.5 py-1 px-2.5 rounded-lg transition-all duration-300 border text-[11px] font-semibold tracking-wider uppercase ${
                      useThinking
                        ? "bg-purple-950/30 border-purple-500/30 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.05)]"
                        : "bg-white/[0.01] border-white/[0.03] hover:border-white/[0.06] text-neutral-500 hover:text-neutral-300"
                    }`}
                    title="Toggle high-density analytical reasoning pipeline"
                  >
                    <Sparkles size={11} className={useThinking ? "text-purple-400 animate-spin-slow" : ""} />
                    <span>Thinking</span>
                  </button>

                  {/* Search Grounding Pipeline Trigger */}
                  <button
                    onClick={() => setUseSearch(!useSearch)}
                    className={`flex items-center gap-1.5 py-1 px-2.5 rounded-lg transition-all duration-300 border text-[11px] font-semibold tracking-wider uppercase ${
                      useSearch
                        ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.05)]"
                        : "bg-white/[0.01] border-white/[0.03] hover:border-white/[0.06] text-neutral-500 hover:text-neutral-300"
                    }`}
                    title="Toggle web grounding engine query attachment"
                  >
                    <Globe size={11} className={useSearch ? "text-emerald-400" : ""} />
                    <span>Search</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {/* Token length budget indicator counter visible when typing */}
                  {input.trim().length > 0 && (
                    <span className="text-[10px] text-neutral-600 font-mono tracking-normal select-none pr-1">
                      {input.length} chars
                    </span>
                  )}

                  {/* Ultimate message dispatch trigger */}
                  <button
                    onClick={() => handleSendMessage()}
                    disabled={(!input.trim() && attachedFiles.length === 0) || isStreaming}
                    className={`p-1.5 rounded-xl transition-all duration-300 flex items-center justify-center ${
                      (input.trim() || attachedFiles.length > 0) && !isStreaming
                        ? "bg-neutral-100 hover:bg-white text-neutral-950 shadow-md hover:scale-[1.02] active:scale-[0.98]"
                        : "bg-white/[0.02] text-neutral-600 border border-white/[0.01]"
                    }`}
                    title="Dispatch message packet"
                  >
                    <Send size={13} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            </div>
            
            {/* Context status warning bar */}
            <div className="px-2 flex items-center justify-between text-[10px] text-neutral-600 select-none font-normal tracking-wide">
              <span className="flex items-center gap-1">
                <Info size={10} className="opacity-60" /> 
                Sandbox states refresh automatically upon window teardowns.
              </span>
              <span>Encrypted client local sandbox.</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. API Keys Encryption Manager Pop-Up Modal */}
      <AnimatePresence>
        {isKeyModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#040405]/85 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setIsKeyModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 10, opacity: 0 }}
              transition={{ type: "spring", duration: 0.4 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-[#0b0b0d] border border-white/[0.05] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Modal Banner Title Header */}
              <div className="px-5 py-4 bg-[#101013]/60 border-b border-white/[0.02] flex items-center justify-between select-none">
                <div className="flex items-center gap-2">
                  <Key size={14} className="text-zinc-400" />
                  <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-300">
                    Encrypted API Keys Vault
                  </h3>
                </div>
                <button
                  onClick={() => setIsKeyModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-white/[0.04] text-neutral-500 hover:text-neutral-200 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Secret forms content matrix area */}
              <div className="p-5 space-y-4">
                <div className="p-3 rounded-xl bg-amber-500/[0.02] border border-amber-500/10 text-neutral-400 text-[11px] leading-relaxed flex items-start gap-2.5">
                  <ShieldAlert size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
                  <p>
                    Keys are committed exclusively into client-side sandbox containers. They pass directly to standard completion tunnels and are completely isolated from storage exfiltration.
                  </p>
                </div>

                <div className="space-y-3.5">
                  {/* Google Gemini Token Field */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center justify-between">
                      <span>Google Gemini Key</span>
                      <span className="text-[9px] text-zinc-600 font-mono font-normal">GEMINI_API_KEY</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showKeyText ? "text" : "password"}
                        value={tempGoogleKey}
                        onChange={(e) => setTempGoogleKey(e.target.value)}
                        placeholder="AIzaSy..."
                        className="w-full bg-[#060607] border border-white/[0.04] focus:border-white/[0.1] rounded-xl px-3.5 py-2 text-xs font-mono text-zinc-300 focus:outline-none placeholder-zinc-700 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Anthropic Claude Token Field */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center justify-between">
                      <span>Anthropic Claude Key</span>
                      <span className="text-[9px] text-zinc-600 font-mono font-normal">ANTHROPIC_API_KEY</span>
                    </label>
                    <input
                      type={showKeyText ? "text" : "password"}
                      value={tempAnthropicKey}
                      onChange={(e) => setTempAnthropicKey(e.target.value)}
                      placeholder="sk-ant-..."
                      className="w-full bg-[#060607] border border-white/[0.04] focus:border-white/[0.1] rounded-xl px-3.5 py-2 text-xs font-mono text-zinc-300 focus:outline-none placeholder-zinc-700 transition-colors"
                    />
                  </div>

                  {/* OpenAI Token Field */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center justify-between">
                      <span>OpenAI Token Key</span>
                      <span className="text-[9px] text-zinc-600 font-mono font-normal">OPENAI_API_KEY</span>
                    </label>
                    <input
                      type={showKeyText ? "text" : "password"}
                      value={tempOpenaiKey}
                      onChange={(e) => setTempOpenaiKey(e.target.value)}
                      placeholder="sk-proj-..."
                      className="w-full bg-[#060607] border border-white/[0.04] focus:border-white/[0.1] rounded-xl px-3.5 py-2 text-xs font-mono text-zinc-300 focus:outline-none placeholder-zinc-700 transition-colors"
                    />
                  </div>

                  {/* OpenRouter Token Field */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center justify-between">
                      <span>OpenRouter Key</span>
                      <span className="text-[9px] text-zinc-600 font-mono font-normal">OPENROUTER_API_KEY</span>
                    </label>
                    <input
                      type={showKeyText ? "text" : "password"}
                      value={tempOpenrouterKey}
                      onChange={(e) => setTempOpenrouterKey(e.target.value)}
                      placeholder="sk-or-v1-..."
                      className="w-full bg-[#060607] border border-white/[0.04] focus:border-white/[0.1] rounded-xl px-3.5 py-2 text-xs font-mono text-zinc-300 focus:outline-none placeholder-zinc-700 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Control Strip Action Row */}
              <div className="px-5 py-3.5 bg-[#101013]/40 border-t border-white/[0.02] flex items-center justify-between select-none">
                <button
                  onClick={() => setShowKeyText(!showKeyText)}
                  className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 hover:text-neutral-300 transition-colors flex items-center gap-1.5 py-1 px-2"
                >
                  <Eye size={12} className="opacity-70" />
                  <span>{showKeyText ? "Obscure Secrets" : "Reveal Plaintext"}</span>
                </button>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsKeyModalOpen(false)}
                    className="py-1.5 px-3.5 rounded-xl border border-white/[0.02] hover:bg-white/[0.03] text-xs font-semibold text-neutral-400 hover:text-neutral-200 transition-all"
                  >
                    Dismiss
                  </button>
                  <button
                    onClick={() => {
                      setClientApiKey(tempGoogleKey);
                      setClientAnthropicKey(tempAnthropicKey);
                      setClientOpenaiKey(tempOpenaiKey);
                      setClientOpenrouterKey(tempOpenrouterKey);
                      setIsKeyModalOpen(false);
                      showNotification("API secrets securely synced.", "success");
                    }}
                    className="py-1.5 px-3.5 rounded-xl bg-neutral-100 hover:bg-white text-neutral-950 text-xs font-semibold shadow-md transition-all active:scale-95"
                  >
                    Save Keys
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* 4. Sleek Custom Floating Toast Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4.5 py-3.5 rounded-2xl shadow-2xl border backdrop-blur-md select-none ${
              notification.type === "success"
                ? "bg-emerald-950/80 border-emerald-500/20 text-emerald-300"
                : notification.type === "error"
                ? "bg-rose-950/80 border-rose-500/20 text-rose-300"
                : "bg-[#0c0c0e]/95 border-white/[0.04] text-neutral-300"
            }`}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${
              notification.type === "success" 
                ? "bg-emerald-400 animate-pulse" 
                : notification.type === "error" 
                ? "bg-rose-400 animate-pulse" 
                : "bg-zinc-400 animate-pulse"
            }`} />
            <span className="text-xs font-medium tracking-wide">{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}