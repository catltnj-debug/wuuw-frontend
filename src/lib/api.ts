const API = "http://localhost:8001";

function token() {
  return typeof window !== "undefined" ? localStorage.getItem("wuuw_token") : null;
}

function authHeaders(): Record<string, string> {
  return { Authorization: `Bearer ${token() ?? ""}`, "Content-Type": "application/json" };
}

// ─── Auth ────────────────────────────────────────────────────────────────────
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

// ─── Assets ──────────────────────────────────────────────────────────────────
export async function apiUploadAsset(
  file: File,
  title: string,
  description: string,
  tagNames: string,
  categoryId?: number,
) {
  const form = new FormData();
  form.append("file", file);
  form.append("title", title);
  form.append("description", description);
  form.append("tag_names", tagNames);
  if (categoryId) form.append("category_id", String(categoryId));
  const res = await fetch(`${API}/api/assets/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token() ?? ""}` },
    body: form,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "上传失败");
  return data as ApiUploadResult;
}

export async function apiGetAssets(params?: {
  categoryId?: number;
  tag?: string;
  creatorUsername?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}) {
  const qs = new URLSearchParams();
  if (params?.categoryId) qs.set("category_id", String(params.categoryId));
  if (params?.tag) qs.set("tag", params.tag);
  if (params?.creatorUsername) qs.set("creator_username", params.creatorUsername);
  if (params?.q) qs.set("q", params.q);
  if (params?.page) qs.set("page", String(params.page));
  if (params?.pageSize) qs.set("page_size", String(params.pageSize));
  const res = await fetch(`${API}/api/assets?${qs}`);
  if (!res.ok) throw new Error("获取列表失败");
  return res.json() as Promise<{ total: number; page: number; page_size: number; items: ApiAsset[] }>;
}

export async function apiGetCategories() {
  const res = await fetch(`${API}/api/assets/categories/all`);
  if (!res.ok) throw new Error("获取分类失败");
  return res.json() as Promise<ApiCategory[]>;
}

export async function apiUploadMedia(assetId: number, file: File, kind: string) {
  const form = new FormData();
  form.append("file", file);
  form.append("media_kind", kind);
  const res = await fetch(`${API}/api/assets/${assetId}/media`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token() ?? ""}` },
    body: form,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "上传媒体失败");
  return data;
}

export async function apiGetAsset(id: number) {
  const res = await fetch(`${API}/api/assets/${id}`);
  if (!res.ok) throw new Error("获取资产失败");
  return res.json() as Promise<ApiAssetDetail>;
}

// ─── Collaboration ────────────────────────────────────────────────────────────
export async function apiSendCollabInvite(
  assetId: number,
  collaboratorUsername: string,
  modificationNotes: string,
) {
  const res = await fetch(`${API}/api/collaboration/invite`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      asset_id: assetId,
      collaborator_username: collaboratorUsername,
      modification_notes: modificationNotes,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "发送邀请失败");
  return data;
}

export async function apiGetCollabRequests(role: "all" | "requester" | "collaborator" = "all") {
  const res = await fetch(`${API}/api/collaboration/requests?role=${role}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("获取协作请求失败");
  return res.json() as Promise<{ total: number; requests: ApiCollabRequest[] }>;
}

export async function apiApproveRequest(requestId: number) {
  const res = await fetch(`${API}/api/collaboration/requests/${requestId}/approve`, {
    method: "POST",
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "操作失败");
  return data;
}

export async function apiRejectRequest(requestId: number) {
  const res = await fetch(`${API}/api/collaboration/requests/${requestId}/reject`, {
    method: "POST",
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "操作失败");
  return data;
}

export async function apiGetMyTasks() {
  const res = await fetch(`${API}/api/collaboration/tasks`, { headers: authHeaders() });
  if (!res.ok) throw new Error("获取任务失败");
  return res.json() as Promise<{ total: number; tasks: ApiCollabTask[] }>;
}

export async function apiCompleteTask(
  taskId: number,
  file: File,
  changeNotes: string,
  copyrightShares: { username: string; share: number }[],
) {
  const form = new FormData();
  form.append("file", file);
  form.append("change_notes", changeNotes);
  form.append("copyright_shares", JSON.stringify(copyrightShares));
  const res = await fetch(`${API}/api/collaboration/tasks/${taskId}/complete`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token() ?? ""}` },
    body: form,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "提交失败");
  return data;
}

// ─── Notifications ────────────────────────────────────────────────────────────
export async function apiGetNotifications(page = 1, unreadOnly = false) {
  const q = new URLSearchParams({ page: String(page), unread_only: String(unreadOnly) });
  const res = await fetch(`${API}/api/notifications?${q}`, { headers: authHeaders() });
  if (!res.ok) throw new Error("获取通知失败");
  return res.json() as Promise<{
    total: number;
    unread_count: number;
    page: number;
    items: ApiNotification[];
  }>;
}

export async function apiGetUnreadCount() {
  const res = await fetch(`${API}/api/notifications/unread-count`, { headers: authHeaders() });
  if (!res.ok) return { unread_count: 0 };
  return res.json() as Promise<{ unread_count: number }>;
}

export async function apiMarkAllRead() {
  const res = await fetch(`${API}/api/notifications/read-all`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("操作失败");
  return res.json();
}

export async function apiMarkOneRead(notificationId: number) {
  const res = await fetch(`${API}/api/notifications/${notificationId}/read`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("操作失败");
  return res.json();
}

// ─── Types ───────────────────────────────────────────────────────────────────
export interface ApiCategory {
  id: number;
  name: string;
  slug: string;
  parent_id?: number | null;
  description?: string;
}

export interface ApiUser {
  id: number;
  username: string;
  email: string;
  tier: string;
  token_balance: number;
}

export interface ApiAsset {
  id: number;
  asset_no: string;
  title: string;
  file_format: string;
  current_version: string;
  creator_id: number;
  creator: string;
  certificate_no?: string | null;
  cover_image?: string | null;
  tags: string[];
  created_at: string;
}

export interface ApiAssetDetail {
  id: number;
  asset_no: string;
  title: string;
  description?: string;
  creator: string;
  file_format: string;
  file_size_bytes: number;
  current_version: string;
  status: string;
  category?: { id: number; name: string } | null;
  tags: { id: number; name: string }[];
  media_files: { id: number; kind: string; filename: string; file_path: string }[];
  latest_certificate?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiUploadResult {
  asset_no: string;
  asset_id: number;
  title: string;
  file_format: string;
  file_size_kb: number;
  file_hash: string;
  current_version: string;
  certificate_no: string;
  status: string;
}

export interface ApiCollabRequest {
  request_id: number;
  asset_no: string;
  asset_title: string;
  requester: string;
  collaborator: string;
  status: string;
  modification_notes?: string;
  created_at: string;
  responded_at?: string | null;
}

export interface ApiCollabTask {
  task_id: number;
  request_id: number;
  asset_no: string;
  asset_title: string;
  modification_notes?: string;
  status: string;
  download_url: string;
  expires_at?: string | null;
  expired: boolean;
}

export interface ApiNotification {
  id: number;
  type: string;
  title: string;
  content: string;
  related_asset_id?: number | null;
  is_read: boolean;
  created_at: string;
}

// ─── Discussion ───────────────────────────────────────────────────────────────
export async function apiGetZones(assetId: number) {
  const res = await fetch(`${API}/api/assets/${assetId}/zones`);
  if (!res.ok) throw new Error("获取讨论区失败");
  return res.json() as Promise<ApiZone[]>;
}

export async function apiGetDiscussions(zoneId: number) {
  const res = await fetch(`${API}/api/zones/${zoneId}/discussions`);
  if (!res.ok) throw new Error("获取讨论失败");
  return res.json() as Promise<ApiZoneContent>;
}

export async function apiPostDiscussion(zoneId: number, content: string) {
  const res = await fetch(`${API}/api/zones/${zoneId}/discussions`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ content }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "发帖失败");
  return data as ApiDiscussion;
}

export async function apiReplyDiscussion(discussionId: number, content: string) {
  const res = await fetch(`${API}/api/discussions/${discussionId}/reply`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ content }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "回复失败");
  return data as ApiDiscussion;
}

export async function apiLikeDiscussion(discussionId: number) {
  const res = await fetch(`${API}/api/discussions/${discussionId}/like`, {
    method: "POST",
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "点赞失败");
  return data;
}

export async function apiSummarize(zoneId: number) {
  const res = await fetch(`${API}/api/zones/${zoneId}/summarize`, {
    method: "POST",
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "AI总结失败");
  return data as ApiSummary;
}

export async function apiConfirmSummary(summaryId: number) {
  const res = await fetch(`${API}/api/summaries/${summaryId}/confirm`, {
    method: "POST",
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "确认失败");
  return data;
}

export async function apiGenerateTaskFromSummary(summaryId: number) {
  const res = await fetch(`${API}/api/summaries/${summaryId}/generate-task`, {
    method: "POST",
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "生成任务失败");
  return data;
}

export async function apiGetAssetTasks(assetId: number) {
  const res = await fetch(`${API}/api/assets/${assetId}/tasks`);
  if (!res.ok) throw new Error("获取任务失败");
  return res.json() as Promise<ApiDiscTask[]>;
}

export async function apiGetAllTasks(status = "open", page = 1) {
  const res = await fetch(`${API}/api/tasks?status=${status}&page=${page}`);
  if (!res.ok) throw new Error("获取任务市场失败");
  return res.json() as Promise<{ total: number; page: number; items: ApiDiscTask[] }>;
}

export async function apiClaimTask(taskId: number) {
  const res = await fetch(`${API}/api/tasks/${taskId}/claim`, {
    method: "POST",
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "抢单失败");
  return data;
}

export async function apiCompleteDiscTask(taskId: number) {
  const res = await fetch(`${API}/api/tasks/${taskId}/complete`, {
    method: "POST",
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "完成任务失败");
  return data;
}

// ─── Experience / Profile ─────────────────────────────────────────────────────
export async function apiGetUserProfile(userId: number) {
  const res = await fetch(`${API}/api/users/${userId}/profile`);
  if (!res.ok) throw new Error("获取用户主页失败");
  return res.json() as Promise<ApiUserProfile>;
}

export async function apiGetExpLog(userId: number, page = 1) {
  const res = await fetch(`${API}/api/users/${userId}/experience-log?page=${page}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("获取经验记录失败");
  return res.json() as Promise<{ total: number; page: number; items: ApiExpLog[] }>;
}

export async function apiGetLeaderboard(limit = 50) {
  const res = await fetch(`${API}/api/leaderboard?limit=${limit}`);
  if (!res.ok) throw new Error("获取排行榜失败");
  return res.json() as Promise<{ total: number; items: ApiLeaderboardEntry[] }>;
}

// ─── New Types ────────────────────────────────────────────────────────────────
export interface ApiZone {
  id: number;
  asset_id: number;
  zone_type: string;
  zone_name: string;
  order_index: number;
  discussion_count: number;
}

export interface ApiDiscussion {
  id: number;
  zone_id: number;
  user_id: number;
  username: string;
  content: string;
  parent_id?: number | null;
  likes_count: number;
  created_at: string;
  replies: ApiDiscussion[];
}

export interface ApiSummary {
  id: number;
  content: string;
  status: string;
  confirm_count: number;
  confirm_threshold: number;
  task_generated: boolean;
  confirmed_user_ids?: number[];
  created_at: string;
}

export interface ApiZoneContent {
  zone_id: number;
  zone_name: string;
  discussions: ApiDiscussion[];
  summary?: ApiSummary | null;
  tasks: ApiDiscTask[];
}

export interface ApiDiscTask {
  id: number;
  title: string;
  description?: string;
  status: string;
  asset_id: number;
  asset_title: string;
  asset_no: string;
  zone_id: number;
  zone_name: string;
  zone_type: string;
  assignee?: string | null;
  summary_id?: number | null;
  created_at: string;
}

export interface ApiLevelInfo {
  level: number;
  name: string;
  current_exp: number;
  level_min: number;
  level_max?: number | null;
  next_level_min?: number | null;
  next_level_name?: string | null;
  progress_pct: number;
}

export interface ApiUserProfile {
  id: number;
  username: string;
  tier: string;
  token_balance: number;
  level: ApiLevelInfo;
  titles: { key: string; name: string; desc: string; earned_at: string }[];
  badges: { key: string; earned_at: string }[];
  projects: { id: number; asset_no: string; title: string; current_version: string }[];
  recent_activity: { action: string; exp: number; created_at: string }[];
  joined_at: string;
}

export interface ApiExpLog {
  id: number;
  action_type: string;
  action_label: string;
  exp_gained: number;
  ref_id?: number | null;
  created_at: string;
}

export interface ApiLeaderboardEntry {
  rank: number;
  user_id: number;
  username: string;
  total_exp: number;
  level: number;
  level_name: string;
  progress_pct: number;
  titles: string[];
  project_count: number;
}
