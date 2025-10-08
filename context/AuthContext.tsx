// context/AuthContext.tsx
'use client';

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { getCurrentUser, logoutUser } from '@/services/apiService';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react'; // Importar Loader2 para el spinner

interface AuthContextType {
    isAuthenticated: boolean;
    user: any;
    login: (token: string) => void;
    logout: () => void;
    checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<any>(null);
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(true);

    const checkAuth = async () => {
        // Mantenemos loading en true hasta que la verificación termine
        setLoading(true);
        try {
            // Llama al backend para validar el token JWT guardado
            const userData = await getCurrentUser();
            // Verifica que userData tenga una ID (o cualquier campo clave) para confirmar autenticación
            if (userData && userData.id) {
                setUser(userData);
                setIsAuthenticated(true);
            } else {
                // Si falla o no hay token, se considera no autenticado
                setUser(null);
                setIsAuthenticated(false);
            }
        } catch (error) {
            console.error("Error checking auth status:", error);
            // Asegura que, si hay un error de red al inicio, la aplicación no se rompa
            setUser(null);
            setIsAuthenticated(false);
        } finally {
            // SOLO AQUÍ cambiamos loading a false, permitiendo el renderizado final
            setLoading(false);
        }
    };

    useEffect(() => {
        checkAuth();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const login = (token: string) => {
        localStorage.setItem('authToken', token);
        checkAuth();
    };

    const logout = () => {
        logoutUser();
        setUser(null);
        setIsAuthenticated(false);
    };

    // Muestra un esqueleto de carga mientras se verifica la autenticación
    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <div className="space-y-4">
                    {/* El esqueleto de carga se renderiza ANTES que todo lo demás */}
                    <p className="text-muted-foreground text-sm text-center">Cargando aplicación...</p>
                    <div className="flex items-center justify-center">
                        <Loader2 className="h-16 w-16 text-primary animate-spin" />
                    </div>
                    <Skeleton className="h-8 w-64" />
                </div>
            </div>
        );
    }


    return (
        <AuthContext.Provider value={{ isAuthenticated, user, login, logout, checkAuth }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth debe ser usado dentro de un AuthProvider');
    }
    return context;
};
