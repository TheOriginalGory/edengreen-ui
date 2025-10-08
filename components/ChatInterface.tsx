// components/ChatInterface.tsx
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { sendMessageToBackend, fetchProfile, updateProfile } from '@/services/apiService';
import { toast } from 'sonner';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
    Plus, Sun, Moon, Send, MessageSquare, Search, Trash2, Edit2, Check, X, LogOut,
    Settings, User, Bell, Lock, Palette, Globe, Info, Loader2, Save,
} from "lucide-react";
import { cn } from "@/lib/utils";


// --- Tipos de datos ---
interface Message {
    role: "user" | "assistant";
    content: string;
    timestamp: string;
}

interface Conversation {
    id: string;
    title: string;
    messages: Message[];
}

interface Profile {
    user_id: number;
    nombre: string;
    cultivo: string;
    region: string;
    extra_json: any;
}

// --- Componente principal de la interfaz de chat ---
export function ChatInterface() {
    const { user, logout } = useAuth();
    const [theme, setTheme] = useState<"light" | "dark">("dark");
    const [conversations, setConversations] = useState<Record<string, Conversation>>({});
    const [currentId, setCurrentId] = useState<string | null>(null);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingTitle, setEditingTitle] = useState("");

    // ESTADO DEL PERFIL
    const [userProfile, setUserProfile] = useState<Profile | null>(null);
    const [profileInput, setProfileInput] = useState({ nombre: '', cultivo: '', region: '' });
    const [isSavingProfile, setIsSavingProfile] = useState(false);

    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // --- Cargar Perfil ---
    const loadProfile = useCallback(async () => {
        try {
            // Llama a la API para obtener el perfil
            const profile = await fetchProfile();
            setUserProfile(profile);
            setProfileInput({
                nombre: profile.nombre || '',
                cultivo: profile.cultivo || '',
                region: profile.region || ''
            });
        } catch (error: any) {
            console.error("Error loading profile:", error);
            if (user) {
                // El error solo se muestra si el usuario está autenticado.
                if (!error.message.includes("Sesión expirada")) {
                    toast.error("No se pudo cargar la configuración del perfil.");
                }
            }
        }
    }, [user]);

    // --- Guardar Perfil ---
    const handleSaveProfile = async () => {
        setIsSavingProfile(true);
        try {
            const dataToUpdate = {
                nombre: profileInput.nombre,
                cultivo: profileInput.cultivo,
                region: profileInput.region
            };

            const updatedProfile = await updateProfile(dataToUpdate);
            setUserProfile(updatedProfile);
            toast.success("Perfil actualizado con éxito!");
            setShowSettingsModal(false);
        } catch (error: any) {
            toast.error(error.message || "Fallo al guardar el perfil.");
        } finally {
            setIsSavingProfile(false);
        }
    };


    // --- Efectos de ciclo de vida ---
    useEffect(() => {
        // Cargar conversaciones desde localStorage al iniciar
        const savedConvos = localStorage.getItem('conversations');
        if (savedConvos) {
            setConversations(JSON.parse(savedConvos));
        }
        const savedCurrentId = localStorage.getItem('currentChatId');
        if(savedCurrentId) {
            setCurrentId(savedCurrentId);
        }

        // Cargar perfil al iniciar sesión
        if(user) {
            loadProfile();
        }
    }, [user, loadProfile]);

    useEffect(() => {
        // Guardar conversaciones en localStorage cuando cambien
        localStorage.setItem('conversations', JSON.stringify(conversations));
        if(currentId) localStorage.setItem('currentChatId', currentId);
    }, [conversations, currentId]);

    useEffect(() => {
        if (typeof document !== 'undefined') {
             document.documentElement.classList.toggle("dark", theme === "dark");
        }
    }, [theme]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [conversations, currentId, isLoading]);

    // --- Manejadores de eventos y lógica ---

    const createNewChat = () => {
        const id = `chat_${Date.now()}`;
        const newConv: Conversation = {
            id,
            title: "Nuevo Chat",
            messages: [],
        };
        setConversations(prev => ({ ...prev, [id]: newConv }));
        setCurrentId(id);
        return id;
    };

    // FUNCIÓN sendMessage MODIFICADA PARA ESTABILIDAD Y STREAMING
    const sendMessage = async () => {
        // Condición de salida si la entrada está vacía o ya está cargando
        if (!input.trim() || isLoading) return;

        const userText = input;

        let chatId = currentId;
        if (!chatId) {
            chatId = createNewChat();
        }

        const currentChatId = chatId;

        const userMessage: Message = {
            role: "user",
            content: userText,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        // 1. Agregar mensaje del usuario y crear burbuja vacía del asistente en UNA SOLA OPERACIÓN
        // Esto previene la pérdida del mensaje del usuario y asegura que el índice sea correcto.
        let assistantMessageIndex = -1;

        setConversations(prev => {
            const newConversations = { ...prev };
            const conv = newConversations[currentChatId];

            if (!conv) return prev;

            conv.messages.push(userMessage);

            // Actualizar título si es el primer mensaje
            if (conv.messages.length === 1) {
                conv.title = userText.slice(0, 30) + (userText.length > 30 ? "..." : "");
            }

            // Añadir el mensaje inicial vacío del asistente
            const initialAssistantMessage: Message = {
                role: "assistant",
                content: "...", // Placeholder de carga
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            };
            conv.messages.push(initialAssistantMessage);

            // Capturamos el índice inmediatamente después de la creación
            assistantMessageIndex = conv.messages.length - 1;

            return newConversations;
        });

        setInput("");
        setIsLoading(true);

        try {
            // 2. Llamada al backend que devuelve el stream (objeto Response)
            const response = await sendMessageToBackend(userText);

            if (!response.body) {
                throw new Error("La respuesta del servidor no tiene un cuerpo de lectura (body).");
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            let fullAssistantResponse = "";

            // 3. Leer el stream y actualizar el estado
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);

                // Procesamos los fragmentos de texto (SSE: data:...)
                const lines = chunk.split('\n').filter(line => line.startsWith('data: '));
                const textPart = lines.map(line => line.replace(/^data: /, '')).join('');

                if (textPart === '[DONE]') break;

                fullAssistantResponse += textPart;

                // Aplicar el chunk al mensaje del asistente usando el índice capturado
                setConversations(prev => {
                    const newConversations = { ...prev };
                    const conv = newConversations[currentChatId];

                    if (conv && conv.messages[assistantMessageIndex]) {
                        conv.messages[assistantMessageIndex].content = fullAssistantResponse;
                    }

                    return newConversations;
                });
            }

            // 4. Asegurar el estado final después del streaming
            setConversations(prev => {
                 const newConversations = { ...prev };
                 const conv = newConversations[currentChatId];

                 if (conv && conv.messages[assistantMessageIndex]) {
                    conv.messages[assistantMessageIndex].timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    conv.messages[assistantMessageIndex].content = fullAssistantResponse.trim() || "Respuesta incompleta.";
                 }
                 return newConversations;
            });

        } catch (error: any) {
            // Manejo de errores de red o servidor
            toast.error(error.message);

            const errorMessage: Message = {
                role: "assistant",
                content: `❌ Error de Stream: ${error.message}`,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            };

            // Manejo de errores en caso de fallo del stream
            setConversations(prev => {
                const newConversations = { ...prev };
                const conv = newConversations[currentChatId];

                if (conv) {
                    conv.messages.push(errorMessage);
                }

                return newConversations;
            });

            if (error.message.includes("Sesión expirada")) {
                logout();
            }
        } finally {
            setIsLoading(false);
        }
    };

    const deleteConversation = (id: string) => {
        setConversations(prev => {
            const newConvs = { ...prev };
            delete newConvs[id];
            return newConvs;
        });
        if (currentId === id) {
            const remaining = Object.keys(conversations).filter(key => key !== id);
            // Al eliminar, establecemos el chat actual en el último de la lista o a null
            setCurrentId(remaining.length > 0 ? remaining[remaining.length - 1] : null);
        }
    };

    const startRenaming = (id: string, currentTitle: string) => {
        setEditingId(id);
        setEditingTitle(currentTitle);
    };

    const saveRename = () => {
        if (editingId && editingTitle.trim()) {
            setConversations(prev => ({
                ...prev,
                [editingId]: { ...prev[editingId], title: editingTitle.trim() },
            }));
        }
        setEditingId(null);
        setEditingTitle("");
    };

    const filteredConversations = Object.values(conversations)
        .reverse()
        .filter(conv => conv.title.toLowerCase().includes(searchQuery.toLowerCase()));

    const currentConversation = currentId ? conversations[currentId] : null;
    const showEmptyState = !currentConversation || currentConversation.messages.length === 0;

    return (
        <div className="flex h-screen overflow-hidden bg-background relative">
            <div className="agricultural-pattern" />

            {/* --- Barra Lateral --- */}
            <aside className="w-[280px] border-r border-sidebar-border bg-sidebar/95 backdrop-blur-sm flex flex-col relative z-10">
                <div className="p-4">
                    <div className="flex items-center gap-3 p-4 rounded-2xl glass-effect glow-primary">
                         {/* Asumo que 'logo-yaqui.png' está en la carpeta /public */}
                         <img src="/logo-yaqui.png" alt="SIARI Logo" className="h-16 w-16 object-contain logo-pulse" />
                        <div>
                            <h1 className="font-display font-black text-2xl tracking-tight text-sidebar-foreground">SIARI</h1>
                            <p className="text-[9px] text-muted-foreground font-bold tracking-widest uppercase">AI Agrícola</p>
                        </div>
                    </div>
                </div>
                <div className="px-4 pb-3">
                    <p className="text-sm text-sidebar-foreground/70 font-medium">
                        Bienvenido, <span className="font-semibold text-primary">{user?.username}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                        Cultivo: <span className="font-medium text-foreground">{userProfile?.cultivo || 'No definido'}</span>
                    </p>
                </div>
                <div className="px-4 pb-3">
                    <Button onClick={createNewChat} className="w-full justify-start gap-2" size="lg">
                        <Plus className="h-5 w-5" /> Nuevo chat
                    </Button>
                </div>
                <div className="px-4 pb-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-sidebar-foreground/60" />
                        <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Buscar chats..." className="pl-9 bg-sidebar-accent border-sidebar-border" />
                    </div>
                </div>
                <Separator className="bg-sidebar-border" />
                <ScrollArea className="flex-1 px-3 py-2" type="always">
                    <div className="space-y-1">
                        {filteredConversations.map((conv) => (
                            <div key={conv.id} className={cn("group relative rounded-lg transition-all", currentId === conv.id && "bg-sidebar-accent")}>
                                {editingId === conv.id ? (
                                    <div className="flex items-center gap-1 p-2">
                                        <Input value={editingTitle} onChange={(e) => setEditingTitle(e.target.value)} autoFocus onKeyDown={(e) => e.key === 'Enter' && saveRename()} className="h-8"/>
                                        <Button size="icon" variant="ghost" onClick={saveRename} className="h-8 w-8"><Check className="h-4 w-4"/></Button>
                                        <Button size="icon" variant="ghost" onClick={() => setEditingId(null)} className="h-8 w-8"><X className="h-4 w-4"/></Button>
                                    </div>
                                ) : (
                                     <div className="flex items-center">
                                        <button onClick={() => setCurrentId(conv.id)} className="flex-1 text-left px-3 py-2.5 hover:bg-sidebar-accent/50 text-sm font-medium rounded-lg">
                                            <div className="flex items-center gap-2">
                                                <MessageSquare className="h-4 w-4 flex-shrink-0 text-muted-foreground"/>
                                                <span className="truncate">{conv.title}</span>
                                            </div>
                                        </button>
                                        <div className="flex items-center opacity-0 group-hover:opacity-100 pr-2">
                                             <Button size="icon" variant="ghost" onClick={() => startRenaming(conv.id, conv.title)} className="h-7 w-7"><Edit2 className="h-3.5 w-3.5"/></Button>
                                             <Button size="icon" variant="ghost" onClick={() => deleteConversation(conv.id)} className="h-7 w-7 text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5"/></Button>
                                        </div>
                                     </div>
                                )}
                            </div>
                        ))}
                    </div>
                </ScrollArea>
                <div className="p-4 border-t border-sidebar-border space-y-3">
                    <Button variant="ghost" onClick={() => setShowSettingsModal(true)} className="w-full justify-start gap-3"><Settings className="h-4 w-4" /> Configuración</Button>
                    <Button variant="ghost" onClick={logout} className="w-full justify-start gap-3 text-destructive hover:text-destructive"><LogOut className="h-4 w-4" /> Cerrar Sesión</Button>
                </div>
            </aside>

            {/* --- Contenido Principal --- */}
            <main className="flex-1 flex flex-col overflow-hidden relative z-10">
                <header className="border-b border-border bg-card/50 backdrop-blur-sm flex-shrink-0">
                    <div className="flex items-center justify-end px-6 py-3">
                        <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="rounded-full">
                            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                        </Button>
                    </div>
                </header>

                {showEmptyState ? (
                    <div className="flex-1 flex items-center justify-center p-6 text-center">
                        <div>
                             <img src="/logo-yaqui.png" alt="SIARI Logo" className="h-32 w-32 mx-auto mb-4 logo-pulse"/>
                            <h2 className="font-display text-5xl font-black">¿En qué puedo ayudarte hoy?</h2>
                            <p className="text-xl text-muted-foreground mt-2">Soy <span className="text-primary font-bold">SIARI</span>, tu asistente de IA para agricultura.</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 overflow-hidden">
                        <ScrollArea className="h-full" type="always">
                            <div className="max-w-3xl mx-auto p-6 space-y-6">
                                {currentConversation?.messages.map((message, index) => (
                                    <div key={index} className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}>
                                        <div className={cn("max-w-[85%] rounded-2xl px-4 py-3 shadow-sm border", message.role === "user" ? "bg-user-bubble" : "bg-ai-bubble")}>
                                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                                            <p className="text-[10px] text-muted-foreground mt-2 text-right">{message.timestamp}</p>
                                        </div>
                                    </div>
                                ))}
                                {isLoading && (
                                     <div className="flex justify-start">
                                        <div className="bg-ai-bubble border rounded-2xl p-3">
                                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                        </ScrollArea>
                    </div>
                )}

                <div className="border-t border-border bg-card/50 backdrop-blur-sm p-4">
                    <div className="max-w-3xl mx-auto flex items-end gap-2">
                        <Button size="icon" variant="ghost" className="h-12 w-12 rounded-2xl flex-shrink-0"><Plus className="h-5 w-5" /></Button>
                        <Input
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && sendMessage()}
                            placeholder="Escribe tu mensaje..."
                            disabled={!user || isLoading} // Deshabilitar si no hay usuario o está cargando
                            className="flex-1 pr-12 py-6 text-base rounded-2xl"
                        />
                        <Button onClick={sendMessage} disabled={!input.trim() || isLoading} size="icon" className="h-12 w-12 rounded-2xl flex-shrink-0">
                            <Send className="h-5 w-5" />
                        </Button>
                    </div>
                </div>
            </main>

            {/* --- Modal de Configuración (NUEVO CONTENIDO) --- */}
            <Dialog open={showSettingsModal} onOpenChange={setShowSettingsModal}>
                <DialogContent className="max-w-xl">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                           <Settings className="h-6 w-6 text-primary" /> Configuración de Usuario
                        </DialogTitle>
                        <DialogDescription>Personaliza tu perfil y preferencias de SIARI.</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2"><User className="h-5 w-5" /> Perfil Agrícola</h3>
                        <Input
                            placeholder="Tu nombre (Ej: José Carlos)"
                            value={profileInput.nombre}
                            onChange={e => setProfileInput(prev => ({ ...prev, nombre: e.target.value }))}
                        />
                         <Input
                            placeholder="Cultivo Principal (Ej: Maíz)"
                            value={profileInput.cultivo}
                            onChange={e => setProfileInput(prev => ({ ...prev, cultivo: e.target.value }))}
                        />
                        <Input
                            placeholder="Región/Ubicación (Ej: Sonora)"
                            value={profileInput.region}
                            onChange={e => setProfileInput(prev => ({ ...prev, region: e.target.value }))}
                        />
                    </div>

                    <div className="mt-4">
                        <Button onClick={handleSaveProfile} disabled={isSavingProfile} className="w-full">
                            {isSavingProfile ? <Loader2 className="animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                            {isSavingProfile ? 'Guardando...' : 'Guardar Cambios'}
                        </Button>
                    </div>

                </DialogContent>
            </Dialog>

        </div>
    );
}
