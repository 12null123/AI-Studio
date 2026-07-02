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
  const useSearch = false;
  
  // Editing a past chat title
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  // Custom client-side API key states for multi-provider
  const [clientApiKey, setClientApiKey] = useState<string>("");
  const [clientAnthropicKey, setClientAnthropicKey] = useState<string>("");
  const [clientOpenaiKey, setClientOpenaiKey] = useState<string>("");

  const [activeProvider, setActiveProvider] = useState<"google" | "anthropic" | "openai">("google");
  const [activeModelId, setActiveModelId] = useState<string>("gemini-3.5-flash");
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);

  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [tempGoogleKey, setTempGoogleKey] = useState("");
  const [tempAnthropicKey, setTempAnthropicKey] = useState("");
  const [tempOpenaiKey, setTempOpenaiKey] = useState("");
  const [showKeyText, setShowKeyText] = useState(false);

  // Arena Mode state
  const [isArenaMode, setIsArenaMode] = useState(false);
  const [arenaProviderA, setArenaProviderA] = useState<"google" | "anthropic" | "openai">("google");
  const [arenaProviderB, setArenaProviderB] = useState<"google" | "anthropic" | "openai">("anthropic");
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

  // Get active model display name
  const getActiveModelName = () => {
    if (activeProvider === "google") {
      return useThinking ? "Gemini 3.1 Pro" : "Gemini 3.5 Flash";
    }
    if (activeProvider === "anthropic") {
      return "Claude 3.7 Sonnet";
    }
    if (activeProvider === "openai") {
      return "GPT-4o";
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
    }
  }, [isKeyModalOpen, clientApiKey, clientAnthropicKey, clientOpenaiKey]);

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
        : (clientOpenaiKey || undefined);

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
                            m.id === assistantMessageId
                              ? { ...m, content: accumulatedContent }
                              : m
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
                            m.id === assistantMessageId
                              ? { ...m, sources }
                              : m
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
        // Storage sync happens automatically via useEffect
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
          activeModelId,
          // onChunkA
          (chunk) => {
            if (chunk.text) {
              setArenaResponseA((prev) => prev + chunk.text);
            }
            if (chunk.sources) {
              setArenaSourcesA(chunk.sources);
            }
          },
          // onChunkB
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
                        content: `Error: ${err.message || "Something went wrong while connecting to the Gemini server. Ensure your GEMINI_API_KEY is configured in the Settings > Secrets menu."}`
                      }
                    : m
                )
              }
            : c
        );
        // Storage sync happens automatically via useEffect
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
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportChats}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
              
              {conversations.length === 0 ? (
                <div className="px-3 py-8 text-xs text-neutral-600 italic text-center font-medium">
                  No active threads
                </div>
              ) : (
                conversations.map((conv) => {
                  const isActive = conv.id === activeId;
                  const isEditing = conv.id === editingId;

                  return (
                    <div
                      key={conv.id}
                      onClick={() => {
                        setActiveId(conv.id);
                        if (isMobile) setIsSidebarOpen(false);
                      }}
                      className={`group relative h-10 px-3.5 mx-1 rounded-xl flex items-center gap-3 cursor-pointer text-xs transition-all ${
                        isActive
                          ? "bg-white/[0.04] border border-white/[0.03] text-white shadow-md shadow-black/20"
                          : "text-neutral-400 hover:bg-white/[0.015] hover:text-neutral-200 border border-transparent"
                      }`}
                    >
                      {isActive && (
                        <div className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-md bg-gradient-to-b from-indigo-500 to-purple-500 shadow-[0_0_8px_rgba(99,102,241,0.8)] animate-pulse" />
                      )}

                      <MessageSquare size={13.5} className={`flex-shrink-0 transition-colors ${isActive ? "text-indigo-400" : "text-neutral-500 group-hover:text-neutral-400"}`} />
                      
                      {isEditing ? (
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleRenameSave(conv.id);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          autoFocus
                          className="flex-1 bg-neutral-900/80 border border-white/[0.08] text-white text-xs px-1.5 py-0.5 rounded outline-none font-medium"
                        />
                      ) : (
                        <span className="flex-1 truncate font-medium leading-none pr-10">
                          {conv.title}
                        </span>
                      )}

                      {/* Hover action buttons */}
                      {!isEditing && (
                        <div className={`absolute right-2 opacity-0 group-hover:opacity-100 flex items-center gap-1 bg-gradient-to-l pl-4 h-full transition-all duration-150 ${
                          isActive ? "from-[#111113] to-transparent" : "from-[#0a0a0c] to-transparent"
                        }`}>
                          <button
                            onClick={(e) => startRename(conv.id, conv.title, e)}
                            className="p-1 hover:bg-white/[0.05] rounded text-neutral-400 hover:text-white transition-colors"
                            title="Rename"
                          >
                            <Edit2 size={11} />
                          </button>
                          <button
                            onClick={(e) => deleteChat(conv.id, e)}
                            className="p-1 hover:bg-white/[0.05] rounded text-neutral-400 hover:text-rose-400 transition-colors"
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

            {/* Sidebar Bottom Footer Info */}
            <div className="p-3 border-t border-white/[0.02] bg-[#08080a] flex flex-col gap-2">
              {!clientApiKey ? (
                <div className="flex items-center justify-between px-3 py-2 border border-red-900/50 bg-red-950/15 text-red-400 text-[11px] font-medium rounded-lg select-none">
                  <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    Sandbox Connection
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-red-400/80">1 Issue</span>
                </div>
              ) : (
                <div className="flex items-center justify-between px-3 py-2 border border-emerald-900/40 bg-emerald-950/10 text-emerald-400 text-[11px] font-medium rounded-lg select-none">
                  <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]" />
                    Production Active
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400/80">Verified</span>
                </div>
              )}

              <div className="flex items-center justify-between p-2 rounded-xl border border-white/[0.03] bg-white/[0.01]">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center font-bold text-white text-xs shadow-[0_0_10px_rgba(139,92,246,0.2)] flex-shrink-0 select-none">
                    G
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-neutral-200 truncate">Private Session</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]" />
                      <span className="text-[9px] text-neutral-500 font-semibold tracking-wider uppercase">Secure Link</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setIsKeyModalOpen(true)}
                  className="p-2 hover:bg-white/[0.05] text-neutral-400 hover:text-white rounded-lg transition-colors border border-white/[0.03] bg-white/[0.01]"
                  title="Configure Gemini API Key"
                >
                  <Settings size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Main Chat Workspace */}
      <div id="main-workspace" className="flex-1 flex flex-col h-full overflow-hidden relative bg-[#070709] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900/10 via-zinc-950/20 to-[#070709]">
        
        {/* Advanced Ambient Spotlight Gradients (Neon Nebula Glows) */}
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-indigo-600/5 rounded-full blur-[140px] pointer-events-none select-none z-0" />
        <div className="absolute bottom-[10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/5 rounded-full blur-[120px] pointer-events-none select-none z-0" />
        <div className="absolute top-[40%] left-[30%] w-[400px] h-[400px] bg-pink-600/3 rounded-full blur-[100px] pointer-events-none select-none z-0" />
        
        {/* Floating Sidebar Toggle when hidden */}
        {!isSidebarOpen && (
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="absolute top-4 left-4 p-2 bg-[#0d0d11]/80 hover:bg-[#161620] border border-white/[0.04] rounded-xl text-neutral-400 hover:text-white z-20 shadow-xl backdrop-blur-md transition-all duration-200 active:scale-95"
            title="Expand sidebar"
          >
            <Menu size={16} />
          </button>
        )}

        {/* Workspace Top Header */}
        <header className="h-16 px-6 flex items-center justify-between border-b border-white/[0.04] bg-[#08080a]/80 backdrop-blur-2xl z-20 select-none">
          <div className="flex items-center gap-3">
            {/* Spacer for toggle if sidebar is closed */}
            {!isSidebarOpen && <div className="w-10 h-10" />}
            
            {/* Model Display Selector */}
            <div className="relative">
              {(() => {
                const hasKey = 
                  activeProvider === 'google' ? clientApiKey : 
                  activeProvider === 'anthropic' ? clientAnthropicKey : 
                  clientOpenaiKey;
                
                // Static classes based on provider and key status
                const getBaseClasses = () => {
                  const base = 'flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-[11px] font-semibold tracking-wide cursor-pointer transition-all duration-200 active:scale-95';
                  
                  if (!hasKey) {
                    return `${base} bg-red-500/5 hover:bg-red-500/10 border-red-500/20 text-red-400 hover:text-red-300`;
                  }
                  
                  if (activeProvider === 'google') {
                    return `${base} bg-indigo-500/5 hover:bg-indigo-500/10 border-indigo-500/20 text-indigo-300 hover:text-indigo-200`;
                  } else if (activeProvider === 'anthropic') {
                    return `${base} bg-amber-500/5 hover:bg-amber-500/10 border-amber-500/20 text-amber-300 hover:text-amber-200`;
                  } else {
                    return `${base} bg-emerald-500/5 hover:bg-emerald-500/10 border-emerald-500/20 text-emerald-300 hover:text-emerald-200`;
                  }
                };

                const getStatusDotClasses = () => {
                  if (!hasKey) return 'bg-red-500';
                  if (activeProvider === 'google') return 'bg-indigo-400';
                  if (activeProvider === 'anthropic') return 'bg-amber-400';
                  return 'bg-emerald-400';
                };
                
                return (
                  <div 
                    onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                    className={getBaseClasses()}
                  >
                    <GeminiSpark className="w-3.5 h-3.5" active={isStreaming} />
                    <span>{getActiveModelName()}</span>
                    <div className={`w-1.5 h-1.5 rounded-full ${getStatusDotClasses()}`} />
                    <ChevronDown size={11} className="text-zinc-500 ml-0.5" />
                  </div>
                );
              })()}
              

              {isModelDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setIsModelDropdownOpen(false)} />
                  <div className="absolute left-0 mt-2 w-80 rounded-2xl border border-white/[0.04] bg-[#0c0c0e]/95 backdrop-blur-xl p-3 shadow-2xl z-40 select-none animate-scale-up">
                    {/* Header */}
                    <div className="px-2 py-2 mb-2">
                      <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">AI Models</h3>
                    </div>

                    {/* Providers Section */}
                    <div className="space-y-2 mb-3 pb-3 border-b border-white/[0.02]">
                      {(['google', 'anthropic', 'openai'] as const).map((provider) => {
                        const config = PROVIDER_CONFIG[provider];
                        const hasKey = 
                          provider === 'google' ? clientApiKey : 
                          provider === 'anthropic' ? clientAnthropicKey : 
                          clientOpenaiKey;
                        const isActive = activeProvider === provider;
                        
                        // Get static classes based on provider
                        const getProviderClasses = () => {
                          const base = 'px-3 py-2.5 rounded-xl border transition-all cursor-pointer';
                          const disabledClass = !hasKey ? 'opacity-50 cursor-not-allowed' : '';
                          
                          if (provider === 'google') {
                            return `${base} ${isActive ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-white/[0.02] border-white/[0.04] hover:bg-white/[0.04]'} ${disabledClass}`;
                          } else if (provider === 'anthropic') {
                            return `${base} ${isActive ? 'bg-amber-500/10 border-amber-500/30' : 'bg-white/[0.02] border-white/[0.04] hover:bg-white/[0.04]'} ${disabledClass}`;
                          } else {
                            return `${base} ${isActive ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white/[0.02] border-white/[0.04] hover:bg-white/[0.04]'} ${disabledClass}`;
                          }
                        };

                        const getDotAndTextClasses = () => {
                          if (provider === 'google') {
                            return {
                              dot: 'bg-indigo-500',
                              text: isActive ? 'text-indigo-300' : 'text-zinc-300'
                            };
                          } else if (provider === 'anthropic') {
                            return {
                              dot: 'bg-amber-500',
                              text: isActive ? 'text-amber-300' : 'text-zinc-300'
                            };
                          } else {
                            return {
                              dot: 'bg-emerald-500',
                              text: isActive ? 'text-emerald-300' : 'text-zinc-300'
                            };
                          }
                        };
                        
                        const classes = getDotAndTextClasses();
                        
                        return (
                          <div 
                            key={provider}
                            onClick={() => {
                              if (hasKey) {
                                setActiveProvider(provider);
                                const firstModel = config.models[0];
                                setActiveModelId(firstModel.id);
                                if (firstModel.supportsThinking) {
                                  setUseThinking(false);
                                }
                              }
                            }}
                            className={getProviderClasses()}
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <div className={`w-1.5 h-1.5 rounded-full ${classes.dot}`} />
                                  <span className={`text-xs font-semibold ${classes.text}`}>
                                    {config.name}
                                  </span>
                                  {hasKey ? (
                                    <div className="flex items-center gap-1 ml-auto">
                                      <div className="w-1 h-1 rounded-full bg-green-500" />
                                      <span className="text-[9px] text-green-600 font-mono">KEY</span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1 ml-auto">
                                      <div className="w-1 h-1 rounded-full bg-red-500" />
                                      <span className="text-[9px] text-red-600 font-mono">SETUP</span>
                                    </div>
                                  )}
                                </div>
                                <p className="text-[10px] text-zinc-500">{config.description}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Models Section for Active Provider */}
                    <div className="space-y-1">
                      <div className="px-2 py-1 text-[9px] font-bold text-zinc-600 uppercase tracking-widest">
                        Models
                      </div>
                      {PROVIDER_CONFIG[activeProvider].models.map((model) => {
                        const isSelected = 
                          activeProvider === model.provider && 
                          activeModelId === model.id &&
                          (model.supportsThinking ? useThinking : !useThinking);

                        const getModelClasses = () => {
                          const base = 'w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all';
                          
                          if (activeProvider === 'google') {
                            return `${base} ${isSelected ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/20' : 'text-zinc-400 hover:text-zinc-300 hover:bg-white/[0.02] border border-transparent'}`;
                          } else if (activeProvider === 'anthropic') {
                            return `${base} ${isSelected ? 'bg-amber-500/15 text-amber-300 border border-amber-500/20' : 'text-zinc-400 hover:text-zinc-300 hover:bg-white/[0.02] border border-transparent'}`;
                          } else {
                            return `${base} ${isSelected ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20' : 'text-zinc-400 hover:text-zinc-300 hover:bg-white/[0.02] border border-transparent'}`;
                          }
                        };

                        const getDotClasses = () => {
                          if (activeProvider === 'google') {
                            return isSelected ? 'bg-indigo-400' : 'bg-transparent';
                          } else if (activeProvider === 'anthropic') {
                            return isSelected ? 'bg-amber-400' : 'bg-transparent';
                          } else {
                            return isSelected ? 'bg-emerald-400' : 'bg-transparent';
                          }
                        };

                        return (
                          <button
                            key={model.id}
                            onClick={() => {
                              setActiveModelId(model.id);
                              if (model.supportsThinking) {
                                setUseThinking(false);
                              }
                              setIsModelDropdownOpen(false);
                            }}
                            className={getModelClasses()}
                          >
                            <div className="flex items-center gap-2">
                              <div className={`w-1.5 h-1.5 rounded-full ${getDotClasses()}`} />
                              <div className="text-left">
                                <div>{model.name}</div>
                                {model.capabilities && (
                                  <div className="text-[9px] text-zinc-600">
                                    {model.capabilities.join(' • ')}
                                  </div>
                                )}
                              </div>
                            </div>
                            <span className={`text-[9px] font-mono opacity-60 ${isSelected ? 'opacity-100' : ''}`}>
                              {Math.round(model.contextWindow / 1000)}K
                            </span>
                          </button>
                        );
                      })}

                      {/* Thinking Mode Toggle for Google */}
                      {activeProvider === 'google' && (
                        <div className="mt-3 pt-2 border-t border-white/[0.02]">
                          <label className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/[0.02] cursor-pointer transition-all">
                            <input
                              type="checkbox"
                              checked={useThinking}
                              onChange={(e) => {
                                setUseThinking(e.target.checked);
                                if (e.target.checked) {
                                  setActiveModelId("gemini-3.1-pro-preview");
                                } else {
                                  setActiveModelId("gemini-3.5-flash");
                                }
                              }}
                              className="w-3.5 h-3.5 rounded border-zinc-600 text-indigo-500 focus:ring-0 cursor-pointer"
                            />
                            <span className="text-xs text-zinc-300 font-medium">Extended Thinking</span>
                            <span className="text-[9px] text-zinc-600 ml-auto">Slow but Deep</span>
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Grounding & Thinking State indicator lamps */}
            <div className="hidden sm:flex items-center gap-2">
              {activeProvider === "google" ? (
                <button
                  onClick={() => {
                    const newThinking = !useThinking;
                    setUseThinking(newThinking);
                    if (newThinking) {
                      setActiveModelId("gemini-3.1-pro-preview");
                    } else {
                      setActiveModelId("gemini-3.5-flash");
                    }
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all border ${
                    useThinking
                      ? "bg-purple-950/20 border-purple-500/20 text-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.08)]"
                      : "bg-white/[0.015] border-white/[0.03] text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]"
                  }`}
                  title="Toggle Deep Thinking Mode (Gemini 3.1 Pro)"
                >
                  <Sparkles size={11} className={useThinking ? "text-purple-400" : ""} />
                  <span>Thinking</span>
                </button>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border border-white/[0.03] bg-white/[0.015] text-zinc-500">
                  <span>BYOK Active</span>
                </div>
              )}
            </div>

            <button
              onClick={() => setIsArenaMode(!isArenaMode)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all border ${
                isArenaMode
                  ? "bg-indigo-950/30 border-indigo-500/30 text-indigo-300 shadow-[0_0_12px_rgba(99,102,241,0.1)]"
                  : "bg-white/[0.015] border-white/[0.03] text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]"
              }`}
              title="Toggle Arena Mode (Compare Models)"
            >
              <span>Arena</span>
            </button>

            <div className="w-7 h-7 rounded-full bg-zinc-900 border border-white/[0.08] flex items-center justify-center font-bold text-zinc-400 text-[10px] select-none shadow-sm">
              P
            </div>
          </div>
        </header>

        {/* Arena Mode Header */}
        {isArenaMode && (
          <ArenaHeader
            isOpen={isArenaMode}
            onToggle={setIsArenaMode}
            providerA={arenaProviderA}
            providerB={arenaProviderB}
            onProviderAChange={setArenaProviderA}
            onProviderBChange={setArenaProviderB}
            streamingA={arenaStreamingA}
            streamingB={arenaStreamingB}
          />
        )}

        {/* Arena Panes */}
        {isArenaMode && (arenaResponseA || arenaResponseB || arenaStreamingA || arenaStreamingB) && (
          <ArenaPanes
            providerA={arenaProviderA}
            providerB={arenaProviderB}
            responseA={arenaResponseA}
            responseB={arenaResponseB}
            streamingA={arenaStreamingA}
            streamingB={arenaStreamingB}
            sourcesA={arenaSourcesA}
            sourcesB={arenaSourcesB}
          />
        )}

        {/* Chat Scrolling Area */}
        <main className="flex-1 overflow-y-auto py-6 z-10 scrollbar-thin scrollbar-thumb-white/[0.02]">
          <div className="max-w-3xl mx-auto w-full h-full flex flex-col justify-between px-6">
            
            {/* If no active conversation or no messages, show Bento landing welcome page */}
            {!activeConversation || activeConversation.messages.length === 0 ? (
              <div className="my-auto flex flex-col items-start pt-10 pb-24 w-full animate-fade-in z-10">
                
                 {/* Greeting */}
                <div className="mb-10 select-none">
                  <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-500 block mb-2">
                    Initialize Session
                  </span>
                  <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight leading-tight bg-gradient-to-b from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent">
                    Workspace Console
                  </h1>
                </div>

                {/* Suggested Prompts Bento Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 w-full mt-2">
                  {suggestedPrompts.map((p, idx) => (
                    <motion.div
                      key={idx}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => handleSendMessage(p.category + " " + p.text)}
                      className="bg-transparent border-b border-white/[0.04] hover:border-zinc-700/50 py-5 cursor-pointer flex flex-col justify-between min-h-[120px] transition-all duration-300 group rounded-none"
                    >
                      <p className="text-sm font-medium text-zinc-300 leading-relaxed tracking-tight group-hover:text-white transition-colors duration-300">
                        <span className="text-zinc-500 group-hover:text-zinc-400 font-bold block text-[10px] uppercase tracking-widest mb-2 transition-colors duration-300">
                          {p.category}
                        </span>
                        {p.text}
                      </p>
                      <div className="flex justify-end mt-2">
                        <div className="text-zinc-500 group-hover:text-zinc-300 group-hover:translate-x-0.5 transition-all duration-300">
                          {p.icon}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Extra Guidance */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-10 mx-auto w-full">
                  <button
                    onClick={() => setIsKeyModalOpen(true)}
                    className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-full border transition-all duration-300 ${
                      clientApiKey 
                        ? "bg-emerald-950/20 border-emerald-500/20 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.05)]" 
                        : "bg-white/[0.01] border-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/[0.03]"
                    }`}
                  >
                    <Key size={10} />
                    <span>{clientApiKey ? "Key configured" : "Configure Key"}</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Message Thread List */
              <div className="space-y-8 pb-32">
                {activeConversation.messages.map((m) => {
                  const isUser = m.role === "user";

                  return (
                    <div
                      key={m.id}
                      className={`flex gap-4 sm:gap-6 items-start ${
                        isUser ? "justify-end" : "justify-start"
                      } animate-fade-in`}
                    >
                      {/* Left icon wrapper for AI messages */}
                      {!isUser && (
                        <div className="w-7 h-7 rounded-lg bg-[#08080a] border border-white/[0.04] flex items-center justify-center flex-shrink-0 shadow-sm">
                          <GeminiSpark className="w-3.5 h-3.5 text-zinc-400" mono={true} active={isStreaming} />
                        </div>
                      )}

                      <div
                        className={`flex flex-col max-w-[85%] ${
                          isUser ? "items-end" : "items-start"
                        }`}
                      >
                        {/* Message content box */}
                        <div
                          className={`text-[14px] leading-relaxed ${
                            isUser
                              ? "text-zinc-100 font-medium tracking-tight text-right leading-relaxed max-w-xl"
                              : m.content && m.content.startsWith("Error:")
                              ? "w-full"
                              : "text-zinc-300"
                          }`}
                        >
                          {isUser ? (
                            <div className="space-y-3">
                              {getPromptTextOnly(m.content) ? (
                                <p className="whitespace-pre-wrap">{getPromptTextOnly(m.content)}</p>
                              ) : (
                                <p className="text-xs text-neutral-500 italic font-medium">Sent attached document(s)</p>
                              )}
                              {m.files && m.files.length > 0 && (
                                <div className="flex flex-col gap-2 mt-3 items-end">
                                  {m.files.map((file, idx) => (
                                    <div
                                      key={file.id || idx}
                                      className="flex items-center gap-3 bg-[#0a0a0d] border border-white/[0.04] rounded-xl p-2.5 w-64 transition-all hover:border-white/[0.08]"
                                    >
                                      <div className="w-8 h-8 rounded-lg bg-zinc-900 text-zinc-400 flex items-center justify-center flex-shrink-0 border border-white/[0.04]">
                                        <FileText size={14} />
                                      </div>
                                      <div className="min-w-0 flex-1 text-left">
                                        <p className="text-xs font-bold text-zinc-200 truncate" title={file.name}>
                                          {file.name}
                                        </p>
                                        <p className="text-[9px] text-zinc-500 font-mono">
                                          {formatFileSize(file.size)}
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : m.content && m.content.startsWith("Error:") ? (
                            /* Premium structural console-style banner for error states */
                            <div className="bg-zinc-900/40 border border-red-500/20 backdrop-blur-md rounded-xl p-4 text-xs text-zinc-400 max-w-xl mx-auto text-center font-mono leading-relaxed tracking-wide shadow-inner select-none animate-fade-in my-2">
                              <span className="text-red-400 font-bold uppercase tracking-wider block mb-1">SYSTEM ALERT</span>
                              {m.content.substring(6).trim()}
                            </div>
                          ) : (
                            /* Render Markdown for Assistant */
                            <div className={`prose prose-invert prose-sm max-w-none space-y-3 ${
                              isStreaming && activeConversation && activeConversation.messages[activeConversation.messages.length - 1]?.id === m.id
                                ? "streaming-active-container"
                                : ""
                            }`}>
                              {m.content ? (
                                <ReactMarkdown
                                  components={{
                                    p: ({ children }) => <p className="mb-4 leading-relaxed text-neutral-300 font-medium tracking-tight">{children}</p>,
                                    ol: ({ children }) => <ol className="list-decimal pl-6 mb-4 space-y-1.5 text-neutral-300 font-medium">{children}</ol>,
                                    ul: ({ children }) => <ul className="list-disc pl-6 mb-4 space-y-1.5 text-neutral-300 font-medium">{children}</ul>,
                                    li: ({ children }) => <li className="text-neutral-300 mb-1 leading-relaxed">{children}</li>,
                                    h1: ({ children }) => <h1 className="text-lg font-bold mt-6 mb-2.5 text-white tracking-tight">{children}</h1>,
                                    h2: ({ children }) => <h2 className="text-md font-bold mt-5 mb-2 text-white tracking-tight">{children}</h2>,
                                    h3: ({ children }) => <h3 className="text-sm font-semibold mt-4 mb-1 text-white tracking-tight">{children}</h3>,
                                    a: ({ href, children }) => (
                                      <a href={href} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-350 hover:underline inline-flex items-center gap-0.5 font-bold transition-colors">
                                        {children} <ExternalLink size={9} />
                                      </a>
                                    ),
                                    code: ({ className, children, ...props }: any) => {
                                      const match = /language-(\w+)/.exec(className || '');
                                      const codeContent = String(children).replace(/\n$/, '');
                                      const isBlock = match || codeContent.includes('\n');
                                      if (isBlock) {
                                        return <CodeBlock language={match ? match[1] : 'code'} value={codeContent} />;
                                      }
                                      return (
                                        <code className="bg-[#0f0f11] text-indigo-300 px-1.5 py-0.5 rounded text-[12px] font-mono border border-white/[0.04]" {...props}>
                                          {children}
                                        </code>
                                      );
                                    }
                                  }}
                                >
                                  {m.content}
                                </ReactMarkdown>
                              ) : (
                                /* High-status weightless skeleton loader for the absolute beginning of stream */
                                <div className="space-y-3 py-1 select-none animate-pulse max-w-lg">
                                  <div className="flex items-center gap-2 mb-4">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500/80 animate-ping"></div>
                                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-400 bg-indigo-950/30 px-2.5 py-1 rounded-md border border-indigo-800/20">
                                      Synthesizing
                                    </span>
                                  </div>
                                  <div className="h-3 bg-zinc-800/40 border border-white/[0.02] rounded-lg w-11/12"></div>
                                  <div className="h-3 bg-zinc-800/40 border border-white/[0.02] rounded-lg w-4/5"></div>
                                  <div className="h-3 bg-zinc-800/40 border border-white/[0.02] rounded-lg w-3/5"></div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Grounding sources citation chips */}
                        {!isUser && m.sources && m.sources.length > 0 && (
                          <div className="mt-4 border-t border-white/[0.02] pt-3 w-full">
                            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block mb-2.5 flex items-center gap-1.5">
                              <Globe size={11} className="text-indigo-400" /> Grounding Sources
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {m.sources.map((s, idx) => (
                                <a
                                  key={idx}
                                  href={s.uri}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 bg-[#0a0a0c]/80 hover:bg-[#121215]/90 border border-white/[0.03] hover:border-white/[0.08] px-3 py-1.5 rounded-xl text-xs font-medium text-neutral-300 transition-all duration-200"
                                >
                                  <Globe size={10} className="text-neutral-500" />
                                  <span className="max-w-[150px] truncate">{s.title || s.uri}</span>
                                  <ExternalLink size={8} className="text-neutral-500" />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Right icon wrapper for user messages */}
                      {isUser && (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-500 via-purple-500 to-indigo-600 flex items-center justify-center font-bold text-white text-[11px] shadow-lg shadow-purple-500/10 flex-shrink-0 select-none">
                          G
                        </div>
                      )}
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </main>

        {/* Bottom dock container for auto-expanding input box */}
        <div id="input-container" className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#070709] via-[#070709]/95 to-transparent pt-12 pb-6 z-10">
          <div className="max-w-3xl mx-auto w-full px-6">
            
            {/* Input Bar Card */}
            <div className="bg-[#0c0c0f] border border-white/[0.04] rounded-2xl p-5 pb-4 flex flex-col gap-2 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] shadow-[0_-8px_30px_rgba(0,0,0,0.5),_0_16px_40px_rgba(0,0,0,0.7)] hover:border-white/[0.07] focus-within:border-zinc-700/40 focus-within:ring-1 focus-within:ring-white/[0.01]">
              
              {/* Attached files preview container */}
              {attachedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 px-3 pt-2 pb-1 border-b border-white/[0.03]">
                  {attachedFiles.map((file) => (
                    <div
                       key={file.id}
                       className="flex items-center gap-2 bg-black/40 border border-white/[0.02] rounded-xl px-3 py-1.5 text-xs text-neutral-300 max-w-[240px] animate-fade-in"
                     >
                       <FileText size={13} className="text-indigo-400 flex-shrink-0" />
                       <div className="min-w-0 flex-1">
                         <p className="font-semibold truncate text-[11px]" title={file.name}>
                           {file.name}
                         </p>
                         <p className="text-[9px] text-neutral-500 font-mono">
                           {formatFileSize(file.size)}
                         </p>
                       </div>
                       <button
                         type="button"
                         onClick={() => {
                           setAttachedFiles((prev) => prev.filter((f) => f.id !== file.id));
                         }}
                         className="p-1 hover:bg-white/[0.05] text-neutral-500 hover:text-neutral-300 rounded-md transition-colors"
                         title="Remove attachment"
                       >
                         <X size={11} />
                       </button>
                     </div>
                   ))}
                 </div>
               )}
 
                {/* Inner Expanding Textarea */}
               <div className="flex items-start px-2 pt-1.5">
                 <textarea
                   ref={textareaRef}
                   rows={1}
                   value={input}
                   onChange={(e) => setInput(e.target.value)}
                   onKeyDown={handleKeyDown}
                   onPaste={handlePaste}
                   placeholder={activeProvider === "google" ? (useThinking ? "Ask Gemini 3.1 Pro (Thinking Mode Enabled)..." : "Ask Gemini 3.5 Flash...") : activeProvider === "anthropic" ? "Ask Claude 3.7 Sonnet..." : "Ask GPT-4o..."}
                    data-dummy={
                     useThinking 
                       ? "Ask Gemini 3.1 Pro (Thinking Mode Enabled)..." 
                       : "Ask Gemini 3.5 Flash..."
                   }
                   className="flex-1 bg-transparent border-0 resize-none outline-none text-neutral-200 text-sm py-1 placeholder-neutral-650 min-h-[24px] max-h-[200px] leading-relaxed"
                 />
               </div>
 
               {/* Action Toolbar Inside Input Bar */}
               <div className="flex items-center justify-between px-1.5 pt-3 pb-1">
                 <div className="flex items-center gap-1">
                   
                   {/* File Upload / Attachment Button */}
                   <label
                     className="p-2 rounded-full text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-200 transition-all flex items-center justify-center cursor-pointer active:scale-95"
                     title="Attach text or code file (.txt, .js, .ts, etc.)"
                   >
                     <Paperclip size={14} />
                     <input
                       type="file"
                       accept=".txt,.js,.jsx,.ts,.tsx,.json,.css,.html,.md,.py,.java,.cpp,.c,.rs,.sh,.yml,.yaml"
                       onChange={handleFileUpload}
                       className="hidden"
                     />
                   </label>
 
                    {/* Thinking Mode Switch Button */}
                   <button
                     onClick={() => {
                       setUseThinking(!useThinking);
                     }}
                     className={`p-2 rounded-full transition-all flex items-center justify-center active:scale-95 ${
                       useThinking
                         ? "bg-purple-950/40 text-purple-300 border border-purple-800/40 shadow-[0_0_8px_rgba(168,85,247,0.1)]"
                         : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-200"
                     }`}
                     title="Thinking Mode (Gemini 3.1 Pro)"
                   >
                     <Sparkles size={14} />
                   </button>
                   <button
                     onClick={() => setIsKeyModalOpen(true)}
                     className={`p-2 rounded-full transition-all flex items-center justify-center active:scale-95 ${
                       (activeProvider === "google" ? clientApiKey : activeProvider === "anthropic" ? clientAnthropicKey : clientOpenaiKey)
                         ? "text-emerald-400 hover:bg-white/[0.04] bg-emerald-500/5 border border-emerald-500/10"
                         : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-200"
                     }`}
                     title="Configure Encryption Key Vault"
                   >
                     <Key size={14} />
                   </button>
                   <button className="hidden">
                   </button>

                  {/* Feature Active Badges */}
                  {useThinking && (
                    <div className="hidden sm:flex items-center gap-1 pl-1">
                      <span className="text-[9px] font-bold text-purple-400 bg-purple-950/20 border border-purple-800/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        Thinking Mode
                      </span>
                    </div>
                  )}

                  {/* Draft Saved Locally Badge */}
                  {input.trim() && activeId && (
                    <div className="flex items-center gap-1.5 pl-2 text-zinc-500 font-mono text-[10px] tracking-wide select-none animate-fade-in">
                      <div className="w-1 h-1 rounded-full bg-emerald-500/80 animate-pulse" />
                      <span>Draft saved locally</span>
                    </div>
                  )}
                </div>

                {/* Send Message Button */}
                <button
                  onClick={() => handleSendMessage()}
                  disabled={(!input.trim() && attachedFiles.length === 0) || isStreaming}
                  className={`p-2.5 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95 ${
                    (input.trim() || attachedFiles.length > 0) && !isStreaming
                      ? "bg-white text-[#070709] hover:bg-neutral-100 hover:shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                      : "text-neutral-600 bg-white/[0.02] cursor-not-allowed"
                  }`}
                  title="Send message"
                >
                  <Send size={14} />
                </button>
              </div>
            </div>

            {/* Disclaimer disclaimer text */}
            <p className="text-[10px] text-zinc-650/30 text-center mt-3.5 select-none font-medium tracking-wide">
              Gemini can make mistakes. Please verify critical details.
            </p>
          </div>
        </div>

      </div>

      {/* 3. API Key Configuration Modal */}
      <AnimatePresence>
        {isKeyModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 select-none"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="bg-[#0c0c0e]/95 border border-white/[0.04] rounded-3xl p-6 max-w-2xl w-full shadow-[0_24px_50px_rgba(0,0,0,0.8)] relative overflow-hidden backdrop-blur-2xl max-h-[85vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="mb-6">
                <div className="flex items-start gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/[0.05] flex items-center justify-center text-indigo-400 flex-shrink-0">
                    <Key size={16} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white tracking-tight">Manage API Keys</h3>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      Keys are encrypted locally in your browser and never sent to our servers
                    </p>
                  </div>
                </div>
              </div>

              {/* Provider Cards */}
              <div className="grid grid-cols-1 gap-4 mb-6">
                {/* Google */}
                {(() => {
                  const hasKey = clientApiKey.length > 0;
                  const isModified = tempGoogleKey !== clientApiKey && tempGoogleKey.trim() !== "";
                  
                  const getStatusColor = () => {
                    if (isModified) return 'indigo-600';
                    if (hasKey) return 'indigo-500/30';
                    return 'white/5';
                  };
                  
                  const getStatusBorder = () => {
                    if (isModified) return 'border-indigo-500/50';
                    if (hasKey) return 'border-indigo-500/20';
                    return 'border-white/10';
                  };
                  
                  return (
                    <div className={`bg-${getStatusColor()} border ${getStatusBorder()} rounded-2xl p-4 transition-all`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-indigo-400" />
                          <div>
                            <h4 className="text-sm font-semibold text-indigo-300">Google Gemini</h4>
                            <p className="text-[10px] text-zinc-500">Fast & versatile models</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {hasKey && <div className="w-1.5 h-1.5 rounded-full bg-green-500" />}
                          <a
                            href="https://aistudio.google.com/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[9px] text-indigo-400 hover:text-indigo-300 transition-colors inline-flex items-center gap-1"
                          >
                            Get Key <ExternalLink size={8} />
                          </a>
                        </div>
                      </div>
                      <input
                        type={showKeyText ? "text" : "password"}
                        value={tempGoogleKey}
                        onChange={(e) => setTempGoogleKey(e.target.value)}
                        onBlur={(e) => setTempGoogleKey(e.target.value.trim())}
                        placeholder="AIzaSy..."
                        className="w-full bg-[#070709]/50 border border-white/[0.08] focus:border-indigo-500/50 focus:bg-white/[0.02] rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 outline-none font-mono transition-all"
                      />
                    </div>
                  );
                })()}

                {/* Anthropic */}
                {(() => {
                  const hasKey = clientAnthropicKey.length > 0;
                  const isModified = tempAnthropicKey !== clientAnthropicKey && tempAnthropicKey.trim() !== "";
                  
                  const getStatusColor = () => {
                    if (isModified) return 'amber-600';
                    if (hasKey) return 'amber-500/30';
                    return 'white/5';
                  };
                  
                  const getStatusBorder = () => {
                    if (isModified) return 'border-amber-500/50';
                    if (hasKey) return 'border-amber-500/20';
                    return 'border-white/10';
                  };
                  
                  return (
                    <div className={`bg-${getStatusColor()} border ${getStatusBorder()} rounded-2xl p-4 transition-all`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-amber-400" />
                          <div>
                            <h4 className="text-sm font-semibold text-amber-300">Anthropic Claude</h4>
                            <p className="text-[10px] text-zinc-500">Thoughtful reasoning (BYOK)</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {hasKey && <div className="w-1.5 h-1.5 rounded-full bg-green-500" />}
                          <a
                            href="https://console.anthropic.com/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[9px] text-amber-400 hover:text-amber-300 transition-colors inline-flex items-center gap-1"
                          >
                            Get Key <ExternalLink size={8} />
                          </a>
                        </div>
                      </div>
                      <input
                        type={showKeyText ? "text" : "password"}
                        value={tempAnthropicKey}
                        onChange={(e) => setTempAnthropicKey(e.target.value)}
                        onBlur={(e) => setTempAnthropicKey(e.target.value.trim())}
                        placeholder="sk-ant-..."
                        className="w-full bg-[#070709]/50 border border-white/[0.08] focus:border-amber-500/50 focus:bg-white/[0.02] rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 outline-none font-mono transition-all"
                      />
                    </div>
                  );
                })()}

                {/* OpenAI */}
                {(() => {
                  const hasKey = clientOpenaiKey.length > 0;
                  const isModified = tempOpenaiKey !== clientOpenaiKey && tempOpenaiKey.trim() !== "";
                  
                  const getStatusColor = () => {
                    if (isModified) return 'emerald-600';
                    if (hasKey) return 'emerald-500/30';
                    return 'white/5';
                  };
                  
                  const getStatusBorder = () => {
                    if (isModified) return 'border-emerald-500/50';
                    if (hasKey) return 'border-emerald-500/20';
                    return 'border-white/10';
                  };
                  
                  return (
                    <div className={`bg-${getStatusColor()} border ${getStatusBorder()} rounded-2xl p-4 transition-all`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-400" />
                          <div>
                            <h4 className="text-sm font-semibold text-emerald-300">OpenAI GPT</h4>
                            <p className="text-[10px] text-zinc-500">Powerful & multimodal (BYOK)</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {hasKey && <div className="w-1.5 h-1.5 rounded-full bg-green-500" />}
                          <a
                            href="https://platform.openai.com/api-keys"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[9px] text-emerald-400 hover:text-emerald-300 transition-colors inline-flex items-center gap-1"
                          >
                            Get Key <ExternalLink size={8} />
                          </a>
                        </div>
                      </div>
                      <input
                        type={showKeyText ? "text" : "password"}
                        value={tempOpenaiKey}
                        onChange={(e) => setTempOpenaiKey(e.target.value)}
                        onBlur={(e) => setTempOpenaiKey(e.target.value.trim())}
                        placeholder="sk-..."
                        className="w-full bg-[#070709]/50 border border-white/[0.08] focus:border-emerald-500/50 focus:bg-white/[0.02] rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 outline-none font-mono transition-all"
                      />
                    </div>
                  );
                })()}
              </div>

              {/* Footer */}
              <div className="border-t border-white/[0.05] pt-4">
                <div className="flex items-center justify-between mb-4">
                  <button
                    type="button"
                    onClick={() => setShowKeyText(!showKeyText)}
                    className="text-zinc-500 hover:text-zinc-300 text-[9px] font-bold tracking-wider uppercase flex items-center gap-1.5 transition-colors"
                  >
                    <Eye size={12} />
                    <span>{showKeyText ? "Hide Keys" : "Show Keys"}</span>
                  </button>
                  <span className="text-[9px] text-zinc-600 font-mono">🔐 Encrypted locally</span>
                </div>

                <div className="flex items-center justify-end gap-3">
                  <button
                    onClick={() => setIsKeyModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      // Update state first
                      setClientApiKey(tempGoogleKey.trim());
                      setClientAnthropicKey(tempAnthropicKey.trim());
                      setClientOpenaiKey(tempOpenaiKey.trim());

                      // Storage sync happens automatically via useEffect hooks
                      // but we explicitly sync here for immediate feedback
                      try {
                        if (tempGoogleKey.trim()) {
                          await storageManager.setCredential(AIProvider.GOOGLE, tempGoogleKey.trim());
                        } else {
                          await storageManager.removeCredential(AIProvider.GOOGLE);
                        }

                        if (tempAnthropicKey.trim()) {
                          await storageManager.setCredential(AIProvider.ANTHROPIC, tempAnthropicKey.trim());
                        } else {
                          await storageManager.removeCredential(AIProvider.ANTHROPIC);
                        }

                        if (tempOpenaiKey.trim()) {
                          await storageManager.setCredential(AIProvider.OPENAI, tempOpenaiKey.trim());
                        } else {
                          await storageManager.removeCredential(AIProvider.OPENAI);
                        }
                      } catch (error) {
                        console.error("[v0] Failed to save keys:", error);
                        showNotification("Failed to save vault", "error");
                        return;
                      }

                      setIsKeyModalOpen(false);
                      showNotification("Vault saved securely!", "success");
                    }}
                    className="px-5 py-2 bg-white hover:bg-gray-100 text-zinc-900 font-bold text-xs rounded-lg transition-all shadow-md active:scale-95"
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
                : "bg-indigo-400 animate-pulse"
            }`} />
            <span className="text-xs font-bold tracking-tight">{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
