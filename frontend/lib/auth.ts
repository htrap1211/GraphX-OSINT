// Simple JWT-based auth without backend database
// Uses browser localStorage for session management

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  hasCompletedOnboarding: boolean;
}

export interface ApiKeys {
  hunter?: string;
  shodan?: string;
  virustotal?: string;
  urlscan?: string;
  alienvault?: string;
}

const AUTH_KEY = 'osint_auth_token';
const USER_KEY = 'osint_user';
const API_KEYS_KEY = 'osint_api_keys';
const ONBOARDING_KEY = 'osint_onboarding_complete';

// Simple encryption for API keys (client-side only)
const encryptKey = (key: string): string => {
  return btoa(key); // Base64 encoding (use crypto-js for production)
};

const decryptKey = (encrypted: string): string => {
  return atob(encrypted);
};

export const auth = {
  // Check if user is logged in
  isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false; // SSR check
    return !!localStorage.getItem(AUTH_KEY);
  },

  // Get current user
  getCurrentUser(): User | null {
    if (typeof window === 'undefined') return null; // SSR check
    const userStr = localStorage.getItem(USER_KEY);
    if (!userStr) return null;
    return JSON.parse(userStr);
  },

  // Simple login (no backend validation for now)
  login(email: string, name: string): User {
    const user: User = {
      id: crypto.randomUUID(),
      email,
      name,
      createdAt: new Date().toISOString(),
      hasCompletedOnboarding: false,
    };

    const token = btoa(JSON.stringify({ userId: user.id, email }));
    localStorage.setItem(AUTH_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));

    return user;
  },

  // Logout
  logout(): void {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(API_KEYS_KEY);
    localStorage.removeItem(ONBOARDING_KEY);
  },

  // API Keys Management
  saveApiKeys(keys: ApiKeys): void {
    const encrypted: Record<string, string> = {};
    Object.entries(keys).forEach(([provider, key]) => {
      if (key) {
        encrypted[provider] = encryptKey(key);
      }
    });
    localStorage.setItem(API_KEYS_KEY, JSON.stringify(encrypted));
  },

  getApiKeys(): ApiKeys {
    if (typeof window === 'undefined') return {}; // SSR check
    const keysStr = localStorage.getItem(API_KEYS_KEY);
    if (!keysStr) return {};

    const encrypted = JSON.parse(keysStr);
    const decrypted: ApiKeys = {};

    Object.entries(encrypted).forEach(([provider, key]) => {
      if (typeof key === 'string') {
        decrypted[provider as keyof ApiKeys] = decryptKey(key);
      }
    });

    return decrypted;
  },

  hasApiKeys(): boolean {
    const keys = this.getApiKeys();
    return Object.keys(keys).length > 0;
  },

  // Onboarding
  completeOnboarding(): void {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    const user = this.getCurrentUser();
    if (user) {
      user.hasCompletedOnboarding = true;
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
  },

  hasCompletedOnboarding(): boolean {
    if (typeof window === 'undefined') return false; // SSR check
    return localStorage.getItem(ONBOARDING_KEY) === 'true';
  },
};
