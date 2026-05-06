const API = "http://localhost:8000";

function token() {
  return typeof window !== "undefined" ? localStorage.getItem("wuuw_token") : null;
}

function authHeaders() {
  return { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" };
}

export async function apiRegister(username: string, email: string, password: string) {
  const res = await fetch(`${API}/api/users/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "注册失败");
  return data;
}

export async function apiLogin(username: string, password: string) {
  const res = await fetch(`${API}/api/users/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "登录失败");
  return data as { access_token: string; token_type: string; user: ApiUser };
}

export async function apiGetMe() {
  const res = await fetch(`${API}/api/users/me`, { headers: authHeaders() });
  if (!res.ok) throw new Error("未登录");
  return res.json() as Promise<ApiUser>;
}

export async function apiCreateOrder(material: string, quality: string) {
  const res = await fetch(`${API}/api/orders`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ material, quality }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "创建订单失败");
  return data as ApiOrder;
}

export async function apiUploadFile(orderNo: string, file: File) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API}/api/orders/${orderNo}/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token()}` },
    body: form,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "上传失败");
  return data;
}

export async function apiGetOrders() {
  const res = await fetch(`${API}/api/orders`, { headers: authHeaders() });
  if (!res.ok) throw new Error("获取订单失败");
  return res.json() as Promise<ApiOrder[]>;
}

export interface ApiUser {
  id: number;
  username: string;
  email: string;
  tier: string;
  token_balance: number;
}

export interface ApiOrder {
  id: number;
  order_no: string;
  status: string;
  material: string;
  quality: string;
  original_filename?: string;
  estimated_cost?: number;
  actual_cost?: number;
  created_at: string;
}
