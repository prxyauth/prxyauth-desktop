/**
 * Shared Type Definitions
 * Mirrors backend DTOs for type safety across the application
 */

export enum BrowserMode {
  PLAYWRIGHT = "PLAYWRIGHT",
  GOLOGIN = "GOLOGIN",
  BROWSERLESS = "BROWSERLESS",
}

export enum PaymentMethod {
  TRON = "TRON",
}

export enum PaymentTransactionStatus {
  PENDING = "PENDING",
  PAID = "PAID",
  FAILED = "FAILED",
  EXPIRED = "EXPIRED",
}

export enum Provider {
  GOOGLE = "GOOGLE",
  OFFICE = "OFFICE",
  GITHUB = "GITHUB",
  FACEBOOK = "FACEBOOK",
}

export enum ProxyProvider {
  OXYLABS = "OXYLABS",
  BRIGHTDATA = "BRIGHTDATA",
  FLOPPYDATA = "FLOPPYDATA",
}

export enum SessionStatus {
  PENDING = "PENDING",
  AUTHENTICATED = "AUTHENTICATED",
  EXPIRED = "EXPIRED",
  FAILED = "FAILED",
  REQUIRES_2FA = "REQUIRES_2FA",
  REQUIRES_PASSWORD = "REQUIRES_PASSWORD",
  STALE = "STALE",
  AUTHENTICATING = "AUTHENTICATING",
}

export enum TenantLicenseStatus {
  ACTIVE = "ACTIVE",
  PAST_DUE = "PAST_DUE",
  CANCELED = "CANCELED",
  EXPIRED = "EXPIRED",
}

export enum UserRole {
  ADMIN = "ADMIN",
  USER = "USER",
}

// ============================================================================
// Session Types
// ============================================================================

export interface Fingerprint {
  // Core Identity
  userAgent: string;
  userAgentMetadata: {
    brands: { brand: string; version: string }[];
    fullVersionList: { brand: string; version: string }[];
    mobile: boolean;
    model: string;
    platform: string;
    platformVersion: string;
    architecture: string;
    bitness: string;
  };

  // Environment
  screen: {
    width: number;
    height: number;
    availWidth: number;
    availHeight: number;
    colorDepth: number;
    pixelDepth: number;
  };
  viewport: { width: number; height: number };
  deviceScaleFactor: number;

  // Capabilities
  hardwareConcurrency: number;
  deviceMemory: number;
  isMobile: boolean;
  hasTouch: boolean;

  // Locale / Region
  language: string;
  timezoneId: string;

  // Graphics
  webgl: {
    vendor: string;
    renderer: string;
  };

  // Geolocation (matches proxy country)
  geolocation?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };

  // Internal
  seed: string;
  proxyIp?: string;
}

export interface Session {
  id: string;
  email: string;
  status: SessionStatus;
  provider?: Provider;
  browserMode?: BrowserMode;
  fingerprint?: Fingerprint;
  password?: string;
  proxy?: {
    server: string;
    username?: string;
    password?: string;
    externalIp?: string;
    country?: string;
    city?: string;
    region?: string;
    timezone?: string;
  };
  ipAddress?: string;
  lastUrl?: string;
  lastUsedAt?: string;
  createdAt: string;
  expiresAt: string;
  twoFactorChallenge?: string;
}

// ============================================================================
// Request/Response DTOs
// ============================================================================

export interface InitiateLoginRequest {
  email: string;
  fingerprint?: any;
}

export interface SubmitPasswordRequest {
  sessionId: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  sessionId?: string;
  status?: SessionStatus;
  message: string;
  error?: string;
  challengeType?:
    | "TOTP"
    | "SMS"
    | "EMAIL"
    | "PUSH"
    | "BACKUP"
    | "SECURITY_KEY"
    | "APP";
  challengeMetadata?: any;
}

export interface Submit2FARequest {
  sessionId: string;
  code?: string;
}

export interface Switch2FARequest {
  sessionId: string;
  method: string;
}

export interface LogoutResponse {
  success: boolean;
  message: string;
}

export interface SessionResponse {
  success: boolean;
  data?: Session;
  error?: string;
}

export interface SessionListResponse {
  success: boolean;
  data?: Session[];
  error?: string;
}

export interface HealthResponse {
  status: string;
  timestamp: string;
  version: string;
}

// ============================================================================
// Generic API Response Wrapper
// ============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ============================================================================
// User Authentication Types
// ============================================================================

export interface AuthUser {
  id: string;
  email: string;
  tenantId: string;
  role: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: { user: AuthUser; token: string };
}

export interface RegisterRequest {
  email: string;
  password: string;
  tenantName: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

// ============================================================================
// Billing & Provisioning Types
// ============================================================================

export interface ProvisioningData {
  provider: Provider;
  vercelImportUrl: string;
  githubForkUrl: string;
  vercelDeployUrl: string;
  setupCommand: string;
  envContent: string;
  readmeContent: string;
}

/**
 * Provider subscription license details
 */
export interface ProviderLicense {
  provider: Provider;
  planType: string;
  status: "ACTIVE" | "PAST_DUE" | "CANCELED" | "EXPIRED";
  startDate: string;
  expiresAt: string;
}

export interface CheckoutResponseData {
  paymentUrl: string;
  invoiceId: string;
  transactionId: string;
  provider?: Provider;
  expiresAt?: string;
}

export interface VerifyPaymentResponse {
  success: boolean;
  status: "PAID" | "PENDING" | "FAILED" | "EXPIRED";
  amountPaid?: number;
}

// ============================================================================
// API Key Types
// ============================================================================

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: string | null;
  createdAt: string;
  expiresAt: string | null;
}

export interface GenerateApiKeyRequest {
  name: string;
  expiresAt?: string;
}

export interface GenerateApiKeyResponse {
  success: boolean;
  data?: { key: string; id: string; prefix: string };
  error?: string;
}

export interface ApiKeyListResponse {
  success: boolean;
  data?: ApiKey[];
  error?: string;
}
// ============================================================================
// Proxy Types
// ============================================================================

export interface ProxyConfig {
  server: string;
  username?: string;
  password?: string;
  externalIp?: string;
  country?: string;
  city?: string;
  region?: string;
  timezone?: string;
}

export interface ProxyHealthInfo {
  server: string;
  ip: string;
  usageCount: number;
  isHealthy: boolean;
}

export interface ProxyPoolStats {
  total: number;
  healthy: number;
  unhealthy: number;
  proxies: ProxyHealthInfo[];
}

export interface ProxyValidateResponse {
  success: boolean;
  data?: {
    ip: string;
    latency: number;
    message: string;
  };
  error?: string;
}

export interface ProxyPoolResponse {
  success: boolean;
  message?: string;
  data?: ProxyPoolStats;
  error?: string;
}

// ============================================================================
// Proxy Provider Types
// ============================================================================

export type ProxyProviderType = "OXYLABS" | "BRIGHTDATA" | "FLOPPYDATA";

export interface ProxyProviderConfig {
  id: string;
  provider: ProxyProviderType;
  isEnabled: boolean;
  priority: number;
  username?: string;
  customerId?: string;
  zone?: string;
  hasCredentials: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SaveProviderRequest {
  provider: ProxyProviderType;
  username?: string;
  password: string;
  customerId?: string;
  zone?: string;
  priority?: number;
}

export interface ProxyProviderListResponse {
  success: boolean;
  data?: ProxyProviderConfig[];
  error?: string;
}

export interface ProxyProviderSaveResponse {
  success: boolean;
  message?: string;
  data?: {
    id: string;
    provider: ProxyProviderType;
    isEnabled: boolean;
    priority: number;
    hasCredentials: boolean;
  };
  error?: string;
}

export interface ProxyProviderTestResponse {
  success: boolean;
  message?: string;
  data?: { ip: string };
  error?: string;
}
// ============================================================================
// Notification Types
// ============================================================================

export interface NotificationSettings {
  hasToken: boolean;
  chatId: string | null;
}

export interface SaveNotificationRequest {
  botToken: string;
  chatId: string;
}

export interface VncEndpoints {
  success: boolean;
  vncUrl: string;
  wsUrl: string;
}
