/**
 * React Query client — one shared QueryClient for the desktop renderer.
 *
 * Defaults tuned for an Electron shell: no window-focus refetching
 * (window focus is meaningless in a desktop app), retries only twice
 * because the backend is localhost or a single remote origin.
 */

import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: 2,
            staleTime: 15_000,
        },
        mutations: {
            retry: 0,
        },
    },
});