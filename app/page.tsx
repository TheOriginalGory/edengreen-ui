"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Plus,
  Sun,
  Moon,
  Send,
  MessageSquare,
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
  MicOff,
  XCircle,
  User,
  Bell,
  Lock,
  Palette,
  Globe,
  Info,
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
  const [isRecording, setIsRecording] = useState(false)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [showCameraModal, setShowCameraModal] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const recognitionRef = useRef<any>(null)
  const [showSettingsModal, setShowSettingsModal] = useState(false)

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      sendMessage()
    }
  }

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
    setAttachMenuOpen(false)

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      alert("Tu navegador no soporta reconocimiento de voz. Intenta con Chrome o Edge.")
      return
    }

    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      setIsRecording(false)
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = "es-ES"
    recognition.continuous = true
    recognition.interimResults = true
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      setIsRecording(true)
    }

    recognition.onresult = (event: any) => {
      let finalTranscript = ""

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript + " "
        }
      }

      if (finalTranscript) {
        setInput((prev) => prev + finalTranscript)
      }
    }

    recognition.onerror = (event: any) => {
      setIsRecording(false)

      if (event.error === "not-allowed" || event.error === "permission-denied") {
        alert(
          "Permiso de micrófono denegado. Por favor, permite el acceso al micrófono en la configuración de tu navegador.",
        )
      } else if (event.error === "no-speech") {
        console.log("[v0] No speech detected")
      } else if (event.error === "audio-capture") {
        alert("No se detectó ningún micrófono. Por favor, conecta un micrófono e intenta de nuevo.")
      } else if (event.error === "network") {
        alert("Error de red. Verifica tu conexión a internet.")
      } else {
        console.error("[v0] Speech recognition error:", event.error)
      }
    }

    recognition.onend = () => {
      setIsRecording(false)
    }

    recognitionRef.current = recognition

    try {
      recognition.start()
    } catch (error) {
      console.error("[v0] Failed to start recognition:", error)
      setIsRecording(false)
      alert("No se pudo iniciar el reconocimiento de voz. Por favor, intenta de nuevo.")
    }
  }

  const handleCamera = async () => {
    setAttachMenuOpen(false)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      })

      mediaStreamRef.current = stream
      setShowCameraModal(true)

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
    } catch (error: any) {
      console.error("[v0] Camera access error:", error)

      if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        alert(
          "Permiso de cámara denegado. Por favor, permite el acceso a la cámara en la configuración de tu navegador.",
        )
      } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
        alert("No se detectó ninguna cámara. Por favor, conecta una cámara e intenta de nuevo.")
      } else if (error.name === "NotReadableError" || error.name === "TrackStartError") {
        alert(
          "La cámara está siendo usada por otra aplicación. Por favor, cierra otras aplicaciones que usen la cámara.",
        )
      } else {
        alert("No se pudo acceder a la cámara. Error: " + error.message)
      }
    }
  }

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current
      const canvas = canvasRef.current

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.drawImage(video, 0, 0)
        const imageData = canvas.toDataURL("image/png")
        setCapturedImage(imageData)
        closeCameraModal()
        console.log("[v0] Photo captured")
      }
    }
  }

  const closeCameraModal = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop())
      mediaStreamRef.current = null
    }
    setShowCameraModal(false)
  }

  const handleScreenshot = async () => {
    setAttachMenuOpen(false)

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          mediaSource: "screen" as any,
          cursor: "always",
        },
      })

      const video = document.createElement("video")
      video.srcObject = stream
      video.play()

      video.onloadedmetadata = () => {
        const canvas = document.createElement("canvas")
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight

        const ctx = canvas.getContext("2d")
        if (ctx) {
          ctx.drawImage(video, 0, 0)
          const imageData = canvas.toDataURL("image/png")
          setCapturedImage(imageData)
        }

        stream.getTracks().forEach((track) => track.stop())
      }
    } catch (error: any) {
      if (error.name === "NotAllowedError") {
        console.log("[v0] User cancelled screen capture")
      } else if (error.name === "NotSupportedError") {
        alert("Tu navegador no soporta captura de pantalla. Intenta con Chrome, Edge o Firefox.")
      } else if (error.message && error.message.includes("permissions policy")) {
        // This is a preview environment limitation
        alert(
          "La captura de pantalla está restringida en el entorno de vista previa por políticas de seguridad.\n\n" +
            "Esta función funcionará correctamente cuando despliegues la aplicación en un navegador real o en producción.",
        )
      } else {
        alert("No se pudo capturar la pantalla. Esto puede deberse a restricciones de seguridad del navegador.")
      }
    }
  }

  const removeCapturedImage = () => {
    setCapturedImage(null)
  }

  const currentConversation = currentId ? conversations[currentId] : null
  const showEmptyState = !currentConversation || currentConversation.messages.length === 0

  return (
    <div className="flex h-screen overflow-hidden bg-background relative">
      <div className="agricultural-pattern" />

      {/* Sidebar */}
      <aside className="w-[280px] border-r border-sidebar-border bg-sidebar/95 backdrop-blur-sm flex flex-col relative z-10">
        <div className="p-4">
          <div className="flex items-center gap-3 p-4 rounded-2xl glass-effect glow-primary">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/30 blur-2xl rounded-full" />
              <div className="relative">
                <img src="/logo-yaqui.png" alt="SIARI Logo" className="h-16 w-16 object-contain logo-pulse" />
              </div>
            </div>
            <div>
              <h1 className="font-display font-black text-2xl tracking-tight text-sidebar-foreground">SIARI</h1>
              <p className="text-[9px] text-muted-foreground font-bold tracking-widest uppercase">AI Agrícola</p>
            </div>
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
            className="w-full justify-start gap-2 bg-primary hover:bg-primary/90 text-white font-semibold hover:shadow-xl transition-all shadow-lg"
            size="lg"
          >
            <Plus className="h-5 w-5" />
            Nuevo chat
          </Button>
        </div>

        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-sidebar-foreground/60" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar chats..."
              className="pl-9 bg-sidebar-accent border-sidebar-border text-sidebar-foreground placeholder:text-sidebar-foreground/60"
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

        <div className="p-4 border-t border-sidebar-border space-y-3">
          <Button
            variant="ghost"
            onClick={() => setShowSettingsModal(true)}
            className="w-full justify-start gap-3 hover:bg-sidebar-accent text-sidebar-foreground"
          >
            <Settings className="h-4 w-4" />
            <span className="text-sm font-medium">Configuración</span>
          </Button>

          <p className="text-xs text-center text-muted-foreground font-medium">
            © 2025 SIARI
            <br />
            <span className="text-[10px]">Desarrollado por José Carlos</span>
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative z-10">
        <header className="border-b border-border bg-card/50 backdrop-blur-sm flex-shrink-0">
          <div className="flex items-center justify-end px-6 py-3">
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
            <div className="text-center space-y-8 max-w-2xl">
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-primary/30 blur-3xl rounded-full animate-pulse" />
                <div className="relative">
                  <img src="/logo-yaqui.png" alt="SIARI Logo" className="h-32 w-32 object-contain mx-auto logo-pulse" />
                </div>
              </div>
              <div className="space-y-4">
                <h2 className="font-display text-5xl font-black tracking-tighter text-foreground">
                  ¿En qué puedo ayudarte hoy?
                </h2>
                <p className="text-xl text-muted-foreground font-medium leading-relaxed">
                  Soy <span className="text-primary font-bold">SIARI</span>, tu asistente de inteligencia artificial
                  <br />
                  especializado en agricultura sostenible
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
            {capturedImage && (
              <div className="mb-3 relative inline-block">
                <img
                  src={capturedImage || "/placeholder.svg"}
                  alt="Captured"
                  className="max-h-32 rounded-lg border-2 border-primary shadow-lg"
                />
                <Button
                  size="icon"
                  variant="destructive"
                  onClick={removeCapturedImage}
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            )}

            {isRecording && (
              <div className="mb-3 flex items-center gap-2 text-primary animate-pulse">
                <div className="h-3 w-3 rounded-full bg-primary" />
                <span className="text-sm font-semibold">Grabando audio...</span>
                <Button size="sm" variant="outline" onClick={handleVoiceInput} className="ml-2 bg-transparent">
                  <MicOff className="h-4 w-4 mr-1" />
                  Detener
                </Button>
              </div>
            )}

            <div className="flex items-end gap-2">
              <Popover open={attachMenuOpen} onOpenChange={setAttachMenuOpen}>
                <PopoverTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-12 w-12 rounded-2xl hover:bg-primary/10 text-foreground hover:text-foreground flex-shrink-0"
                    title="Adjuntar"
                  >
                    <Plus className="h-5 w-5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent side="top" align="center" sideOffset={24} collisionPadding={20} className="w-56 p-2">
                  <div className="flex flex-col gap-1">
                    <Button
                      variant="ghost"
                      onClick={handleFileAttach}
                      className="justify-start gap-3 h-10 px-3 hover:bg-primary/10 text-popover-foreground hover:text-popover-foreground"
                    >
                      <Paperclip className="h-4 w-4" />
                      <span className="text-sm">Adjuntar archivo</span>
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={handleCamera}
                      className="justify-start gap-3 h-10 px-3 hover:bg-primary/10 text-popover-foreground hover:text-popover-foreground"
                    >
                      <Camera className="h-4 w-4" />
                      <span className="text-sm">Tomar foto</span>
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={handleScreenshot}
                      className="justify-start gap-3 h-10 px-3 hover:bg-primary/10 text-popover-foreground hover:text-popover-foreground"
                    >
                      <Monitor className="h-4 w-4" />
                      <span className="text-sm">Capturar pantalla</span>
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={handleVoiceInput}
                      className="justify-start gap-3 h-10 px-3 hover:bg-primary/10 text-popover-foreground hover:text-popover-foreground"
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
                  className="pr-12 py-6 text-base rounded-2xl bg-background border-border shadow-sm resize-none placeholder:text-muted-foreground"
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

      {/* Settings Modal */}
      <Dialog open={showSettingsModal} onOpenChange={setShowSettingsModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <Settings className="h-6 w-6 text-primary" />
              Configuración
            </DialogTitle>
            <DialogDescription>Personaliza tu experiencia con SIARI</DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Account Settings */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Cuenta
              </h3>
              <div className="space-y-2 pl-7">
                <div className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/10 cursor-pointer">
                  <div>
                    <p className="font-medium">Nombre de usuario</p>
                    <p className="text-sm text-muted-foreground">{userName}</p>
                  </div>
                  <Button variant="ghost" size="sm">
                    Editar
                  </Button>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/10 cursor-pointer">
                  <div>
                    <p className="font-medium">Correo electrónico</p>
                    <p className="text-sm text-muted-foreground">usuario@ejemplo.com</p>
                  </div>
                  <Button variant="ghost" size="sm">
                    Editar
                  </Button>
                </div>
              </div>
            </div>

            <Separator />

            {/* Appearance Settings */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Palette className="h-5 w-5 text-primary" />
                Apariencia
              </h3>
              <div className="space-y-2 pl-7">
                <div className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/10">
                  <div>
                    <p className="font-medium">Tema</p>
                    <p className="text-sm text-muted-foreground">Claro u oscuro</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
                    {theme === "dark" ? "Oscuro" : "Claro"}
                  </Button>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/10">
                  <div>
                    <p className="font-medium">Tamaño de fuente</p>
                    <p className="text-sm text-muted-foreground">Ajusta el tamaño del texto</p>
                  </div>
                  <Button variant="ghost" size="sm">
                    Medio
                  </Button>
                </div>
              </div>
            </div>

            <Separator />

            {/* Privacy & Security */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                Privacidad y Seguridad
              </h3>
              <div className="space-y-2 pl-7">
                <div className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/10 cursor-pointer">
                  <div>
                    <p className="font-medium">Borrar historial de conversaciones</p>
                    <p className="text-sm text-muted-foreground">Elimina todas tus conversaciones</p>
                  </div>
                  <Button variant="destructive" size="sm">
                    Borrar
                  </Button>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/10 cursor-pointer">
                  <div>
                    <p className="font-medium">Exportar datos</p>
                    <p className="text-sm text-muted-foreground">Descarga tus conversaciones</p>
                  </div>
                  <Button variant="ghost" size="sm">
                    Exportar
                  </Button>
                </div>
              </div>
            </div>

            <Separator />

            {/* Notifications */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                Notificaciones
              </h3>
              <div className="space-y-2 pl-7">
                <div className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/10">
                  <div>
                    <p className="font-medium">Sonidos</p>
                    <p className="text-sm text-muted-foreground">Reproducir sonidos de notificación</p>
                  </div>
                  <Button variant="outline" size="sm">
                    Activado
                  </Button>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/10">
                  <div>
                    <p className="font-medium">Notificaciones de escritorio</p>
                    <p className="text-sm text-muted-foreground">Recibe alertas en tu escritorio</p>
                  </div>
                  <Button variant="outline" size="sm">
                    Desactivado
                  </Button>
                </div>
              </div>
            </div>

            <Separator />

            {/* Language */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                Idioma
              </h3>
              <div className="space-y-2 pl-7">
                <div className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/10">
                  <div>
                    <p className="font-medium">Idioma de la interfaz</p>
                    <p className="text-sm text-muted-foreground">Español ( México)</p>
                  </div>
                  <Button variant="ghost" size="sm">
                    Cambiar
                  </Button>
                </div>
              </div>
            </div>

            <Separator />

            {/* About */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" />
                Acerca de
              </h3>
              <div className="space-y-2 pl-7">
                <div className="p-3 rounded-lg bg-accent/10">
                  <p className="font-medium">SIARI v1.0.0</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Asistente de IA especializado en agricultura sostenible
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">© 2025 SIARI. Desarrollado por José Carlos</p>
                </div>
                <Button variant="ghost" size="sm" className="w-full">
                  Términos y Condiciones
                </Button>
                <Button variant="ghost" size="sm" className="w-full">
                  Política de Privacidad
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <input ref={fileInputRef} type="file" multiple accept="image/*" onChange={handleFileChange} className="hidden" />
    </div>
  )
}
