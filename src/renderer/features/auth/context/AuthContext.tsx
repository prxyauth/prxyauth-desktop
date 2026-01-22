/**
 * Auth Context - Manages user authentication state
 */

import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    ReactNode,
} from "react";
import { authApi, ApiError } from "@core/api/client";
import { AuthUser, LoginRequest, RegisterRequest } from "@core/types";

// ============================================================================
// Types
// ============================================================================

interface AuthContextType {
    user: AuthUser | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (data: LoginRequest) => Promise<{ success: boolean; error?: string }>;
    register: (data: RegisterRequest) => Promise<{ success: boolean; error?: string }>;
    logout: () => void;
}

// ============================================================================
// Context
// ============================================================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = "prx_token";
const USER_KEY = "auth_user";

// ============================================================================
// Provider
// ============================================================================

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Hydrate from localStorage on mount
    useEffect(() => {
        const storedToken = localStorage.getItem(TOKEN_KEY);
        const storedUser = localStorage.getItem(USER_KEY);

        if (storedToken && storedUser) {
            try {
                setToken(storedToken);
                setUser(JSON.parse(storedUser));
            } catch {
                // Invalid stored data, clear it
                localStorage.removeItem(TOKEN_KEY);
                localStorage.removeItem(USER_KEY);
            }
        }
        setIsLoading(false);
    }, []);

    const login = useCallback(async (data: LoginRequest) => {
        try {
            const response = await authApi.login(data);

            if (response.success && response.data) {
                const { user: authUser, token: authToken } = response.data;

                setUser(authUser);
                setToken(authToken);
                localStorage.setItem(TOKEN_KEY, authToken);
                localStorage.setItem(USER_KEY, JSON.stringify(authUser));

                return { success: true };
            }

            return { success: false, error: response.message || "Login failed" };
        } catch (error) {
            const message = error instanceof ApiError
                ? error.message
                : "An unexpected error occurred";
            return { success: false, error: message };
        }
    }, []);

    const register = useCallback(async (data: RegisterRequest) => {
        try {
            const response = await authApi.register(data);

            if (response.success && response.data) {
                const { user: authUser, token: authToken } = response.data;

                setUser(authUser);
                setToken(authToken);
                localStorage.setItem(TOKEN_KEY, authToken);
                localStorage.setItem(USER_KEY, JSON.stringify(authUser));

                return { success: true };
            }

            return { success: false, error: response.message || "Registration failed" };
        } catch (error) {
            const message = error instanceof ApiError
                ? error.message
                : "An unexpected error occurred";
            return { success: false, error: message };
        }
    }, []);

    const logout = useCallback(() => {
        setUser(null);
        setToken(null);
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
    }, []);

    const value: AuthContextType = {
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        register,
        logout,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ============================================================================
// Hook
// ============================================================================

export function useAuth(): AuthContextType {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
