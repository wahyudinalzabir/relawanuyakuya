import { Relawan, User, DashboardStats, AuditLog, KtpOcrData } from '../types';

let currentAuthToken = localStorage.getItem('auth_token') || '';

export function setAuthToken(token: string) {
  currentAuthToken = token;
  localStorage.setItem('auth_token', token);
}

export function clearAuthToken() {
  currentAuthToken = '';
  localStorage.removeItem('auth_token');
}

export function getAuthToken(): string {
  return currentAuthToken;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (currentAuthToken) {
    headers.set('Authorization', `Bearer ${currentAuthToken}`);
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `HTTP error! Status: ${response.status}`);
  }

  return data as T;
}

export const api = {
  // Auth
  async login(username: string, password?: string) {
    const res = await request<{ success: boolean; user: User; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    if (res.token) setAuthToken(res.token);
    return res;
  },

  async getMe() {
    return request<{ user: User | null }>('/api/auth/me');
  },

  // Users
  async getUsers() {
    return request<{ users: User[] }>('/api/users');
  },

  async createUser(userData: {
    username: string;
    name: string;
    password: string;
    role: string;
    kelurahan_assigned?: string;
    rw_assigned?: string;
    phone?: string;
  }) {
    return request<{ success: boolean; user: User }>('/api/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  async updateUser(id: string, userData: Partial<User> & { password?: string }) {
    return request<{ success: boolean; user: User }>(`/api/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  },

  async deleteUser(id: string) {
    return request<{ success: boolean }>(`/api/users/${id}`, {
      method: 'DELETE',
    });
  },

  // OCR
  async scanKtp(imageBase64: string, mimeType: string = 'image/jpeg') {
    return request<{
      success: boolean;
      data: KtpOcrData;
      duplicate: { isDuplicate: boolean; existingRelawan?: Relawan };
    }>('/api/ocr-ktp', {
      method: 'POST',
      body: JSON.stringify({ imageBase64, mimeType }),
    });
  },

  async checkNik(nik: string) {
    return request<{ exists: boolean; relawan?: Relawan }>(`/api/relawan/check-nik/${encodeURIComponent(nik)}`);
  },

  // Wilayah Hierarchy
  async getWilayahHierarchy() {
    return request<{
      hierarchy: Record<string, Record<string, Record<string, Record<string, string[]>>>>;
    }>('/api/wilayah/hierarchy');
  },

  // Dashboard Stats
  async getDashboardStats(filters: Record<string, string | undefined> = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v) params.append(k, v);
    });
    return request<DashboardStats>(`/api/dashboard/stats?${params.toString()}`);
  },

  // Reports Drill-down
  async getDrilldownReport(params: {
    level: string;
    kecamatan?: string;
    kelurahan?: string;
    rw?: string;
    rt?: string;
    tps?: string;
  }) {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v) q.append(k, v);
    });
    return request<{ level: string; parent?: string; data: any[] }>(`/api/reports/drilldown?${q.toString()}`);
  },

  // Relawan CRUD
  async getRelawan(params: Record<string, any> = {}) {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') q.append(k, String(v));
    });
    return request<{
      items: Relawan[];
      total: number;
      page: number;
      totalPages: number;
    }>(`/api/relawan?${q.toString()}`);
  },

  async getRelawanById(id: string) {
    return request<{ relawan: Relawan }>(`/api/relawan/${id}`);
  },

  async createRelawan(relawanData: Partial<Relawan>) {
    return request<{ success: boolean; relawan: Relawan }>('/api/relawan', {
      method: 'POST',
      body: JSON.stringify(relawanData),
    });
  },

  async updateRelawan(id: string, relawanData: Partial<Relawan>) {
    return request<{ success: boolean; relawan: Relawan }>(`/api/relawan/${id}`, {
      method: 'PUT',
      body: JSON.stringify(relawanData),
    });
  },

  async deleteRelawan(id: string) {
    return request<{ success: boolean; message: string }>(`/api/relawan/${id}`, {
      method: 'DELETE',
    });
  },

  // Audit Logs
  async getAuditLogs() {
    return request<{ logs: AuditLog[] }>('/api/audit-logs');
  },

  // Export
  async exportGoogleSheets(filterType: string, filterValue: string, format: string = 'sheets') {
    return request<{
      success: boolean;
      totalExported: number;
      headers: string[];
      rows: string[][];
      filterApplied: any;
      timestamp: string;
    }>('/api/export/sheets', {
      method: 'POST',
      body: JSON.stringify({ filterType, filterValue, format }),
    });
  },
};
