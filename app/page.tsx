// app/page.tsx
'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
// Importamos loginUser y registerUser desde el apiService
import { loginUser, registerUser } from '@/services/apiService';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChatInterface } from '@/components/ChatInterface';
import { Loader2 } from 'lucide-react';

// Componente para el formulario de Login
const LoginForm = () => {
    const { login } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const data = await loginUser({ username, password });
            toast.success('¡Bienvenido de nuevo!');
            login(data.access_token);
        } catch (error: any) {
            toast.error(error.message || 'Error al iniciar sesión.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <Input placeholder="Nombre de usuario" value={username} onChange={e => setUsername(e.target.value)} required />
            <Input type="password" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} required />
            <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin" /> : 'Iniciar Sesión'}
            </Button>
        </form>
    );
};

// Componente para el formulario de Registro
const RegisterForm = () => {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await registerUser({ username, email, password });
            toast.success('¡Registro exitoso! Ahora puedes iniciar sesión.');
        } catch (error: any) {
            toast.error(error.message || 'Error en el registro.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <Input placeholder="Nombre de usuario" value={username} onChange={e => setUsername(e.target.value)} required />
            <Input type="email" placeholder="Correo electrónico" value={email} onChange={e => setEmail(e.target.value)} required />
            <Input type="password" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} required />
            <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin" /> : 'Crear Cuenta'}
            </Button>
        </form>
    );
};

// Componente para la página de Autenticación
const AuthPage = () => {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-background p-4 relative">
             <div className="agricultural-pattern" />
             <div className="absolute inset-0 bg-background/50 backdrop-blur-sm" />
            <Tabs defaultValue="login" className="w-[400px] z-10">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
                    <TabsTrigger value="register">Registrarse</TabsTrigger>
                </TabsList>
                <TabsContent value="login">
                    <Card>
                        <CardHeader>
                            <CardTitle>Bienvenido a SIARI</CardTitle>
                            <CardDescription>Tu asistente de IA para la agricultura.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <LoginForm />
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="register">
                    <Card>
                        <CardHeader>
                            <CardTitle>Crea tu cuenta</CardTitle>
                            <CardDescription>Únete a la revolución agrícola con SIARI.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <RegisterForm />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

// Componente principal de la página
export default function HomePage() {
    const { isAuthenticated } = useAuth();

    if (isAuthenticated) {
        return <ChatInterface />;
    }

    return <AuthPage />;
}
