import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || 'dev-api-key-change-in-production';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': API_KEY,
  },
});

// Response wrapper type from backend
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// Helper to extract data from wrapped response
const extractData = <T>(response: { data: ApiResponse<T> }): T => response.data.data;

// Types
export interface Organization {
  id: string;
  name: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';
  timezone: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationBalance {
  id: string;
  organizationId: string;
  currentBalance: string;
  reservedBalance: string;
  currency: string;
}

export interface Card {
  id: string;
  organizationId: string;
  cardNumber: string;
  status: 'ACTIVE' | 'BLOCKED' | 'EXPIRED' | 'CANCELLED';
  dailyLimit: string;
  monthlyLimit: string;
  holderName?: string;
  expiryDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  organizationId: string;
  cardId: string;
  status: 'PENDING' | 'APPROVED' | 'DECLINED' | 'REVERSED';
  amount: string;
  declineReason?: string;
  stationId?: string;
  stationName?: string;
  fuelType?: string;
  liters?: string;
  processedAt?: string;
  createdAt: string;
}

// API Functions
export const organizationsApi = {
  getAll: () => api.get<ApiResponse<Organization[]>>('/organizations').then(extractData),
  getOne: (id: string) => api.get<ApiResponse<Organization>>(`/organizations/${id}`).then(extractData),
  create: (data: { name: string; timezone?: string }) => 
    api.post<ApiResponse<Organization>>('/organizations', data).then(extractData),
  getBalance: (id: string) => api.get<ApiResponse<OrganizationBalance>>(`/organizations/${id}/balance`).then(extractData),
  topUp: (id: string, data: { amount: string; reference?: string }) =>
    api.post<ApiResponse<OrganizationBalance>>(`/organizations/${id}/balance/top-up`, data).then(extractData),
};

export const cardsApi = {
  getAll: (organizationId?: string) => 
    api.get<ApiResponse<Card[]>>('/cards', { params: { organizationId } }).then(extractData),
  getOne: (id: string) => api.get<ApiResponse<Card>>(`/cards/${id}`).then(extractData),
  create: (data: {
    organizationId: string;
    cardNumber: string;
    holderName?: string;
    dailyLimit?: string;
    monthlyLimit?: string;
    expiryDate?: string;
  }) => api.post<ApiResponse<Card>>('/cards', data).then(extractData),
  update: (id: string, data: Partial<Card>) => api.patch<ApiResponse<Card>>(`/cards/${id}`, data).then(extractData),
  block: (id: string) => api.post<ApiResponse<Card>>(`/cards/${id}/block`).then(extractData),
  unblock: (id: string) => api.post<ApiResponse<Card>>(`/cards/${id}/unblock`).then(extractData),
};

export const transactionsApi = {
  getAll: (params?: { organizationId?: string; cardId?: string; status?: string }) =>
    api.get<ApiResponse<Transaction[]>>('/transactions', { params }).then(extractData),
  getOne: (id: string) => api.get<ApiResponse<Transaction>>(`/transactions/${id}`).then(extractData),
  process: (data: {
    cardNumber: string;
    amount: string;
    stationId?: string;
    stationName?: string;
    fuelType?: string;
    liters?: string;
  }) => api.post<ApiResponse<any>>('/transactions', data).then(extractData),
};
