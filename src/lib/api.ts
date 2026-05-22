const API = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8001";

function token() {
  return typeof window !== "undefined" ? localStorage.getItem("wuuw_token") : null;
}

function authHeaders(): Record<string, string> {
  return { Authorization: `Bearer ${token() ?? ""}`, "Content-Type": "application/json" };
}
function authHeadersNoContent(): Record<string, string> {
  return { Authorization: `Bearer ${token() ?? ""}` };
}

// ─── Auth ────────────────────────────────────────────────────────────────────
export async function apiRegister(username: string, email: string, password: string, invite_code?: string) {
  const res = await fetch(`${API}/api/users/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password, ...(invite_code ? { invite_code } : {}) }),
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
  is_admin?: boolean;
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
  creator_id?: number;
  /** Expanded creator object if the backend returns it */
  creator_obj?: { id: number; username: string } | null;
  file_format: string;
  file_size_bytes: number;
  current_version: string;
  status: string;
  category?: { id: number; name: string } | null;
  tags: { id: number; name: string }[];
  media_files: { id: number; kind: string; filename: string; file_path: string }[];
  latest_certificate?: string | null;
  file_path?: string;
  tech_params?: ApiTechParams;
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

// ─── Translation & Voice ──────────────────────────────────────────────────────

export async function apiTranslate(text: string, targetLang: string): Promise<ApiTranslateResult> {
  const res = await fetch(`${API}/api/translate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, target_lang: targetLang }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "翻译失败");
  return data;
}

export async function apiUploadVoice(discussionId: number, audioBlob: Blob): Promise<ApiVoiceMessage> {
  const form = new FormData();
  form.append("audio", audioBlob, "recording.webm");
  const res = await fetch(`${API}/api/discussions/${discussionId}/voice`, {
    method: "POST",
    headers: authHeadersNoContent(),
    body: form,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "上传失败");
  return data;
}

export async function apiGetVoices(discussionId: number): Promise<ApiVoiceMessage[]> {
  const res = await fetch(`${API}/api/discussions/${discussionId}/voices`);
  if (!res.ok) throw new Error("获取语音消息失败");
  return res.json();
}

export async function apiGetVoiceTranslation(voiceId: number, lang: string): Promise<{ translated_text: string }> {
  const res = await fetch(`${API}/api/voice/${voiceId}/translation/${lang}`);
  if (!res.ok) throw new Error("获取翻译失败");
  return res.json();
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
  detected_lang?: string | null;
  created_at: string;
  replies: ApiDiscussion[];
}

export interface ApiVoiceMessage {
  id: number;
  discussion_id: number;
  user_id: number;
  transcript?: string | null;
  detected_lang?: string | null;
  duration_seconds: number;
  created_at: string;
}

export interface ApiTranslateResult {
  translated_text: string;
  source_lang?: string;
  cached: boolean;
  api_used: string;
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
  en_name: string;
  current_exp: number;
  level_min: number;
  level_max?: number | null;
  next_level_min?: number | null;
  next_level_name?: string | null;
  next_level_en_name?: string | null;
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
  stats?: { models: number; likes: number; prints: number; score: number };
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

// ─── Ideas ────────────────────────────────────────────────────────────────────
export interface ApiIdea {
  id: number;
  idea_no: string;
  title: string;
  description?: string | null;
  creator_id: number;
  creator_username: string;
  status: string;
  views_count: number;
  discussion_count: number;
  created_at: string;
}

export interface ApiIdeaZone {
  id: number;
  idea_id: number;
  zone_type: string;
  zone_name: string;
  order_index: number;
  discussion_count: number;
}

export async function apiGetIdeas(params?: {
  q?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}) {
  const qs = new URLSearchParams();
  if (params?.q) qs.set("q", params.q);
  if (params?.status) qs.set("status", params.status);
  if (params?.page) qs.set("page", String(params.page));
  if (params?.pageSize) qs.set("page_size", String(params.pageSize));
  const res = await fetch(`${API}/api/ideas?${qs}`);
  if (!res.ok) throw new Error("获取 Ideas 失败");
  return res.json() as Promise<{ total: number; page: number; page_size: number; items: ApiIdea[] }>;
}

export async function apiPostIdea(title: string, description?: string) {
  const res = await fetch(`${API}/api/ideas`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ title, description }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "发布 Idea 失败");
  return data as ApiIdea;
}

export async function apiGetIdea(ideaId: number) {
  const res = await fetch(`${API}/api/ideas/${ideaId}`);
  if (!res.ok) throw new Error("获取 Idea 详情失败");
  return res.json() as Promise<ApiIdea>;
}

export async function apiPatchIdeaStatus(ideaId: number, status: string) {
  const res = await fetch(`${API}/api/ideas/${ideaId}/status`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ status }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "更新状态失败");
  return data as ApiIdea;
}

export async function apiGetIdeaZones(ideaId: number) {
  const res = await fetch(`${API}/api/ideas/${ideaId}/zones`);
  if (!res.ok) throw new Error("获取 Idea 讨论区失败");
  return res.json() as Promise<ApiIdeaZone[]>;
}

// ─── Projects ─────────────────────────────────────────────────────────────────
export interface ApiProject {
  id: number;
  project_no: string;
  title: string;
  description?: string | null;
  creator_id: number;
  creator_username: string;
  idea_id?: number | null;
  status: string;
  github_url?: string | null;
  members: ApiProjectMember[];
  milestones: ApiProjectMilestone[];
  created_at: string;
}

export interface ApiProjectMember {
  user_id: number;
  username: string;
  role: string;
  share_pct: number;
  joined_at: string;
}

export interface ApiProjectMilestone {
  id: number;
  title: string;
  description?: string | null;
  due_date?: string | null;
  completed: boolean;
  created_at: string;
}

export async function apiGetProjects(params?: { q?: string; status?: string; page?: number }) {
  const qs = new URLSearchParams();
  if (params?.q) qs.set("q", params.q);
  if (params?.status) qs.set("status", params.status);
  if (params?.page) qs.set("page", String(params.page));
  const res = await fetch(`${API}/api/projects?${qs}`);
  if (!res.ok) throw new Error("获取项目失败");
  return res.json() as Promise<{ total: number; page: number; page_size: number; items: ApiProject[] }>;
}

export async function apiPostProject(body: {
  title: string; description?: string; idea_id?: number; github_url?: string;
}) {
  const res = await fetch(`${API}/api/projects`, {
    method: "POST", headers: authHeaders(), body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "创建项目失败");
  return data as ApiProject;
}

export async function apiGetProject(id: number) {
  const res = await fetch(`${API}/api/projects/${id}`);
  if (!res.ok) throw new Error("获取项目失败");
  return res.json() as Promise<ApiProject>;
}

export async function apiGetMyCreatedProjects() {
  const res = await fetch(`${API}/api/projects/my/created`, { headers: authHeaders() });
  if (!res.ok) throw new Error("获取失败");
  return res.json() as Promise<{ items: ApiProject[]; total: number }>;
}

export async function apiGetMyJoinedProjects() {
  const res = await fetch(`${API}/api/projects/my/joined`, { headers: authHeaders() });
  if (!res.ok) throw new Error("获取失败");
  return res.json() as Promise<{ items: ApiProject[]; total: number }>;
}

export async function apiGetProjectTasks(projectId: number, status?: string) {
  const qs = status ? `?status=${status}` : "";
  const res = await fetch(`${API}/api/projects/${projectId}/tasks${qs}`);
  if (!res.ok) return { total: 0, items: [] };
  return res.json() as Promise<{ total: number; items: { id: number; title: string; status: string; assignee?: string | null; created_at: string }[] }>;
}

export async function apiPatchProjectStatus(id: number, status: string) {
  const res = await fetch(`${API}/api/projects/${id}/status`, {
    method: "PATCH", headers: authHeaders(), body: JSON.stringify({ status }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "更新失败");
  return data as ApiProject;
}

export async function apiInviteProjectMember(
  projectId: number, username: string, role: string, share_pct: number,
) {
  const res = await fetch(`${API}/api/projects/${projectId}/members`, {
    method: "POST", headers: authHeaders(),
    body: JSON.stringify({ username, role, share_pct }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "邀请失败");
  return data as ApiProject;
}

export async function apiAddMilestone(
  projectId: number, body: { title: string; description?: string; due_date?: string },
) {
  const res = await fetch(`${API}/api/projects/${projectId}/milestones`, {
    method: "POST", headers: authHeaders(), body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "添加失败");
  return data as ApiProjectMilestone;
}

export async function apiCompleteMilestone(projectId: number, milestoneId: number) {
  const res = await fetch(`${API}/api/projects/${projectId}/milestones/${milestoneId}/complete`, {
    method: "PATCH", headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "操作失败");
  return data;
}

// ─── Bounties ─────────────────────────────────────────────────────────────────
export interface ApiBounty {
  id: number;
  bounty_no: string;
  title: string;
  description?: string | null;
  creator_id: number;
  creator_username: string;
  idea_id?: number | null;
  asset_id?: number | null;
  amount: number;
  status: string;
  deadline?: string | null;
  claims: ApiBountyClaim[];
  created_at: string;
}

export interface ApiBountyClaim {
  id: number;
  claimer_id: number;
  claimer_username: string;
  status: string;
  submission_note?: string | null;
  created_at: string;
}

export async function apiGetBounties(params?: { q?: string; status?: string; asset_id?: number; page?: number }) {
  const qs = new URLSearchParams();
  if (params?.q) qs.set("q", params.q);
  if (params?.status) qs.set("status", params.status);
  if (params?.asset_id) qs.set("asset_id", String(params.asset_id));
  if (params?.page) qs.set("page", String(params.page));
  const res = await fetch(`${API}/api/bounties?${qs}`);
  if (!res.ok) throw new Error("获取悬赏失败");
  return res.json() as Promise<{ total: number; page: number; page_size: number; items: ApiBounty[] }>;
}

export async function apiPostBounty(body: {
  title: string; description?: string; amount: number; idea_id?: number; asset_id?: number; deadline?: string;
}) {
  const res = await fetch(`${API}/api/bounties`, {
    method: "POST", headers: authHeaders(), body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "发布悬赏失败");
  return data as ApiBounty;
}

export async function apiClaimBounty(bountyId: number, submission_note?: string) {
  const res = await fetch(`${API}/api/bounties/${bountyId}/claim`, {
    method: "POST", headers: authHeaders(),
    body: JSON.stringify({ submission_note }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "认领失败");
  return data as ApiBounty;
}

export async function apiCompleteBounty(bountyId: number, claimId: number) {
  const res = await fetch(`${API}/api/bounties/${bountyId}/complete/${claimId}`, {
    method: "POST", headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "操作失败");
  return data as ApiBounty;
}

export async function apiCancelBounty(bountyId: number) {
  const res = await fetch(`${API}/api/bounties/${bountyId}/cancel`, {
    method: "POST", headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "取消失败");
  return data as ApiBounty;
}

// ─── Credits ──────────────────────────────────────────────────────────────────
export interface ApiCreditsLedger {
  id: number;
  amount: number;
  action_type: string;
  action_label: string;
  ref_id?: number | null;
  balance_after: number;
  note?: string | null;
  created_at: string;
}

export async function apiGetMyCredits(page = 1) {
  const res = await fetch(`${API}/api/users/me/credits?page=${page}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("获取 Credits 失败");
  return res.json() as Promise<{
    balance: number;
    total: number;
    page: number;
    items: ApiCreditsLedger[];
  }>;
}

export async function apiTransferCredits(to_username: string, amount: number, note = "") {
  const res = await fetch(`${API}/api/credits/transfer`, {
    method: "POST", headers: authHeaders(),
    body: JSON.stringify({ to_username, amount, note }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "转账失败");
  return data;
}

export async function apiGetUserCreditsPublic(userId: number) {
  const res = await fetch(`${API}/api/users/${userId}/credits/public`);
  if (!res.ok) return null;
  return res.json() as Promise<{ user_id: number; username: string; credits_balance: number }>;
}

// ─── Tech Params ──────────────────────────────────────────────────────────────
export interface ApiTechParams {
  material?: string | null;
  nozzle_size?: number | null;
  layer_height?: number | null;
  infill_pct?: number | null;
  weight_g?: number | null;
  dim_x?: number | null;
  dim_y?: number | null;
  dim_z?: number | null;
  support_required?: boolean | null;
  assembly_notes?: string | null;
  print_time_min?: number | null;
}

export async function apiPatchTechParams(assetId: number, params: ApiTechParams) {
  const res = await fetch(`${API}/api/assets/${assetId}/tech-params`, {
    method: "PATCH", headers: authHeaders(), body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "更新失败");
  return data;
}

// ─── AI Assistant ─────────────────────────────────────────────────────────────
export interface ApiChatMessage {
  role: "user" | "assistant";
  content: string;
  created_at?: string;
}

export async function apiAssistantChat(
  message: string,
  sessionId?: string,
): Promise<{ reply: string; session_id: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60_000); // 60-second timeout

  let res: Response;
  try {
    res = await fetch(`${API}/api/assistant/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, session_id: sessionId }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  let data: { reply?: string; session_id?: string; detail?: string };
  try {
    data = await res.json();
  } catch {
    throw new Error(`服务器返回了非 JSON 响应 (HTTP ${res.status})`);
  }

  if (!res.ok) {
    throw new Error(data.detail || `请求失败 (HTTP ${res.status})`);
  }

  if (!data.reply || !data.session_id) {
    throw new Error(`响应字段缺失: reply=${data.reply}, session_id=${data.session_id}`);
  }

  return { reply: data.reply, session_id: data.session_id };
}

export async function apiAssistantHistory(
  sessionId: string,
): Promise<{ session_id: string; messages: ApiChatMessage[] }> {
  const res = await fetch(`${API}/api/assistant/history?session_id=${sessionId}`);
  if (!res.ok) return { session_id: sessionId, messages: [] };
  return res.json();
}

export async function apiAssistantReset(
  sessionId?: string,
): Promise<{ ok: boolean; session_id: string }> {
  const res = await fetch(`${API}/api/assistant/reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "重置失败");
  return data;
}

// ─── Payments ─────────────────────────────────────────────────────────────────
export interface ApiPaymentOrder {
  id: number;
  order_no: string;
  package_name: string;
  amount_usd: number;
  credits_amount: number;
  status: string;
  created_at: string;
  paid_at: string | null;
}

export async function apiGetPackages() {
  const res = await fetch(`${API}/api/payments/packages`);
  if (!res.ok) throw new Error("获取套餐失败");
  return res.json() as Promise<{ key: string; name: string; usd: number; credits: number }[]>;
}

export async function apiCreateCheckout(body: {
  package: string;
  success_url: string;
  cancel_url: string;
}) {
  const res = await fetch(`${API}/api/payments/credits/checkout`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "创建支付失败");
  return data as { url: string; session_id: string; order_no: string };
}

export async function apiGetPaymentHistory(page = 1) {
  const res = await fetch(`${API}/api/payments/history?page=${page}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("获取支付历史失败");
  return res.json() as Promise<{ total: number; page: number; items: ApiPaymentOrder[] }>;
}

// ─── Moderation ───────────────────────────────────────────────────────────────
export async function apiSubmitReport(body: {
  content_type: string;
  content_id: number;
  reason: string;
}) {
  const res = await fetch(`${API}/api/moderation/report`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "举报失败");
  return data;
}

// ─── Admin ────────────────────────────────────────────────────────────────────
export interface ApiAdminStats {
  user_count: number;
  asset_count: number;
  cert_count: number;
  credits_circulation: number;
  pending_reports: number;
  total_revenue_usd: number;
}

export interface ApiAdminUser {
  id: number;
  username: string;
  email: string;
  tier: string;
  is_admin: boolean;
  is_banned: boolean;
  ban_reason: string | null;
  created_at: string;
}

export interface ApiAdminReport {
  id: number;
  reporter_id: number;
  reporter_username: string | null;
  content_type: string;
  content_id: number;
  reason: string;
  status: string;
  resolve_action: string | null;
  created_at: string;
}

export async function apiAdminStats() {
  const res = await fetch(`${API}/api/admin/stats`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "获取统计失败");
  return data as ApiAdminStats;
}

export async function apiAdminUsers(params?: { q?: string; page?: number }) {
  const qs = new URLSearchParams();
  if (params?.q) qs.set("q", params.q);
  if (params?.page) qs.set("page", String(params.page));
  const res = await fetch(`${API}/api/admin/users?${qs}`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "获取用户失败");
  return data as { total: number; page: number; items: ApiAdminUser[] };
}

export async function apiAdminBanUser(userId: number, banned: boolean, reason?: string) {
  const res = await fetch(`${API}/api/admin/users/${userId}/ban`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ banned, reason }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "操作失败");
  return data;
}

export async function apiAdminModels(params?: { q?: string; status?: string; page?: number }) {
  const qs = new URLSearchParams();
  if (params?.q) qs.set("q", params.q);
  if (params?.status) qs.set("status", params.status);
  if (params?.page) qs.set("page", String(params.page));
  const res = await fetch(`${API}/api/admin/models?${qs}`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "获取失败");
  return data as { total: number; page: number; items: { id: number; asset_no: string; title: string; status: string; file_format: string; creator: string; created_at: string }[] };
}

export async function apiAdminSetModelStatus(assetId: number, status: string) {
  const res = await fetch(`${API}/api/admin/models/${assetId}/status`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ status }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "操作失败");
  return data;
}

export async function apiAdminReports(params?: { status?: string; page?: number }) {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.page) qs.set("page", String(params.page));
  const res = await fetch(`${API}/api/admin/reports?${qs}`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "获取失败");
  return data as { total: number; page: number; items: ApiAdminReport[] };
}

export async function apiAdminHandleReport(reportId: number, action: string, note?: string) {
  const res = await fetch(`${API}/api/moderation/reports/${reportId}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ action, note }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "操作失败");
  return data;
}

export async function apiAdminCerts(params?: { q?: string; page?: number }) {
  const qs = new URLSearchParams();
  if (params?.q) qs.set("q", params.q);
  if (params?.page) qs.set("page", String(params.page));
  const res = await fetch(`${API}/api/admin/certificates?${qs}`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "获取失败");
  return data as { total: number; page: number; items: { id: number; cert_no: string; asset_no: string | null; asset_title: string | null; file_hash: string; issued_at: string | null }[] };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...(init?.headers as Record<string, string> | undefined) },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || `Request failed (HTTP ${res.status})`);
  return data as T;
}

// ── Asset interactions ────────────────────────────────────────────────────────
export async function apiRecordView(assetId: number) {
  await apiFetch(`/api/assets/${assetId}/view`, { method: "POST" });
}

export async function apiLikeAsset(assetId: number) {
  return apiFetch<{ liked: boolean; likes: number }>(`/api/assets/${assetId}/like`, { method: "POST" });
}

export async function apiGetAssetLikes(assetId: number) {
  return apiFetch<{ likes: number; liked: boolean }>(`/api/assets/${assetId}/likes`);
}

export async function apiTipAsset(assetId: number, credits_amount: number, message?: string) {
  return apiFetch<{ success: boolean; amount: number; to: string }>(`/api/assets/${assetId}/tip`, {
    method: "POST",
    body: JSON.stringify({ credits_amount, message }),
  });
}

export async function apiGetAssetStats(assetId: number) {
  return apiFetch<{ views: number; likes: number; comments: number }>(`/api/assets/${assetId}/stats`);
}

// ── Reddit discussions ────────────────────────────────────────────────────────
export interface ApiRedditPost {
  id: number;
  asset_id: number;
  zone_id: number | null;
  user_id: number;
  username: string;
  content: string;
  tag: string | null;
  upvotes: number;
  downvotes: number;
  score: number;
  likes_count: number;
  reply_count: number;
  detected_lang: string | null;
  created_at: string;
}

export async function apiGetAssetDiscussions(assetId: number, params?: { tag?: string; sort?: string; page?: number }) {
  const qs = new URLSearchParams();
  if (params?.tag) qs.set("tag", params.tag);
  if (params?.sort) qs.set("sort", params.sort);
  if (params?.page) qs.set("page", String(params.page));
  return apiFetch<{ total: number; page: number; items: ApiRedditPost[] }>(
    `/api/assets/${assetId}/discussions${qs.toString() ? "?" + qs : ""}`
  );
}

export async function apiPostAssetDiscussion(assetId: number, content: string, tag: string, title?: string) {
  return apiFetch<ApiRedditPost>(`/api/assets/${assetId}/discussions`, {
    method: "POST",
    body: JSON.stringify({ content, tag, title }),
  });
}

export async function apiVoteDiscussion(discussionId: number, vote_type: "up" | "down") {
  return apiFetch<{ discussion_id: number; upvotes: number; downvotes: number; score: number }>(
    `/api/discussions/${discussionId}/vote`,
    { method: "POST", body: JSON.stringify({ vote_type }) }
  );
}

// ── Invite codes ──────────────────────────────────────────────────────────────
export async function apiValidateInvite(code: string) {
  return apiFetch<{ valid: boolean; code: string }>(`/api/auth/validate-invite?code=${encodeURIComponent(code)}`, { method: "POST" });
}

export async function apiGenerateInviteCodes(count: number, expires_days: number, max_uses: number) {
  return apiFetch<{ generated: number; codes: string[] }>(`/api/admin/invite-codes`, {
    method: "POST",
    body: JSON.stringify({ count, expires_days, max_uses }),
  });
}

export interface ApiInviteCode {
  id: number;
  code: string;
  max_uses: number;
  use_count: number;
  used: boolean;
  expires_at: string | null;
  created_at: string;
}

export async function apiGetInviteCodes(page = 1) {
  return apiFetch<{ total: number; items: ApiInviteCode[] }>(`/api/admin/invite-codes?page=${page}`);
}
