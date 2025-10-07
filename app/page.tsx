"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Plus, Sun, Moon, Send, Leaf, MessageSquare, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

interface Message {
  role: "user" | "assistant"
  content: string
  timestamp: string
}

interface Conversation {
  id: string
  title: string
  messages: Message[]
}

const BACKEND_URL = "http://127.0.0.1:8000"

export default function EdenGreenChat() {
  const [theme, setTheme] = useState<"light" | "dark">("dark")
  const [conversations, setConversations] = useState<Record<string, Conversation>>({})
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [backendStatus, setBackendStatus] = useState({ active: false, project: "EdenGREEN" })
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Initialize with first conversation
  useEffect(() => {
    if (Object.keys(conversations).length === 0) {
      createNewChat()
    }
  }, [])

  // Check backend status
  useEffect(() => {
    checkBackendStatus()
  }, [])

  // Apply theme
  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [theme])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [conversations, currentId])

  const checkBackendStatus = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/status`, {
        method: "GET",
        signal: AbortSignal.timeout(4000),
      })
      if (response.ok) {
        const data = await response.json()
        setBackendStatus({
          active: data.openai_active || false,
          project: data.project || "EdenGREEN",
        })
      }
    } catch (error) {
      console.log("[v0] Backend not available:", error)
    }
  }

  const createNewChat = () => {
    const id = `chat_${Date.now()}`
    const newConv: Conversation = {
      id,
      title: "New chat",
      messages: [
        {
          role: "assistant",
          content: "🌱 Hi! I'm **EdenGREEN**. How can I help you today?",
          timestamp: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
        },
      ],
    }
    setConversations((prev) => ({ ...prev, [id]: newConv }))
    setCurrentId(id)
  }

  const sendMessage = async () => {
    if (!input.trim() || !currentId || isLoading) return

    const userMessage: Message = {
      role: "user",
      content: input,
      timestamp: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    }

    // Add user message
    setConversations((prev) => ({
      ...prev,
      [currentId]: {
        ...prev[currentId],
        messages: [...prev[currentId].messages, userMessage],
      },
    }))

    // Update title if it's the first user message
    if (conversations[currentId].messages.length === 1) {
      const title = input.slice(0, 30) + (input.length > 30 ? "..." : "")
      setConversations((prev) => ({
        ...prev,
        [currentId]: {
          ...prev[currentId],
          title,
        },
      }))
    }

    setInput("")
    setIsLoading(true)

    try {
      const formData = new FormData()
      formData.append("user_input", input)

      const response = await fetch(`${BACKEND_URL}/interpret`, {
        method: "POST",
        body: formData,
        signal: AbortSignal.timeout(60000),
      })

      let assistantContent = "Sin respuesta del servidor."

      if (response.ok) {
        const data = await response.json()
        assistantContent = data.result || assistantContent
      } else {
        assistantContent = `Error ${response.status}: ${response.statusText}`
      }

      const assistantMessage: Message = {
        role: "assistant",
        content: assistantContent,
        timestamp: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      }

      setConversations((prev) => ({
        ...prev,
        [currentId]: {
          ...prev[currentId],
          messages: [...prev[currentId].messages, assistantMessage],
        },
      }))
    } catch (error) {
      const errorMessage: Message = {
        role: "assistant",
        content: `❌ Backend error: ${error instanceof Error ? error.message : "Unknown error"}`,
        timestamp: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      }

      setConversations((prev) => ({
        ...prev,
        [currentId]: {
          ...prev[currentId],
          messages: [...prev[currentId].messages, errorMessage],
        },
      }))
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const currentConversation = currentId ? conversations[currentId] : null

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="w-[280px] border-r border-sidebar-border bg-sidebar flex flex-col">
        {/* Brand */}
        <div className="p-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-sidebar-accent border border-sidebar-border shadow-lg">
            <div className="relative">
              <Leaf className="h-6 w-6 text-primary" />
              <Sparkles className="h-3 w-3 text-accent absolute -top-1 -right-1" />
            </div>
            <span className="font-bold text-lg tracking-tight text-sidebar-foreground">{backendStatus.project}</span>
          </div>
        </div>

        {/* New Chat Button */}
        <div className="px-4 pb-3">
          <Button
            onClick={createNewChat}
            className="w-full justify-start gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            size="lg"
          >
            <Plus className="h-5 w-5" />
            New chat
          </Button>
        </div>

        <Separator className="bg-sidebar-border" />

        {/* Conversations List */}
        <ScrollArea className="flex-1 px-3 py-2">
          <div className="space-y-1">
            {Object.values(conversations)
              .reverse()
              .map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setCurrentId(conv.id)}
                  className={cn(
                    "w-full text-left px-3 py-2.5 rounded-lg transition-all duration-200",
                    "hover:bg-sidebar-accent text-sm font-medium",
                    "truncate border border-transparent",
                    currentId === conv.id && "bg-sidebar-accent border-sidebar-border shadow-sm",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <span className="truncate text-sidebar-foreground">{conv.title}</span>
                  </div>
                </button>
              ))}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-4 border-t border-sidebar-border">
          <p className="text-xs text-center text-muted-foreground">
            © 2025 EdenGREEN
            <br />
            <span className="text-[10px]">Desarrollado por José Carlos 🌾</span>
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="border-b border-border bg-card/50 backdrop-blur-sm">
          <div className="flex items-center justify-between px-6 py-3">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-semibold border",
                  "flex items-center gap-2",
                  backendStatus.active
                    ? "bg-primary/10 text-primary border-primary/20"
                    : "bg-muted text-muted-foreground border-border",
                )}
              >
                <div
                  className={cn(
                    "h-2 w-2 rounded-full",
                    backendStatus.active ? "bg-primary animate-pulse" : "bg-muted-foreground",
                  )}
                />
                {backendStatus.active ? "Conectado a OpenAI" : "Modo local"}
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="rounded-full"
            >
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
          </div>
        </header>

        {/* Chat Area */}
        <ScrollArea className="flex-1 p-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {currentConversation?.messages.map((message, index) => (
              <div key={index} className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-3 shadow-sm border",
                    message.role === "user" ? "bg-user-bubble border-border/50" : "bg-ai-bubble border-border/50",
                  )}
                >
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2">{message.timestamp}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-ai-bubble border border-border/50 rounded-2xl px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                    <div className="h-2 w-2 rounded-full bg-primary animate-pulse [animation-delay:0.2s]" />
                    <div className="h-2 w-2 rounded-full bg-primary animate-pulse [animation-delay:0.4s]" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t border-border bg-card/50 backdrop-blur-sm p-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-end gap-3">
              <div className="flex-1 relative">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Escribe aquí tu mensaje..."
                  disabled={isLoading}
                  className="pr-12 py-6 text-base rounded-2xl bg-background border-border shadow-sm resize-none"
                />
              </div>
              <Button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                size="icon"
                className="h-12 w-12 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
