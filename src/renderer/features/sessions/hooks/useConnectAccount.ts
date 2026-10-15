/**
 * Provider account-connect flows — the ONE provider dispatch layer.
 *
 * Both connect surfaces (sessions/ConnectAccountModal for workspace
 * accounts, marketplace/MarketplaceLoginForm for provider onboarding)
 * used to hand-roll per-provider if/else chains against googleApi/
 * officeApi/githubApi. This hook is the single dispatch; consumers
 * never touch provider api modules directly.
 */

import { useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { googleApi, officeApi, githubApi, sessionApi } from "@core/api/client";
import { SessionStatus } from "@core/types";
import { sessionKeys } from "@features/sessions/hooks/useSessionData";

export type ProviderKind = "GOOGLE" | "OFFICE" | "GITHUB";

export interface ConnectInitiateInput {
    provider: ProviderKind;
    email: string;
    /** The browser fingerprint the api layer accepts (loose wire shape). */
    fingerprint: unknown;
}

export interface ConnectPasswordInput {
    provider: ProviderKind;
    /** Google/Office: the login sessionId; GitHub: the email (used as username). */
    sessionId: string;
    email: string;
    password: string;
    /** The browser fingerprint the api layer accepts (loose wire shape). */
    fingerprint: unknown;
}

export interface Connect2FAInput {
    provider: ProviderKind;
    sessionId: string;
    code: string;
}

export interface Switch2FAInput {
    provider: ProviderKind;
    sessionId: string;
    method: string;
}

/**
 * initiateLogin / submitPassword / submit2FA — per-provider dispatch.
 * Mutations ride React Query; a successful AUTHENTICATED response
 * invalidates the sessions list so the UI reflects the new session
 * without a manual refresh.
 */
export function useConnectAccount() {
    const queryClient = useQueryClient();

    const onAuthenticated = useCallback(() => {
        void queryClient.invalidateQueries({ queryKey: sessionKeys.all });
    }, [queryClient]);

    const initiate = useMutation({
        mutationFn: async ({ provider, email, fingerprint }: ConnectInitiateInput) => {
            if (provider === "GOOGLE") {
                return googleApi.initiateLogin({ email, fingerprint });
            }
            if (provider === "OFFICE") {
                return officeApi.initiateLogin({ email, fingerprint });
            }
            throw new Error("GitHub has no initiate step — use submitPassword directly");
        },
    });

    const submitPassword = useMutation({
        mutationFn: async ({
            provider,
            sessionId,
            email,
            password,
            fingerprint,
        }: ConnectPasswordInput) => {
            if (provider === "GOOGLE") {
                return googleApi.submitPassword({ sessionId, password });
            }
            if (provider === "OFFICE") {
                return officeApi.submitPassword({ sessionId, password });
            }
            // GitHub logs in with credentials in one shot
            return githubApi.login({ username: email, password, fingerprint });
        },
        onSuccess: (response) => {
            if (response.success && response.status === "AUTHENTICATED") {
                onAuthenticated();
            }
        },
    });

    const submit2FA = useMutation({
        mutationFn: async ({ provider, sessionId, code }: Connect2FAInput) => {
            if (provider === "GOOGLE") {
                return googleApi.submit2FA({ sessionId, code });
            }
            if (provider === "OFFICE") {
                return officeApi.submit2FA({ sessionId, code });
            }
            return githubApi.submit2FA({ sessionId, code });
        },
        onSuccess: (response) => {
            if (response.success && response.status === "AUTHENTICATED") {
                onAuthenticated();
            }
        },
    });

    const switch2FA = useMutation({
        mutationFn: async ({ provider, sessionId, method }: Switch2FAInput) => {
            if (provider !== "GITHUB") {
                throw new Error("Switching methods not supported for this provider");
            }
            return githubApi.switch2FA({ sessionId, method });
        },
    });

    return {
        initiate,
        submitPassword,
        submit2FA,
        switch2FA,
    };
}

/** Poll a session until it reports AUTHENTICATED (GitHub push approval). */
export function useSessionAuthPolling() {
    const queryClient = useQueryClient();
    return useCallback(
        async (sessionId: string): Promise<boolean> => {
            const session = await sessionApi.get(sessionId);
            const authenticated = session?.status === SessionStatus.AUTHENTICATED;
            if (authenticated) {
                void queryClient.invalidateQueries({ queryKey: sessionKeys.all });
            }
            return authenticated;
        },
        [queryClient],
    );
}