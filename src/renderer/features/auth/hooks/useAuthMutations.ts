/**
 * Auth slice data hooks — React Query.
 *
 * login/register are mutations that carry identity side effects
 * (localStorage + context state), so they stay in AuthContext but ride
 * the mutation pipeline for loading/error semantics. logout clears the
 * ENTIRE query cache — no authenticated data may survive a logout.
 */

import { useMutation } from "@tanstack/react-query";
import { authApi } from "@core/api/client";
import type { LoginRequest, RegisterRequest } from "@core/types";

/** Credential login. Returns { user, token } on success — caller persists. */
export function useLogin() {
    return useMutation({
        mutationFn: async (data: LoginRequest) => {
            const response = await authApi.login(data);
            if (response.success && response.data) {
                return response.data;
            }
            throw new Error(response.message || "Login failed");
        },
    });
}

/** Account registration (auto-login on success). */
export function useRegister() {
    return useMutation({
        mutationFn: async (data: RegisterRequest) => {
            const response = await authApi.register(data);
            if (response.success && response.data) {
                return response.data;
            }
            throw new Error(response.message || "Registration failed");
        },
    });
}