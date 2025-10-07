"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Plus,
  Sun,
  Moon,
  Send,
  Leaf,
  MessageSquare,
  Sparkles,
  Search,
  Trash2,
  Edit2,
  Check,
  X,
  Paperclip,
  Mic,
  Camera,
  Monitor,
  Settings,
} from "lucide-react"
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
  const [searchQuery, setSearchQuery] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState("")
  const [userName, setUserName] = useState("Usuario")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [attachMenuOpen, setAttachMenuOpen] = useState(false)

  useEffect(() => {
    checkBackendStatus()
  }, [])

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [theme])

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
      messages: [],
    }
    setConversations((prev) => ({ ...prev, [id]: newConv }))
    setCurrentId(id)
    return id
  }

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    let chatId = currentId
    if (!chatId) {
      chatId = createNewChat()
    }

    const userMessage: Message = {
      role: "user",
      content: input,
      timestamp: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    }

    setConversations((prev) => ({
      ...prev,
      [chatId]: {
        ...prev[chatId],
        messages: [...prev[chatId].messages, userMessage],
      },
    }))

    if (conversations[chatId]?.messages.length === 0) {
      const title = input.slice(0, 30) + (input.length > 30 ? "..." : "")
      setConversations((prev) => ({
        ...prev,
        [chatId]: {
          ...prev[chatId],
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
        [chatId]: {
          ...prev[chatId],
          messages: [...prev[chatId].messages, assistantMessage],
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
        [chatId]: {
          ...prev[chatId],
          messages: [...prev[chatId].messages, errorMessage],
        },
      }))
    } finally {
      setIsLoading(false)
    }
  }

  const deleteConversation = (id: string) => {
    setConversations((prev) => {
      const newConvs = { ...prev }
      delete newConvs[id]
      return newConvs
    })
    if (currentId === id) {
      const remaining = Object.keys(conversations).filter((key) => key !== id)
      setCurrentId(remaining.length > 0 ? remaining[0] : null)
    }
  }

  const startRenaming = (id: string, currentTitle: string) => {
    setEditingId(id)
    setEditingTitle(currentTitle)
  }

  const saveRename = () => {
    if (editingId && editingTitle.trim()) {
      setConversations((prev) => ({
        ...prev,
        [editingId]: {
          ...prev[editingId],
          title: editingTitle.trim(),
        },
      }))
    }
    setEditingId(null)
    setEditingTitle("")
  }

  const cancelRename = () => {
    setEditingId(null)
    setEditingTitle("")
  }

  const filteredConversations = Object.values(conversations)
    .reverse()
    .filter((conv) => conv.title.toLowerCase().includes(searchQuery.toLowerCase()))

  const handleFileAttach = () => {
    fileInputRef.current?.click()
    setAttachMenuOpen(false)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      console.log("[v0] Files selected:", files)
    }
  }

  const handleVoiceInput = () => {
    console.log("[v0] Voice input requested")
    setAttachMenuOpen(false)
  }

  const handleCamera = () => {
    console.log("[v0] Camera requested")
    setAttachMenuOpen(false)
  }

  const handleScreenshot = () => {
    console.log("[v0] Screenshot requested")
    setAttachMenuOpen(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const currentConversation = currentId ? conversations[currentId] : null
  const showEmptyState = !currentConversation || currentConversation.messages.length === 0

  return (
    <div className="flex h-screen overflow-hidden bg-background relative">
      <div className="agricultural-pattern" />

      {/* Sidebar */}
      <aside className="w-[280px] border-r border-sidebar-border bg-sidebar/95 backdrop-blur-sm flex flex-col relative z-10">
        <div className="p-4">
          <div className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
                <div className="relative bg-gradient-to-br from-primary to-accent p-2 rounded-xl shadow-lg">
                  <Leaf className="h-6 w-6 text-primary-foreground" />
                </div>
                <Sparkles className="h-3 w-3 text-accent absolute -top-1 -right-1 animate-pulse" />
              </div>
              <div>
                <h1 className="font-display font-bold text-xl tracking-tight text-sidebar-foreground">
                  Eden<span className="text-primary">GREEN</span>
                </h1>
                <p className="text-[10px] text-muted-foreground font-medium tracking-wide">AI AGRÍCOLA</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg hover:bg-sidebar-accent"
              title="Configuración"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="px-4 pb-3">
          <p className="text-sm text-sidebar-foreground/70 font-medium">
            Bienvenido, <span className="font-semibold text-primary">{userName}</span>
          </p>
        </div>

        <div className="px-4 pb-3">
          <Button
            onClick={createNewChat}
            className="w-full justify-start gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg hover:shadow-xl transition-all"
            size="lg"
          >
            <Plus className="h-5 w-5" />
            Nuevo chat
          </Button>
        </div>

        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar chats..."
              className="pl-9 bg-sidebar-accent border-sidebar-border"
            />
          </div>
        </div>

        <Separator className="bg-sidebar-border" />

        <ScrollArea className="flex-1 px-3 py-2" type="always">
          <div className="space-y-1">
            {filteredConversations.map((conv) => (
              <div
                key={conv.id}
                className={cn(
                  "group relative rounded-lg transition-all duration-200",
                  "border border-transparent hover:border-sidebar-border",
                  currentId === conv.id && "bg-sidebar-accent border-sidebar-border shadow-sm",
                )}
              >
                {editingId === conv.id ? (
                  <div className="flex items-center gap-1 p-2">
                    <Input
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveRename()
                        if (e.key === "Escape") cancelRename()
                      }}
                      className="h-8 text-sm"
                      autoFocus
                    />
                    <Button size="icon" variant="ghost" onClick={saveRename} className="h-8 w-8 flex-shrink-0">
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={cancelRename} className="h-8 w-8 flex-shrink-0">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 pr-2">
                    <button
                      onClick={() => setCurrentId(conv.id)}
                      className="flex-1 text-left px-3 py-2.5 hover:bg-sidebar-accent/50 text-sm font-medium rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                        <span className="truncate text-sidebar-foreground">{conv.title}</span>
                      </div>
                    </button>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation()
                          startRenaming(conv.id, conv.title)
                        }}
                        className="h-7 w-7 hover:bg-sidebar-accent"
                        title="Renombrar"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteConversation(conv.id)
                        }}
                        className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                        title="Eliminar"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-sidebar-border">
          <p className="text-xs text-center text-muted-foreground font-medium">
            © 2025 EdenGREEN
            <br />
            <span className="text-[10px]">Desarrollado por José Carlos</span>
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative z-10">
        <header className="border-b border-border bg-card/50 backdrop-blur-sm flex-shrink-0">
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

        {showEmptyState ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center space-y-6 max-w-2xl">
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
                <div className="relative bg-gradient-to-br from-primary to-accent p-6 rounded-3xl shadow-2xl">
                  <Leaf className="h-16 w-16 text-primary-foreground" />
                </div>
              </div>
              <div className="space-y-3">
                <h2 className="font-display text-4xl font-bold tracking-tight text-foreground">
                  ¿En qué puedo ayudarte hoy?
                </h2>
                <p className="text-lg text-muted-foreground font-medium">
                  Soy EdenGREEN, tu asistente de inteligencia artificial especializado en agricultura sostenible
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full w-full" type="always">
              <div className="p-6">
                <div className="max-w-3xl mx-auto px-14 space-y-6 pb-4">
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
              </div>
            </ScrollArea>
          </div>
        )}

        <div className="border-t border-border bg-card/50 backdrop-blur-sm p-4 flex-shrink-0">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-end gap-2">
              <Popover open={attachMenuOpen} onOpenChange={setAttachMenuOpen}>
                <PopoverTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-12 w-12 rounded-2xl hover:bg-accent/10 flex-shrink-0"
                    title="Adjuntar"
                  >
                    <Plus className="h-5 w-5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent side="top" align="start" className="w-56 p-2">
                  <div className="flex flex-col gap-1">
                    <Button
                      variant="ghost"
                      onClick={handleFileAttach}
                      className="justify-start gap-3 h-10 px-3 hover:bg-accent/10"
                    >
                      <Paperclip className="h-4 w-4" />
                      <span className="text-sm">Adjuntar archivo</span>
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={handleCamera}
                      className="justify-start gap-3 h-10 px-3 hover:bg-accent/10"
                    >
                      <Camera className="h-4 w-4" />
                      <span className="text-sm">Tomar foto</span>
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={handleScreenshot}
                      className="justify-start gap-3 h-10 px-3 hover:bg-accent/10"
                    >
                      <Monitor className="h-4 w-4" />
                      <span className="text-sm">Capturar pantalla</span>
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={handleVoiceInput}
                      className="justify-start gap-3 h-10 px-3 hover:bg-accent/10"
                    >
                      <Mic className="h-4 w-4" />
                      <span className="text-sm">Entrada de voz</span>
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>

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
                className="h-12 w-12 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all flex-shrink-0"
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </main>

      <input ref={fileInputRef} type="file" multiple accept="image/*" onChange={handleFileChange} className="hidden" />
    </div>
  )
}
