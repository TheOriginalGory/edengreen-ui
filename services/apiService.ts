const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";

/**
 * Obtiene el token de autenticación del localStorage.
 */
const getToken = (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('authToken');
};

/**
 * Maneja errores de autenticación, cierra la sesión y lanza una excepción.
 */
const handleAuthError = (status: number) => {
    if (status === 401) {
        logoutUser();
        throw new Error('Sesión expirada. Por favor, inicie sesión de nuevo.');
    }
};

// --- AUTHENTICATION ---

/**
 * Realiza una solicitud de registro de usuario.
 */
export const registerUser = async (userData: any) => {
    const response = await fetch(`${BACKEND_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error en el registro');
    }
    return response.json();
};

/**
 * Realiza una solicitud de inicio de sesión.
 */
export const loginUser = async (credentials: any) => {
    const formData = new URLSearchParams();
    formData.append('username', credentials.username);
    formData.append('password', credentials.password);

    const response = await fetch(`${BACKEND_URL}/auth/login`, {
        method: 'POST',
        // Importante: Usamos x-www-form-urlencoded para el login de FastAPI
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString(),
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al iniciar sesión');
    }
    const data = await response.json();
    // Guardar el token en localStorage después de un login exitoso
    if (typeof window !== 'undefined') {
        localStorage.setItem('authToken', data.access_token);
    }
    return data;
};

/**
 * Cierra la sesión eliminando el token.
 */
export const logoutUser = () => {
    if (typeof window !== 'undefined') {
        localStorage.removeItem('authToken');
    }
};

/**
 * Obtiene los datos del usuario actual (usado para AuthContext).
 */
export const getCurrentUser = async () => {
    const token = getToken();
    if (!token) return null;

    try {
        const response = await fetch(`${BACKEND_URL}/users/me`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        if (!response.ok) {
            handleAuthError(response.status);
            return null;
        }
        return response.json();
    } catch (error: any) {
        console.error("Error fetching user:", error);
        return null;
    }
};

// --- CHAT AND STREAMING ---

/**
 * Envía un mensaje al endpoint protegido del backend.
 * Devuelve el objeto Response streamable, no el JSON completo.
 */
export const sendMessageToBackend = async (userInput: string): Promise<Response> => {
    const token = getToken();
    if (!token) {
        throw new Error('Usuario no autenticado. Por favor, inicie sesión.');
    }

    // CORRECCIÓN: Usamos URLSearchParams, que es compatible con el Form(...) de FastAPI
    const formData = new URLSearchParams();
    formData.append('user_input', userInput);

    const response = await fetch(`${BACKEND_URL}/interpret`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/x-www-form-urlencoded', // Aseguramos el header correcto para FastAPI Form(...)
        },
        body: formData.toString(), // Enviamos como string URL-encoded
    });

    if (!response.ok) {
        handleAuthError(response.status);
        // Si el backend envía un 400/500, intentamos leer el detalle del error
        try {
            const errorData = await response.json();
            throw new Error(errorData.detail || `Error ${response.status}: Error interno del servidor.`);
        } catch {
             throw new Error(`Error ${response.status}: Falló la conexión al interpretar la respuesta.`);
        }
    }
    // Devolvemos la respuesta completa para que el componente de chat lea el stream
    return response;
};

// --- PERFIL DE USUARIO (NUEVAS FUNCIONES) ---

/**
 * Obtiene el perfil del usuario actual.
 */
export const fetchProfile = async () => {
    const token = getToken();
    if (!token) throw new Error('Usuario no autenticado.');

    const response = await fetch(`${BACKEND_URL}/profile/`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        handleAuthError(response.status);
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Fallo al obtener el perfil.');
    }
    return response.json();
};

/**
 * Actualiza el perfil del usuario actual.
 */
export const updateProfile = async (profileData: { nombre: string; cultivo: string; region: string }) => {
    const token = getToken();
    if (!token) throw new Error('Usuario no autenticado.');

    const response = await fetch(`${BACKEND_URL}/profile/update`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(profileData),
    });

    if (!response.ok) {
        handleAuthError(response.status);
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Fallo al actualizar el perfil.');
    }
    return response.json();
};
