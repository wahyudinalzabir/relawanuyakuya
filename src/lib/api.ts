import {
  Relawan,
  User,
  DashboardStats,
  AuditLog,
  KtpOcrData,
  EventItem,
  KehadiranEvent,
  EventStats,
  EventDetailStats,
  FormField,
  EventFormSettings,
  StatusPendaftaran,
  EventRegistration,
  ParticipantRole,
  ParticipantRoleRecord,
} from '../types';

let currentAuthToken = localStorage.getItem('auth_token') || '';

export function setAuthToken(token: string) {
  currentAuthToken = token;
  localStorage.setItem('auth_token', token);
}

export function clearAuthToken() {
  currentAuthToken = '';
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_user');
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
    if (res.user) localStorage.setItem('auth_user', JSON.stringify(res.user));
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

  async restoreRelawan(id: string) {
    return request<{ success: boolean; message: string }>(`/api/relawan/${id}/restore`, {
      method: 'POST',
    });
  },

  async checkBulkNik(niks: string[]) {
    return request<{
      success: boolean;
      existingMap: Record<string, { id: string; nama: string; id_relawan: string }>;
    }>('/api/relawan/check-bulk-nik', {
      method: 'POST',
      body: JSON.stringify({ niks }),
    });
  },

  async bulkImportRelawan(items: Partial<Relawan>[]) {
    return request<{
      success: boolean;
      importedCount: number;
      duplicateCount: number;
      failedCount: number;
      importedItems: Relawan[];
    }>('/api/relawan/bulk-import', {
      method: 'POST',
      body: JSON.stringify({ items }),
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

  // Events & Kehadiran
  async getEvents(params: { status?: string; search?: string } = {}) {
    const q = new URLSearchParams();
    if (params.status) q.append('status', params.status);
    if (params.search) q.append('search', params.search);
    const query = q.toString() ? `?${q.toString()}` : '';
    return request<{ success: boolean; events: (EventItem & { stats: EventDetailStats })[] }>(`/api/events${query}`);
  },

  async createEvent(data: Partial<EventItem>) {
    return request<{ success: boolean; event: EventItem }>('/api/events', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getEventById(id: string) {
    return request<{ success: boolean; event: EventItem & { stats: EventDetailStats } }>(`/api/events/${id}`);
  },

  async updateEvent(id: string, data: Partial<EventItem>) {
    return request<{ success: boolean; event: EventItem }>(`/api/events/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteEvent(id: string) {
    return request<{ success: boolean; message: string }>(`/api/events/${id}`, {
      method: 'DELETE',
    });
  },

  async updateEventForm(
    id: string,
    form_schema: FormField[],
    form_settings: EventFormSettings,
    publish_status?: StatusPendaftaran
  ) {
    return request<{ success: boolean; event: EventItem }>(`/api/events/${id}/form`, {
      method: 'PUT',
      body: JSON.stringify({ form_schema, form_settings, publish_status }),
    });
  },

  // CHECK 1: Realtime lookup for NIK
  async validateNikForEvent(eventId: string, nik: string) {
    return request<{
      eligible: boolean;
      role: ParticipantRole;
      message?: string;
      isDuplicate?: boolean;
      isQuotaFull?: boolean;
      existingRelawan?: { nama: string; kelurahan?: string; rw?: string; rt?: string };
    }>(`/api/events/${eventId}/validate-nik?nik=${encodeURIComponent(nik)}`);
  },

  // CHECK 2: Submit Registration
  async registerEvent(
    eventId: string,
    data: {
      nik: string;
      nama: string;
      nomor_hp?: string;
      source_input?: string;
      data_form: Record<string, any>;
      ktp_image_url?: string;
    }
  ) {
    return request<{
      success: boolean;
      registration: EventRegistration;
      error?: string;
      isDuplicate?: boolean;
    }>(`/api/events/${eventId}/register`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Get Registrations for an Event
  async getEventRegistrations(
    eventId: string,
    params: {
      search?: string;
      status?: string;
      role?: string;
      source?: string;
      page?: number;
      limit?: number;
    } = {}
  ) {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') q.append(k, String(v));
    });
    return request<{
      success: boolean;
      items: EventRegistration[];
      total: number;
      stats: EventDetailStats;
    }>(`/api/events/${eventId}/registrations?${q.toString()}`);
  },

  async updateRegistrationStatus(registrationId: string, status: string, rejection_reason?: string) {
    return request<{ success: boolean; registration: EventRegistration }>(`/api/registrations/${registrationId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, rejection_reason }),
    });
  },

  // Participant Roles Management
  async getParticipantRoles(search?: string) {
    const q = search ? `?search=${encodeURIComponent(search)}` : '';
    return request<{ success: boolean; roles: ParticipantRoleRecord[] }>(`/api/participant-roles${q}`);
  },

  async setParticipantRole(data: {
    nik: string;
    nama: string;
    role: string;
    phone?: string;
    kelurahan?: string;
    rw?: string;
  }) {
    return request<{ success: boolean; roleRecord: ParticipantRoleRecord }>('/api/participant-roles', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getEventKehadiran(eventId: string, params: Record<string, string | undefined> = {}) {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') q.append(k, String(v));
    });
    return request<{
      success: boolean;
      event: EventItem;
      items: KehadiranEvent[];
      stats: EventStats;
    }>(`/api/events/${eventId}/kehadiran?${q.toString()}`);
  },

  async checkInEvent(
    eventId: string,
    data: {
      nik: string;
      nama: string;
      kecamatan?: string;
      kelurahan?: string;
      rw?: string;
      rt?: string;
      status_kehadiran: 'HADIR' | 'PESERTA TAMU';
      relawan_id?: string;
      id_relawan?: string;
      tps?: string;
      ktp_image_url?: string;
      catatan?: string;
    }
  ) {
    return request<{
      success: boolean;
      data?: KehadiranEvent;
      isDuplicate?: boolean;
      firstCheckIn?: KehadiranEvent;
      message?: string;
      error?: string;
    }>(`/api/events/${eventId}/checkin`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
