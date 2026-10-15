/**
 * Auth Context - Manages user authentication state
 *
 * Mutations ride React Query (useLogin/useRegister) for loading/error
 * semantics; the context persists identity (localStorage + state).
 * logout clears the whole query cache: no authenticated data may
 * survive a logout.
 */

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@core/api/client";
import { AuthUser, LoginRequest, RegisterRequest } from "@core/types";
import { useLogin, useRegister } from "@features/auth/hooks/useAuthMutations";

// ============================================================================
// Types
// ============================================================================

interface AuthContextType {
    user: AuthUser | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    isLoggingIn: boolean;
    isRegistering: boolean;
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
    const queryClient = useQueryClient();
    const [user, setUser] = useState<AuthUser | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const loginMutation = useLogin();
    const registerMutation = useRegister();

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

    const persistIdentity = useCallback((authUser: AuthUser, authToken: string) => {
        setUser(authUser);
        setToken(authToken);
        localStorage.setItem(TOKEN_KEY, authToken);
        localStorage.setItem(USER_KEY, JSON.stringify(authUser));
    }, []);

    const login = useCallback(
        async (data: LoginRequest): Promise<{ success: boolean; error?: string }> => {
            try {
                const { user: authUser, token: authToken } = await loginMutation.mutateAsync(data);
                persistIdentity(authUser, authToken);
                return { success: true };
            } catch (error) {
                const message =
                    error instanceof ApiError ? error.message : "An unexpected error occurred";
                return { success: false, error: message };
            }
        },
        [loginMutation, persistIdentity],
    );

    const register = useCallback(
        async (data: RegisterRequest): Promise<{ success: boolean; error?: string }> => {
            try {
                const { user: authUser, token: authToken } =
                    await registerMutation.mutateAsync(data);
                persistIdentity(authUser, authToken);
                return { success: true };
            } catch (error) {
                const message =
                    error instanceof ApiError ? error.message : "An unexpected error occurred";
                return { success: false, error: message };
            }
        },
        [registerMutation, persistIdentity],
    );

    const logout = useCallback(() => {
        setUser(null);
        setToken(null);
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        // Critical: no authenticated data may survive a logout.
        void queryClient.clear();
    }, [queryClient]);

    const value: AuthContextType = {
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        isLoggingIn: loginMutation.isPending,
        isRegistering: registerMutation.isPending,
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
