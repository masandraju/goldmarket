import axios from 'axios'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface RegisterPayload {
  email: string
  phone: string
  full_name: string
  password: string
  role: 'customer' | 'jeweller'
}

export interface LoginPayload {
  email: string
  password: string
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  role: string
}

export const authApi = {
  register: (data: RegisterPayload) => api.post('/auth/register', data),
  login: (data: LoginPayload) => api.post<TokenResponse>('/auth/login', data),
}

// ── Shops ─────────────────────────────────────────────────────────────────────

export interface Shop {
  id: number
  name: string
  address: string
  city: string
  latitude: number
  longitude: number
  avg_rating: number
  review_count: number
  status: string
  accepts_emi: boolean
  phone: string
}

export interface ShopNearbyResult extends Shop {
  distance_km: number
  services: string[]
  rate_22k: number | null
  rate_24k: number | null
}

export interface ShopRegisterPayload {
  name: string
  description?: string
  address: string
  city: string
  state: string
  pincode: string
  latitude: number
  longitude: number
  phone: string
  email?: string
  gstin?: string
  accepts_emi: boolean
  services: string[]
}

export interface MyShop {
  id: number
  name: string
  address: string
  city: string
  status: 'pending' | 'approved' | 'suspended' | 'rejected'
  avg_rating: number
  review_count: number
  accepts_emi: boolean
  phone: string
}

export interface FullShop {
  id: number
  name: string
  description: string
  address: string
  city: string
  state: string
  pincode: string
  latitude: number
  longitude: number
  phone: string
  email: string
  gstin: string
  status: string
  avg_rating: number
  review_count: number
  accepts_emi: boolean
  services: string[]
}

export interface ShopEditPayload {
  name?: string
  description?: string
  address?: string
  city?: string
  state?: string
  pincode?: string
  phone?: string
  email?: string
  gstin?: string
  accepts_emi?: boolean
  services?: string[]
}

export interface ShopOrder {
  id: number
  shop_name: string
  customer_name: string
  customer_email: string
  transaction_type: string
  amount_inr: number
  gold_grams: number
  rate_per_gram: number
  status: string
  created_at: string
}

export const shopApi = {
  getNearby: (lat: number, lng: number, radius = 10, limit = 20) =>
    api.get<ShopNearbyResult[]>('/shops/nearby', {
      params: { latitude: lat, longitude: lng, radius_km: radius, limit },
    }),
  getById: (id: number) => api.get<Shop>(`/shops/${id}`),
  getMyShops: () => api.get<MyShop[]>('/shops/my-shops'),
  register: (data: ShopRegisterPayload) => api.post('/shops/register', data),
  toggleEmi: (shopId: number) => api.patch<{ accepts_emi: boolean }>(`/shops/${shopId}/toggle-emi`),
  updateLocation: (shopId: number, latitude: number, longitude: number) =>
    api.patch(`/shops/${shopId}/location`, { latitude, longitude }),
  getFullDetails: (shopId: number) => api.get<FullShop>(`/shops/${shopId}/full`),
  editShop: (shopId: number, data: ShopEditPayload) => api.patch<FullShop>(`/shops/${shopId}/edit`, data),
  getMyOrders: (limit = 50) => api.get<ShopOrder[]>('/shops/my-orders', { params: { limit } }),
}

// ── Gold Rates ────────────────────────────────────────────────────────────────

export interface GoldRate {
  shop_id: number
  rate_per_gram_22k: number
  rate_per_gram_24k: number
  effective_date: string
  is_manual_override: boolean
}

export interface GoldRatePayload {
  shop_id: number
  rate_per_gram_22k: number
  rate_per_gram_24k: number
  effective_date: string
  is_manual_override: boolean
  notes?: string
}

export interface GoldRateHistory {
  date: string
  rate_per_gram_22k: number
  rate_per_gram_24k: number
}

export const goldRateApi = {
  getTodayRate: (shopId: number) => api.get<GoldRate>(`/gold-rates/${shopId}/today`),
  setRate: (data: GoldRatePayload) => api.post('/gold-rates/', data),
  getHistory: (shopId: number, days: number) =>
    api.get<GoldRateHistory[]>(`/gold-rates/${shopId}/history`, { params: { days } }),
}

// ── Gold Account ──────────────────────────────────────────────────────────────

export const goldApi = {
  getBalance: () => api.get<{ user_id: number; balance_grams: number }>('/gold/balance'),
}

// ── Gold Purchase ─────────────────────────────────────────────────────────────

export interface InitiateOrderResponse {
  transaction_id: number
  razorpay_order_id: string
  amount_inr: number
  gold_grams: number
  rate_per_gram: number
  currency: string
}

export interface VerifyPaymentPayload {
  transaction_id: number
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

export interface Transaction {
  id: number
  shop_name: string
  transaction_type: string
  amount_inr: number
  gold_grams: number
  rate_per_gram: number
  status: string
  created_at: string
}

export const purchaseApi = {
  initiate: (shop_id: number, amount_inr: number, purity: '22k' | '24k') =>
    api.post<InitiateOrderResponse>('/gold/buy/initiate', { shop_id, amount_inr, purity }),
  verify: (data: VerifyPaymentPayload) => api.post<{ gold_credited_grams: number; new_balance_grams: number }>('/gold/buy/verify', data),
  getTransactions: (limit = 20) => api.get<Transaction[]>('/gold/transactions', { params: { limit } }),
}

// ── Admin ─────────────────────────────────────────────────────────────────────

export interface AdminStats {
  total_users: number
  total_shops: number
  pending_shop_approvals: number
  total_transaction_value_inr: number
}

export interface PendingShop {
  id: number
  name: string
  city: string
  owner_id: number
  created_at: string
}

export interface AdminShop {
  id: number
  name: string
  city: string
  phone: string
  status: string
  owner_id: number
  accepts_emi: boolean
  avg_rating: number
  created_at: string
}

export interface AdminUser {
  id: number
  email: string
  role: string
  is_active: boolean
}

export const adminApi = {
  getStats: () => api.get<AdminStats>('/admin/dashboard'),
  getPendingShops: () => api.get<PendingShop[]>('/admin/shops/pending'),
  getAllShops: () => api.get<AdminShop[]>('/admin/shops/all'),
  approveShop: (shopId: number) => api.patch(`/shops/${shopId}/approve`),
  editShop: (shopId: number, data: ShopEditPayload & { status?: string }) => api.patch(`/admin/shops/${shopId}`, data),
  getUsers: () => api.get<AdminUser[]>('/admin/users'),
  toggleUser: (userId: number) => api.patch(`/admin/users/${userId}/toggle-active`),
}

// ── EMI ───────────────────────────────────────────────────────────────────────

export interface EMIPlan {
  plan_id: number
  shop_id: number
  shop_name: string
  monthly_installment_inr: number
  installments_paid: number
  total_installments: number
  gold_accumulated_grams: number
  total_gold_grams: number
  next_due_date: string
  status: string
}

export interface EMIInitiateResponse {
  plan_id: number
  razorpay_order_id: string
  amount_inr: number
  installment_number: number
  currency: string
}

export const emiApi = {
  createPlan: (shop_id: number, monthly_amount_inr: number, total_months: number, purity: '22k' | '24k') =>
    api.post<{ plan_id: number; monthly_installment_inr: number; total_months: number; estimated_total_gold_grams: number }>('/emi/create', { shop_id, monthly_amount_inr, total_months, purity }),
  initiatePay: (plan_id: number) =>
    api.post<EMIInitiateResponse>('/emi/pay/initiate', null, { params: { plan_id } }),
  verifyPay: (plan_id: number, razorpay_order_id: string, razorpay_payment_id: string, razorpay_signature: string) =>
    api.post<{ gold_credited_grams: number; total_accumulated_grams: number; installments_remaining: number; plan_status: string }>('/emi/pay/verify', { plan_id, razorpay_order_id, razorpay_payment_id, razorpay_signature }),
  getMyPlans: () => api.get<EMIPlan[]>('/emi/my-plans'),
}

// ── Redemptions ──────────────────────────────────────────────────────────────

export interface RedemptionRequest {
  id: number
  shop_id: number
  shop_name: string
  gold_grams: number
  status: string
  preferred_item: string | null
  user_notes: string | null
  shop_notes: string | null
  created_at: string
}

export interface ShopRedemptionRequest extends RedemptionRequest {
  customer_name: string
  customer_email: string
}

export const redemptionApi = {
  submit: (shop_id: number, gold_grams: number, preferred_item?: string, user_notes?: string) =>
    api.post<{ request_id: number }>('/redemptions/request', { shop_id, gold_grams, preferred_item, user_notes }),
  getMyRequests: () => api.get<RedemptionRequest[]>('/redemptions/my-requests'),
  getShopRequests: () => api.get<ShopRedemptionRequest[]>('/redemptions/shop/requests'),
  action: (requestId: number, status: 'approved' | 'rejected', shop_notes?: string) =>
    api.patch(`/redemptions/${requestId}/action`, { status, shop_notes }),
}

// ── Reviews ───────────────────────────────────────────────────────────────────

export interface ReviewItem {
  id: number
  reviewer_name: string
  rating: number
  comment: string | null
  created_at: string
}

export interface ReviewPayload {
  shop_id: number
  rating: number
  comment?: string
}

export const reviewApi = {
  submit: (data: ReviewPayload) => api.post<{ review_id: number }>('/reviews/', data),
  getByShop: (shopId: number) => api.get<ReviewItem[]>(`/reviews/${shopId}`),
  getMyReview: (shopId: number) => api.get<{ id: number; rating: number; comment: string | null } | null>(`/reviews/my-review/${shopId}`),
}

// ── User Profile ──────────────────────────────────────────────────────────────

export interface UserProfile {
  id: number
  email: string
  full_name: string
  phone: string
  role: string
}

export interface ProfileUpdatePayload {
  full_name?: string
  phone?: string
  current_password?: string
  new_password?: string
}

export const userApi = {
  getMe: () => api.get<UserProfile>('/auth/me'),
  updateMe: (data: ProfileUpdatePayload) => api.patch<UserProfile>('/auth/me', data),
}

export default api
