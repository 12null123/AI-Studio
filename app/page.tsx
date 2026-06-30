"use client";

import * as React from "react";
import { useState, useEffect, useRef } from "react";
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
  Upload
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
function GeminiSpark({ className = "w-6 h-6", active = false }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} ${active ? 'animate-pulse' : ''}`} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="gemini-spark-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7a9efd" />
          <stop offset="35%" stopColor="#a374fc" />
          <stop offset="70%" stopColor="#f559aa" />
          <stop offset="100%" stopColor="#ff9a62" />
        </linearGradient>
      </defs>
      <path
        fill="url(#gemini-spark-grad)"
        d="M12 2C12 2 12.3 8.7 13 9.4C13.7 10.1 20.4 10.4 20.4 10.4C20.4 10.4 13.7 10.7 13 11.4C12.3 12.1 12 18.8 12 18.8C12 18.8 11.7 12.1 11 11.4C10.3 10.7 3.6 10.4 3.6 10.4C3.6 10.4 10.3 10.7 11 9.4C11.7 8.7 12 2 12 2Z"
      />
      <path
        fill="url(#gemini-spark-grad)"
        d="M19 4C19 4 19.15 6.65 19.4 6.9C19.65 7.15 22.3 7.3 22.3 7.3C22.3 7.3 19.65 7.45 19.4 7.7C19.15 7.95 19 10.6 19 10.6C19 10.6 18.85 7.95 18.6 7.7C18.35 7.45 15.7 7.3 15.7 7.3C15.7 7.3 18.35 7.15 18.6 6.9C18.85 6.65 19 4 19 4Z"
        opacity="0.8"
      />
    </svg>
  );
}

// CodeBlock helper
function CodeBlock({ language, value }: { language: string; value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-4 rounded-xl border border-neutral-800 bg-[#0e0e10] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-[#1e1f20] border-b border-neutral-800 text-xs font-mono text-neutral-400">
        <span>{language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 hover:text-white transition-colors"
        >
          {copied ? (
            <>
              <Check size={14} className="text-emerald-400" />
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy size={14} />
              <span>Copy code</span>
            </>
          )}
        </button>
      </div>
      <div className="p-4 overflow-x-auto font-mono text-sm text-neutral-200 leading-6">
        <pre><code>{value}</code></pre>
      </div>
    </div>
  );
}

export default function Home() {
  const isMobile = useIsMobile();
  
  // State
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("gemini_wrapper_chats");
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse localstorage conversations on init:", e);
      }
    }
    return [];
  });

  const [activeId, setActiveId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const savedActiveId = localStorage.getItem("gemini_active_chat_id");
      if (savedActiveId) return savedActiveId;
      try {
        const saved = localStorage.getItem("gemini_wrapper_chats");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.length > 0) return parsed[0].id;
        }
      } catch {}
    }
    return "";
  });

  const [input, setInput] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);
  
  // Quick settings toggles (applies to the next prompt)
  const [useThinking, setUseThinking] = useState(false);
  const [useSearch, setUseSearch] = useState(false);
  
  // Editing a past chat title
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  // Custom client-side Gemini API key state
  const [clientApiKey, setClientApiKey] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("gemini_client_api_key") || "";
    }
    return "";
  });
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [tempApiKey, setTempApiKey] = useState("");
  const [showKeyText, setShowKeyText] = useState(false);

  // Floating toast notification state
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const showNotification = (message: string, type: "success" | "error" | "info" = "success") => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Sync tempApiKey when modal opens or key loads
  useEffect(() => {
    if (isKeyModalOpen) {
      setTempApiKey(clientApiKey);
    }
  }, [isKeyModalOpen, clientApiKey]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Suggested starter prompts
  const suggestedPrompts = [
    {
      category: "Help me write",
      text: "a professional email explaining a delayed deployment",
      icon: <Sparkles className="w-4 h-4 text-pink-400" />
    },
    {
      category: "Brainstorm ideas",
      text: "for a sleek Next.js portfolio website layout",
      icon: <Globe className="w-4 h-4 text-blue-400" />
    },
    {
      category: "Explain concepts",
      text: "quantum computing in simple analogies for a 5-year-old",
      icon: <HelpCircle className="w-4 h-4 text-emerald-400" />
    },
    {
      category: "Debug my code",
      text: "analyze and optimize a React useEffect loop",
      icon: <Search className="w-4 h-4 text-amber-400" />
    }
  ];

  // Auto-sync conversations changes to localStorage
  useEffect(() => {
    localStorage.setItem("gemini_wrapper_chats", JSON.stringify(conversations));
  }, [conversations]);

  // Auto-sync activeId changes to localStorage
  useEffect(() => {
    if (activeId) {
      localStorage.setItem("gemini_active_chat_id", activeId);
    } else {
      localStorage.removeItem("gemini_active_chat_id");
    }
  }, [activeId]);

  // Auto-sync clientApiKey changes to localStorage
  useEffect(() => {
    if (clientApiKey) {
      localStorage.setItem("gemini_client_api_key", clientApiKey);
    } else {
      localStorage.removeItem("gemini_client_api_key");
    }
  }, [clientApiKey]);

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
    if (!promptText || isStreaming) return;

    // Reset standard input
    if (!customPrompt) setInput("");

    let currentConv = activeConversation;
    // Create new chat if none exists or active conversation has been deleted
    if (!currentConv || !activeId) {
      const generatedTitle = promptText.length > 24 ? promptText.substring(0, 24) + "..." : promptText;
      currentConv = createNewChat(generatedTitle);
    }

    // Add user message to state
    const userMessage: Message = {
      id: Math.random().toString(36).substring(7),
      role: "user",
      content: promptText,
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
      updatedConv.title = promptText.length > 24 ? promptText.substring(0, 24) + "..." : promptText;
    }

    const nextConversations = conversations.map((c) =>
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
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages,
          useThinking,
          useSearch,
          clientApiKey: clientApiKey || undefined
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (errorData.isKeyMissing) {
          setIsKeyModalOpen(true);
        }
        throw new Error(errorData.error || "Failed to fetch response from Gemini.");
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
        localStorage.setItem("gemini_wrapper_chats", JSON.stringify(final));
        return final;
      });

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
        localStorage.setItem("gemini_wrapper_chats", JSON.stringify(final));
        return final;
      });
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
    <div id="app-root" className="flex h-screen w-screen overflow-hidden bg-[#131314] text-neutral-200 font-sans">
      
      {/* 1. Collapsible Sidebar */}
      <AnimatePresence initial={false}>
        {isSidebarOpen && (
          <motion.div
            id="sidebar-panel"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: isMobile ? "100%" : 288, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className={`flex-shrink-0 h-full bg-[#1e1f20] border-r border-neutral-800/50 flex flex-col z-30 ${
              isMobile ? "absolute inset-y-0 left-0" : "relative"
            }`}
          >
            {/* Sidebar Header */}
            <div className="h-16 px-4 flex items-center justify-between">
              <span className="text-sm font-semibold tracking-wide text-neutral-300 flex items-center gap-2">
                <GeminiSpark className="w-5 h-5" /> Gemini Wrapper
              </span>
              
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="p-1.5 hover:bg-neutral-800 rounded-lg transition-colors text-neutral-400 hover:text-white"
                title="Collapse sidebar"
              >
                <ChevronLeft size={18} />
              </button>
            </div>

            {/* New Chat Button */}
            <div className="px-3 mb-4">
              <button
                onClick={() => {
                  createNewChat();
                  if (isMobile) setIsSidebarOpen(false);
                }}
                className="w-full h-11 bg-neutral-800 hover:bg-neutral-700/80 border border-neutral-700/30 rounded-xl flex items-center justify-center gap-2 text-sm font-medium text-neutral-200 transition-all shadow-sm"
              >
                <Plus size={16} />
                <span>New Chat</span>
              </button>
            </div>

            {/* Past Chats Scroll Container */}
            <div className="flex-1 overflow-y-auto px-2 space-y-1">
              <div className="flex items-center justify-between px-2 mb-2">
                <span className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold">
                  Recent Chats
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={exportChats}
                    className="p-1 hover:bg-neutral-800 text-neutral-500 hover:text-neutral-300 rounded-md transition-colors"
                    title="Export Backup (.json)"
                  >
                    <Download size={11} />
                  </button>
                  <label
                    className="p-1 hover:bg-neutral-800 text-neutral-500 hover:text-neutral-300 rounded-md transition-colors cursor-pointer"
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
                <div className="px-3 py-6 text-xs text-neutral-500 italic text-center">
                  No recent chat history.
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
                      className={`group relative h-10 px-3 rounded-xl flex items-center gap-2.5 cursor-pointer text-sm transition-all ${
                        isActive
                          ? "bg-neutral-800 text-white"
                          : "text-neutral-400 hover:bg-neutral-800/40 hover:text-neutral-200"
                      }`}
                    >
                      <MessageSquare size={15} className="flex-shrink-0 text-neutral-500 group-hover:text-neutral-400" />
                      
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
                          className="flex-1 bg-neutral-900 border border-blue-500 text-white text-xs px-1.5 py-0.5 rounded outline-none"
                        />
                      ) : (
                        <span className="flex-1 truncate font-normal leading-none pr-12">
                          {conv.title}
                        </span>
                      )}

                      {/* Hover action buttons */}
                      {!isEditing && (
                        <div className="absolute right-2 opacity-0 group-hover:opacity-100 flex items-center gap-1 bg-gradient-to-l from-[#1e1f20] group-hover:from-neutral-800 pl-4 h-full">
                          <button
                            onClick={(e) => startRename(conv.id, conv.title, e)}
                            className="p-1 hover:bg-neutral-700 rounded text-neutral-400 hover:text-white"
                            title="Rename"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            onClick={(e) => deleteChat(conv.id, e)}
                            className="p-1 hover:bg-neutral-700 rounded text-neutral-400 hover:text-red-400"
                            title="Delete"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Sidebar Bottom Footer Info */}
            <div className="p-3 border-t border-neutral-800 bg-[#1e1f20]">
              <div className="flex items-center justify-between px-1 py-1.5 rounded-lg">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-500 to-indigo-600 flex items-center justify-center font-bold text-white text-xs shadow-md">
                    TN
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-neutral-300 truncate">tweetnull@gmail.com</p>
                    <p className="text-[10px] text-neutral-500">Gemini Client</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsKeyModalOpen(true)}
                  className="p-2 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-lg transition-colors border border-neutral-800/40 hover:border-neutral-700/60 bg-neutral-900/30"
                  title="Configure Gemini API Key"
                >
                  <Settings size={15} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Main Chat Workspace */}
      <div id="main-workspace" className="flex-1 flex flex-col h-full overflow-hidden relative bg-[#131314]">
        
        {/* Floating Sidebar Toggle when hidden */}
        {!isSidebarOpen && (
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="absolute top-4 left-4 p-2 bg-[#1e1f20]/90 hover:bg-neutral-800 border border-neutral-800 rounded-xl text-neutral-400 hover:text-white z-20 shadow-lg transition-all"
            title="Expand sidebar"
          >
            <Menu size={18} />
          </button>
        )}

        {/* Workspace Top Header */}
        <header className="h-16 px-4 flex items-center justify-between border-b border-neutral-900/40 bg-[#131314]/90 backdrop-blur z-10">
          <div className="flex items-center gap-3">
            {/* Spacer for toggle if sidebar is closed */}
            {!isSidebarOpen && <div className="w-10 h-10" />}
            
            {/* Model Display Selector */}
            <div className="flex items-center gap-1.5 bg-[#1e1f20] hover:bg-neutral-800 px-3.5 py-1.5 rounded-full border border-neutral-800/30 text-xs font-medium text-neutral-200 cursor-pointer select-none">
              <GeminiSpark className="w-3.5 h-3.5" active={isStreaming} />
              <span>{useThinking ? "Gemini 3.1 Pro (Thinking)" : "Gemini 3.5 Flash"}</span>
              <ChevronDown size={12} className="text-neutral-400 ml-0.5" />
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Grounding & Thinking State indicator lamps */}
            <div className="hidden sm:flex items-center gap-2">
              <div
                onClick={() => setUseThinking(!useThinking)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
                  useThinking
                    ? "bg-purple-950/40 border border-purple-800/60 text-purple-300"
                    : "bg-neutral-900 border border-neutral-800/50 text-neutral-500 hover:text-neutral-400"
                }`}
              >
                <Sparkles size={11} />
                <span>Thinking</span>
              </div>
              <div
                onClick={() => setUseSearch(!useSearch)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
                  useSearch
                    ? "bg-blue-950/40 border border-blue-800/60 text-blue-300"
                    : "bg-neutral-900 border border-neutral-800/50 text-neutral-500 hover:text-neutral-400"
                }`}
              >
                <Globe size={11} />
                <span>Search</span>
              </div>
            </div>

            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-500 to-indigo-600 flex items-center justify-center font-bold text-white text-xs shadow-md">
              TN
            </div>
          </div>
        </header>

        {/* Chat Scrolling Area */}
        <main className="flex-1 overflow-y-auto px-4 py-6">
          <div className="max-w-3xl mx-auto w-full h-full flex flex-col justify-between">
            
            {/* If no active conversation or no messages, show Bento landing welcome page */}
            {!activeConversation || activeConversation.messages.length === 0 ? (
              <div className="my-auto flex flex-col items-start pt-10 pb-6 w-full animate-fade-in">
                
                {/* Greeting */}
                <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight leading-tight mb-2 bg-gradient-to-r from-blue-400 via-pink-400 to-amber-300 bg-clip-text text-transparent">
                  Hello, tweetnull
                </h1>
                <h2 className="text-3xl sm:text-4xl font-medium tracking-tight text-neutral-400 mb-12">
                  How can I help you today?
                </h2>

                {/* Suggested Prompts Bento Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full mt-2">
                  {suggestedPrompts.map((p, idx) => (
                    <motion.div
                      key={idx}
                      whileHover={{ scale: 1.015, y: -2 }}
                      whileTap={{ scale: 0.995 }}
                      onClick={() => handleSendMessage(p.category + " " + p.text)}
                      className="bg-[#1e1f20] hover:bg-neutral-800/80 border border-neutral-800/40 hover:border-neutral-700/40 rounded-2xl p-5 cursor-pointer flex flex-col justify-between min-h-[120px] transition-all group"
                    >
                      <p className="text-sm font-medium text-neutral-300 leading-relaxed">
                        <span className="text-neutral-500 group-hover:text-neutral-400 font-semibold block text-[11px] uppercase tracking-wider mb-1.5">
                          {p.category}
                        </span>
                        {p.text}
                      </p>
                      <div className="flex justify-end mt-4">
                        <div className="w-8 h-8 rounded-full bg-neutral-900 flex items-center justify-center border border-neutral-800 group-hover:border-neutral-700 transition-colors">
                          {p.icon}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Extra Guidance */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8 mx-auto w-full">
                  <div className="flex items-center gap-2 text-xs text-neutral-500 bg-neutral-900/30 px-3.5 py-1.5 rounded-full border border-neutral-800/40">
                    <Info size={12} className="text-neutral-400" />
                    <span>Choose Thinking Mode or Google Search from toggles at the bottom</span>
                  </div>
                  
                  <button
                    onClick={() => setIsKeyModalOpen(true)}
                    className={`flex items-center gap-1.5 text-xs px-3.5 py-1.5 rounded-full border transition-all ${
                      clientApiKey 
                        ? "bg-emerald-950/20 border-emerald-800/30 text-emerald-400" 
                        : "bg-amber-950/20 border-amber-850/30 text-amber-400 animate-pulse"
                    }`}
                  >
                    <Key size={11} />
                    <span>{clientApiKey ? "Custom Key Saved" : "No Key Configured? Click here"}</span>
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
                      }`}
                    >
                      {/* Left icon wrapper for AI messages */}
                      {!isUser && (
                        <div className="w-8 h-8 rounded-full bg-neutral-800 border border-neutral-800 flex items-center justify-center flex-shrink-0 shadow">
                          <GeminiSpark className="w-5 h-5" />
                        </div>
                      )}

                      <div
                        className={`flex flex-col max-w-[85%] ${
                          isUser ? "items-end" : "items-start"
                        }`}
                      >
                        {/* Message content box */}
                        <div
                          className={`rounded-2xl text-sm leading-relaxed ${
                            isUser
                              ? "bg-neutral-800 text-neutral-200 px-4 py-3 shadow-sm font-normal"
                              : "text-neutral-200"
                          }`}
                        >
                          {isUser ? (
                            <p className="whitespace-pre-wrap">{m.content}</p>
                          ) : (
                            /* Render Markdown for Assistant */
                            <div className="prose prose-invert prose-sm max-w-none space-y-3">
                              {m.content ? (
                                <ReactMarkdown
                                  components={{
                                    p: ({ children }) => <p className="mb-4 leading-relaxed text-neutral-300">{children}</p>,
                                    ol: ({ children }) => <ol className="list-decimal pl-6 mb-4 space-y-1 text-neutral-300">{children}</ol>,
                                    ul: ({ children }) => <ul className="list-disc pl-6 mb-4 space-y-1 text-neutral-300">{children}</ul>,
                                    li: ({ children }) => <li className="text-neutral-300 mb-1">{children}</li>,
                                    h1: ({ children }) => <h1 className="text-lg font-semibold mt-6 mb-2 text-white">{children}</h1>,
                                    h2: ({ children }) => <h2 className="text-md font-semibold mt-4 mb-2 text-white">{children}</h2>,
                                    h3: ({ children }) => <h3 className="text-sm font-semibold mt-3 mb-1 text-white">{children}</h3>,
                                    a: ({ href, children }) => (
                                      <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline inline-flex items-center gap-0.5">
                                        {children} <ExternalLink size={10} />
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
                                        <code className="bg-neutral-800 text-blue-300 px-1.5 py-0.5 rounded text-xs font-mono border border-neutral-700/40" {...props}>
                                          {children}
                                        </code>
                                      );
                                    }
                                  }}
                                >
                                  {m.content}
                                </ReactMarkdown>
                              ) : (
                                /* Streaming message with gorgeous loading shimmer */
                                <div className="flex items-center gap-2 text-neutral-400 italic">
                                  <div className="flex space-x-1.5 items-center">
                                    <div className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                    <div className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                    <div className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce"></div>
                                  </div>
                                  <span className="text-xs text-neutral-500">Gemini is synthesizing...</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Grounding sources citation chips */}
                        {!isUser && m.sources && m.sources.length > 0 && (
                          <div className="mt-4 border-t border-neutral-800/60 pt-3 w-full">
                            <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider block mb-2 flex items-center gap-1">
                              <Globe size={11} className="text-blue-400" /> Search Sources
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {m.sources.map((s, idx) => (
                                <a
                                  key={idx}
                                  href={s.uri}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 bg-[#1e1f20] hover:bg-neutral-800 border border-neutral-800/80 px-2.5 py-1 rounded-xl text-xs text-neutral-300 transition-colors"
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
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-500 to-indigo-600 flex items-center justify-center font-bold text-white text-xs shadow-sm flex-shrink-0">
                          TN
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
        <div id="input-container" className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#131314] via-[#131314]/95 to-transparent pt-10 pb-4 px-4 z-10">
          <div className="max-w-3xl mx-auto w-full">
            
            {/* Input Bar Card */}
            <div className="bg-[#1e1f20] border border-neutral-800/80 rounded-[28px] p-2 flex flex-col gap-1 transition-all shadow-xl hover:border-neutral-700/60 focus-within:border-neutral-700/90 focus-within:ring-1 focus-within:ring-neutral-800">
              
              {/* Inner Expanding Textarea */}
              <div className="flex items-start px-3 pt-2">
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    useThinking 
                      ? "Ask Gemini 3.1 Pro (Thinking Mode Enabled)..." 
                      : useSearch 
                        ? "Search with Google and Chat..." 
                        : "Ask Gemini..."
                  }
                  className="flex-1 bg-transparent border-0 resize-none outline-none text-neutral-200 text-sm py-1 placeholder-neutral-500 min-h-[24px] max-h-[200px] leading-relaxed"
                />
              </div>

              {/* Action Toolbar Inside Input Bar */}
              <div className="flex items-center justify-between px-2 pt-1 pb-1">
                <div className="flex items-center gap-1">
                  
                  {/* Thinking Mode Switch Button */}
                  <button
                    onClick={() => {
                      setUseThinking(!useThinking);
                      if (!useThinking) setUseSearch(false); // Mutual exclusivity is cleaner for models
                    }}
                    className={`p-2 rounded-full transition-all flex items-center justify-center ${
                      useThinking
                        ? "bg-purple-900/50 text-purple-300 ring-1 ring-purple-700/40"
                        : "text-neutral-500 hover:bg-neutral-800 hover:text-neutral-300"
                    }`}
                    title="Thinking Mode (Gemini 3.1 Pro)"
                  >
                    <Sparkles size={16} />
                  </button>

                  {/* Google Search Grounding Switch Button */}
                  <button
                    onClick={() => {
                      setUseSearch(!useSearch);
                      if (!useSearch) setUseThinking(false);
                    }}
                    className={`p-2 rounded-full transition-all flex items-center justify-center ${
                      useSearch
                        ? "bg-blue-900/50 text-blue-300 ring-1 ring-blue-700/40"
                        : "text-neutral-500 hover:bg-neutral-800 hover:text-neutral-300"
                    }`}
                    title="Google Search Grounding"
                  >
                    <Globe size={16} />
                  </button>

                  {/* Feature Active Badges */}
                  {(useThinking || useSearch) && (
                    <div className="hidden sm:flex items-center gap-1 pl-1">
                      {useThinking && (
                        <span className="text-[9px] font-bold text-purple-400 bg-purple-950/40 border border-purple-800/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
                          Thinking Mode
                        </span>
                      )}
                      {useSearch && (
                        <span className="text-[9px] font-bold text-blue-400 bg-blue-950/40 border border-blue-800/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
                          Google Search
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Send Message Button */}
                <button
                  onClick={() => handleSendMessage()}
                  disabled={!input.trim() || isStreaming}
                  className={`p-2.5 rounded-full flex items-center justify-center transition-all ${
                    input.trim() && !isStreaming
                      ? "bg-white text-black hover:bg-neutral-100 shadow"
                      : "text-neutral-600 bg-neutral-800/40 cursor-not-allowed"
                  }`}
                  title="Send message"
                >
                  <Send size={15} />
                </button>
              </div>
            </div>

            {/* Disclaimer disclaimer text */}
            <p className="text-[11px] text-neutral-600 text-center mt-2.5">
              Gemini can make mistakes, so double-check its responses. Full-stack security ensured via secure server API.
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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="bg-[#1e1f20] border border-neutral-800 rounded-3xl p-6 max-w-md w-full shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-pink-500 to-amber-400" />
              
              <div className="flex items-start gap-4 mb-5">
                <div className="w-10 h-10 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-amber-400 flex-shrink-0">
                  <Key size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Configure Gemini API Key</h3>
                  <p className="text-xs text-neutral-400 mt-1">
                    Optionally use your own custom API key. This is safely saved in your browser&apos;s local storage and never exposed.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block">
                    Gemini API Key
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showKeyText ? "text" : "password"}
                      value={tempApiKey}
                      onChange={(e) => setTempApiKey(e.target.value)}
                      placeholder="AIzaSy..."
                      className="w-full bg-neutral-900/50 border border-neutral-800 focus:border-neutral-700 rounded-xl px-3 py-2.5 text-sm text-neutral-200 placeholder-neutral-600 outline-none pr-10 font-mono transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKeyText(!showKeyText)}
                      className="absolute right-3 text-neutral-400 hover:text-neutral-200 text-xs font-semibold"
                    >
                      {showKeyText ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                <div className="bg-neutral-900/30 border border-neutral-800/40 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-start gap-2.5">
                    <ShieldAlert size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
                    <span className="text-xs text-neutral-400 leading-relaxed">
                      If the server has a master key configured (default in Google AI Studio), that key is preferred. When deployed on Vercel or other servers, entering your key here ensures the app works immediately.
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-500 pl-6">
                    Don&apos;t have a key? Get one for free at{" "}
                    <a
                      href="https://aistudio.google.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:underline inline-flex items-center gap-0.5"
                    >
                      Google AI Studio <ExternalLink size={8} />
                    </a>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-neutral-900/80">
                <button
                  onClick={() => setIsKeyModalOpen(false)}
                  className="px-4 py-2 text-sm text-neutral-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setClientApiKey(tempApiKey.trim());
                    if (tempApiKey.trim()) {
                      localStorage.setItem("gemini_client_api_key", tempApiKey.trim());
                    } else {
                      localStorage.removeItem("gemini_client_api_key");
                    }
                    setIsKeyModalOpen(false);
                  }}
                  className="px-5 py-2 bg-white hover:bg-neutral-100 text-black font-semibold text-sm rounded-xl transition-all shadow-md"
                >
                  Save Settings
                </button>
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
            className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border backdrop-blur-md ${
              notification.type === "success"
                ? "bg-emerald-950/90 border-emerald-500/30 text-emerald-300"
                : notification.type === "error"
                ? "bg-red-950/90 border-red-500/30 text-red-300"
                : "bg-neutral-900/95 border-neutral-800 text-neutral-300"
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${
              notification.type === "success" 
                ? "bg-emerald-400 animate-pulse" 
                : notification.type === "error" 
                ? "bg-red-400 animate-pulse" 
                : "bg-blue-400 animate-pulse"
            }`} />
            <span className="text-sm font-medium">{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
