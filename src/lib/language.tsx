"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { NextIntlClientProvider } from "next-intl";
import enMessages from "@/messages/en.json";

// ── Supported locales ─────────────────────────────────────────────────────────

export type Locale = "en" | "zh" | "es" | "pt" | "ja";
export type Lang = Locale; // backward-compat alias

export const LOCALES: { code: Locale; label: string; native: string }[] = [
  { code: "en", label: "EN", native: "English"    },
  { code: "zh", label: "ZH", native: "中文"        },
  { code: "es", label: "ES", native: "Español"    },
  { code: "pt", label: "PT", native: "Português"  },
  { code: "ja", label: "JA", native: "日本語"      },
];

const LOCALE_CODES = LOCALES.map((l) => l.code);
const LS_KEY = "wuuw_locale";

// ── Browser locale detection ──────────────────────────────────────────────────

function detectLocale(): Locale {
  if (typeof window === "undefined") return "en";
  const stored = localStorage.getItem(LS_KEY) as Locale | null;
  if (stored && (LOCALE_CODES as string[]).includes(stored)) return stored;
  // Check navigator.languages first, then navigator.language
  const langs = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const l of langs) {
    const code = l.split("-")[0] as Locale;
    if ((LOCALE_CODES as string[]).includes(code)) return code;
  }
  return "en";
}

// ── Message cache ─────────────────────────────────────────────────────────────

type Messages = Record<string, unknown>;
const _cache: Partial<Record<Locale, Messages>> = { en: enMessages };

async function loadMessages(locale: Locale): Promise<Messages> {
  if (_cache[locale]) return _cache[locale]!;
  const mod = await import(`@/messages/${locale}.json`);
  _cache[locale] = mod.default;
  return mod.default;
}

// ── Context ───────────────────────────────────────────────────────────────────

interface I18nCtx {
  locale: Locale;
  setLocale: (l: Locale) => void;
  locales: typeof LOCALES;
}

const I18nContext = createContext<I18nCtx>({
  locale: "en",
  setLocale: () => {},
  locales: LOCALES,
});

// ── Provider ──────────────────────────────────────────────────────────────────

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");
  const [messages, setMessages] = useState<Messages>(enMessages);

  // On mount: detect locale, load messages if not English
  useEffect(() => {
    const detected = detectLocale();
    if (detected === "en") return; // already loaded
    loadMessages(detected).then((msgs) => {
      setMessages(msgs);
      setLocaleState(detected);
    });
  }, []);

  const setLocale = useCallback(async (l: Locale) => {
    if (typeof window !== "undefined") localStorage.setItem(LS_KEY, l);
    const msgs = await loadMessages(l);
    setMessages(msgs);
    setLocaleState(l);
  }, []);

  return (
    <I18nContext.Provider value={{ locale, setLocale, locales: LOCALES }}>
      <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
        {children}
      </NextIntlClientProvider>
    </I18nContext.Provider>
  );
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

/** Primary hook — preferred for new components. */
export function useLocale() {
  return useContext(I18nContext);
}

/**
 * Backward-compatible hook — existing components using `useLang()` keep working.
 * `lang` is the current locale code ("en" | "zh" | "es" | "pt" | "ja").
 * `toggle` cycles zh ↔ en (legacy behaviour).
 */
export function useLang() {
  const { locale, setLocale } = useLocale();
  return {
    lang: locale,
    setLang: setLocale,
    toggle: () => setLocale(locale === "zh" ? "en" : "zh"),
  };
}

// ── COPY compatibility object (5 languages) ───────────────────────────────────
// Used by existing page components that do COPY[lang].xxx.
// New components should use useTranslations() from next-intl directly.

export const COPY = {
  en: {
    nav: { discover: "Discover", story: "W's Story", contact: "Contact", login: "Sign In", logout: "Sign Out", home: "Home", market: "Market", collab: "Collab", about: "About WuuW", notifications: "Notifications", profile: "Profile", settings: "Settings", signout: "Sign Out" },
    home: { tagline: "Dream. Create. Manifest.", sub: "Turn your awakening into reality", cta1: "Start Creating", cta2: "Explore", cycleTitle: "The Cycle is Everything", liveTitle: "Live Manifestations", chakraTitle: "The Seven Gates", chakraSub: "From a single thought, through seven gates, into white light" },
    sidebar: { ideas: "Ideas", models: "Models", draft: "Draft", inProgress: "In Progress", ready: "Ready to Print", mold: "Production", orders: "Orders", cart: "Cart", wishlist: "Wishlist", ordered: "Ordered", received: "Received", printers: "Printers", findPrinters: "Find Printers", becomePrinter: "Become a Printer", wallet: "Wallet", balance: "Balance", withdraw: "Withdraw", history: "History", projectsHeader: "Projects", myCreated: "Created by me", myJoined: "Joined", noProjects: "No projects yet", projectPlaza: "Project Plaza / New", overview: "Overview", discussion: "Discussion", tasks: "Tasks", modelVersions: "Model Versions", milestones: "Milestones", members: "Members" },
    common: { loading: "Loading…", noData: "No data", cancel: "Cancel", confirm: "Confirm", submit: "Submit", back: "← Back", create: "Create", publish: "Publish", publishing: "Publishing…", search: "Search", all: "All", prev: "Prev", next: "Next", claim: "Claim", claiming: "Claiming…", claiming2: "Accept", claiming2ing: "Accepting…", save: "Save", invite: "Send Invite", inviting: "Inviting…", loginRequired: "Please sign in first" },
    status: { open: "Open", open_task: "Open", claimed: "Claimed", completed: "Completed", done: "Done", cancelled: "Cancelled", in_progress: "In Progress", pending: "Pending", planning: "Planning", active: "Active" },
    pages: {
      ideas: { title: "Ideas Plaza", subtitle: "Share your ideas, find collaborators", publish: "Post Idea", searchPlaceholder: "Search ideas…", tabs: { all: "All", open: "Open", in_project: "In Project", completed: "Completed" }, formTitle: "Idea Title *", formDesc: "Description (optional)", noIdeas: "No ideas yet — be the first to post", myIdeas: "My Ideas" },
      projects: { title: "Projects", subtitle: "Collaborate and build together", create: "+ Create Project", noProjects: "No projects yet", searchPlaceholder: "Search projects…", status: { planning: "Planning", active: "Active", completed: "Completed", cancelled: "Cancelled" }, formTitle: "Project Name *", formDesc: "Description (optional)", formGithub: "GitHub URL (optional)", overview: "Overview", memberCount: (n: number) => `${n} member${n !== 1 ? "s" : ""}`, milestoneCount: (done: number, total: number) => `${done}/${total} milestones` },
      tasks: { title: "Collab", subtitle: "Claim community tasks and earn XP", publishBounty: "💰 Post Bounty", tabs: { bounty: "💰 Bounties", open: "Open", claimed: "Claimed", in_progress: "In Progress", done: "Done" }, noTasks: "No tasks", noBounties: "No bounties yet", claim: "Claim", claiming: "Claiming…", claimBounty: "Accept", claimingBounty: "Accepting…", assignee: "Assignee", bountyModal: { title: "💰 Post Bounty", balance: "Balance", titleField: "Bounty Title *", descField: "Describe the requirement (optional)", amountField: "Amount (Credits) *", deadlineField: "Deadline", submit: "Post Bounty", submitting: "Posting…", cancel: "Cancel" } },
      bounties: { title: "Bounty Hall", subtitle: "Post a need, get it done, earn rewards", post: "+ Post Bounty", claim: "Accept", cancel: "Cancel", cancelClaim: "Accepted", reward: (n: number) => `Earn ${n}`, searchPlaceholder: "Search bounties…", noData: "No bounties", claimList: "Claim List", deadlineLabel: "Due", tabs: { all: "All", open: "Open", claimed: "Claimed", completed: "Completed" }, modal: { title: "Post Bounty", balance: "Current Balance", titleLabel: "Title *", titlePlaceholder: "Describe what you need…", descLabel: "Details", descPlaceholder: "Delivery criteria, references…", amountLabel: "Amount (Credits) *", deadlineLabel: "Deadline", submit: "Post & Deduct", submitting: "Posting…", cancel: "Cancel" }, claimModal: { title: "Accept Bounty", noteLabel: "Additional notes (optional)", submit: "Confirm Acceptance", submitting: "Accepting…", cancel: "Cancel" } },
      wallet: { loginRequired: "Please sign in to view your wallet", title: "Credits Wallet", subtitle: "Platform credits for bounties and collaboration incentives", balanceLabel: "Credits Balance", credits: "Credits", earnedLabel: "Earned (page)", spentLabel: "Spent (page)", historyTitle: "Transaction History", noHistory: "No transactions yet", transferTitle: "Transfer Credits", transferTo: "Recipient username", transferAmount: "Amount", transferNote: "Note (optional)", transferSubmit: "Confirm Transfer", transferring: "Transferring…" },
      projectSub: { backToProject: "← Back to Project", discussion: "Project Discussion", discussionSub: "Exclusive discussion for project members", discussionComing: "Discussion coming soon", tasks: "Project Tasks", tasksSub: "Tasks from linked idea discussion zones", noTasks: "No linked tasks", noTasksHint: "Link this project to an idea to see discussion tasks here", models: "Model Versions", modelsSub: "Model files and version history", modelsComing: "Model version management coming soon", milestones: "Milestones", milestonesSub: "Project progress timeline", noMilestones: "No milestones yet", noMilestonesHint: "Add milestones from the project overview", completedBadge: "Completed", inProgressBadge: "In Progress", members: "Members", membersSub: "Member list & equity agreement", totalShare: "Total equity", inviteTitle: "Invite Member", inviteUsername: "Username", inviteRole: "Role", inviteShare: "Equity %", roles: { owner: "Owner", member: "Member", contributor: "Contributor" }, taskStatus: { open: "Open", claimed: "Claimed", in_progress: "In Progress", done: "Done" } },
      leaderboard: { title: "Contribution Leaderboard", subtitle: "Top community contributors" },
      assets: { preview3d: "3D Preview", downloadView: "Download to view", noPreview: "Preview not supported for this format", printParams: "Print Parameters", relatedBounties: "Related Bounties", postBounty: "💰 Post Bounty", copyright: "Copyright Certificate", notExist: "Asset not found", params: { material: "Material", nozzle: "Nozzle", layer: "Layer Height", infill: "Infill", weight: "Weight", size: "Dimensions", support: "Support", printTime: "Print Time", assembly: "Assembly Notes", yes: "Required", no: "Not required" } },
    },
  },
  zh: {
    nav: { discover: "探索", story: "W 的故事", contact: "联系我们", login: "登录", logout: "退出", home: "首页", market: "市场", collab: "合作", about: "关于 WuuW", notifications: "通知", profile: "个人主页", settings: "设置", signout: "退出登录" },
    home: { tagline: "Dream. Create. Manifest.", sub: "把你的悟变成真实之物", cta1: "开始创作", cta2: "探索显化", cycleTitle: "循环即是本质", liveTitle: "正在显化", chakraTitle: "七脉轮之路", chakraSub: "从一念而起，历七关而悟，化为白光" },
    sidebar: { ideas: "想法", models: "模型", draft: "草稿", inProgress: "进行中", ready: "待打印", mold: "量产", orders: "订单", cart: "购物车", wishlist: "收藏", ordered: "已下单", received: "已收货", printers: "打印终端", findPrinters: "寻找打印机", becomePrinter: "成为打印终端", wallet: "钱包", balance: "余额", withdraw: "提现", history: "记录", projectsHeader: "项目", myCreated: "我创建的", myJoined: "我参与的", noProjects: "暂无项目", projectPlaza: "项目广场 / 新建", overview: "概览", discussion: "讨论", tasks: "任务", modelVersions: "模型版本", milestones: "里程碑", members: "成员" },
    common: { loading: "加载中…", noData: "暂无数据", cancel: "取消", confirm: "确认", submit: "提交", back: "← 返回", create: "创建", publish: "发布", publishing: "发布中…", search: "搜索", all: "全部", prev: "上一页", next: "下一页", claim: "抢单", claiming: "抢单中…", claiming2: "认领", claiming2ing: "认领中…", save: "保存", invite: "发送邀请", inviting: "邀请中…", loginRequired: "请先登录" },
    status: { open: "开放中", open_task: "待认领", claimed: "已认领", completed: "已完成", done: "已完成", cancelled: "已取消", in_progress: "进行中", pending: "待处理", planning: "规划中", active: "进行中" },
    pages: {
      ideas: { title: "创意广场", subtitle: "分享你的想法，寻找协作者", publish: "发布创意", searchPlaceholder: "搜索创意…", tabs: { all: "全部", open: "开放中", in_project: "已立项", completed: "已完成" }, formTitle: "创意标题 *", formDesc: "创意描述（可选）", noIdeas: "暂无创意，来第一个发布吧", myIdeas: "我的创意" },
      projects: { title: "项目广场", subtitle: "开启协作，共建创意产品", create: "+ 创建项目", noProjects: "暂无项目", searchPlaceholder: "搜索项目…", status: { planning: "规划中", active: "进行中", completed: "已完成", cancelled: "已取消" }, formTitle: "项目名称 *", formDesc: "项目描述（可选）", formGithub: "GitHub 链接（可选）", overview: "概览", memberCount: (n: number) => `${n} 位成员`, milestoneCount: (done: number, total: number) => `${done}/${total} 里程碑` },
      tasks: { title: "合作", subtitle: "认领社区生成的改进任务，完成后获得经验值", publishBounty: "💰 发布悬赏", tabs: { bounty: "💰 悬赏任务", open: "待认领", claimed: "已认领", in_progress: "进行中", done: "已完成" }, noTasks: "暂无任务", noBounties: "暂无悬赏任务", claim: "抢单", claiming: "抢单中…", claimBounty: "认领", claimingBounty: "认领中…", assignee: "认领人", bountyModal: { title: "💰 发布悬赏", balance: "余额", titleField: "悬赏标题 *", descField: "描述需求（可选）", amountField: "金额 (Credits) *", deadlineField: "截止日期", submit: "发布悬赏", submitting: "发布中…", cancel: "取消" } },
      bounties: { title: "悬赏大厅", subtitle: "发布需求，接单完成，积分奖励", post: "+ 发布悬赏", claim: "接单", cancel: "取消", cancelClaim: "已认领", reward: (n: number) => `接单得 ${n}`, searchPlaceholder: "搜索悬赏…", noData: "暂无悬赏", claimList: "认领列表", deadlineLabel: "截止", tabs: { all: "全部", open: "开放", claimed: "已认领", completed: "已完成" }, modal: { title: "发布悬赏", balance: "当前余额", titleLabel: "标题 *", titlePlaceholder: "描述你需要什么…", descLabel: "详情", descPlaceholder: "交付标准、参考资料…", amountLabel: "悬赏金额（Credits）*", deadlineLabel: "截止日期", submit: "发布并扣除", submitting: "发布中…", cancel: "取消" }, claimModal: { title: "接单", noteLabel: "补充说明（可选）", submit: "确认接单", submitting: "接单中…", cancel: "取消" } },
      wallet: { loginRequired: "请先登录查看钱包", title: "Credits 钱包", subtitle: "平台内部积分，用于发布悬赏和激励协作", balanceLabel: "Credits 余额", credits: "Credits", earnedLabel: "本页收入", spentLabel: "本页支出", historyTitle: "收支记录", noHistory: "暂无记录", transferTitle: "Credits 转账", transferTo: "收款用户名", transferAmount: "金额", transferNote: "备注（可选）", transferSubmit: "确认转账", transferring: "转账中…" },
      projectSub: { backToProject: "← 返回项目", discussion: "项目讨论", discussionSub: "项目成员之间的专属讨论区", discussionComing: "讨论功能即将上线", tasks: "项目任务", tasksSub: "来自关联创意讨论区的任务", noTasks: "暂无关联任务", noTasksHint: "将项目关联到创意后，讨论区生成的任务将显示在这里", models: "模型版本", modelsSub: "项目关联的模型文件与版本历史", modelsComing: "模型版本管理功能即将上线", milestones: "里程碑", milestonesSub: "项目进度时间线", noMilestones: "暂无里程碑", noMilestonesHint: "前往项目概览添加", completedBadge: "已完成", inProgressBadge: "进行中", members: "成员管理", membersSub: "成员列表与股份协议", totalShare: "总股份", inviteTitle: "邀请成员", inviteUsername: "用户名", inviteRole: "角色", inviteShare: "股份 %", roles: { owner: "所有者", member: "成员", contributor: "贡献者" }, taskStatus: { open: "待认领", claimed: "已认领", in_progress: "进行中", done: "已完成" } },
      leaderboard: { title: "贡献排行榜", subtitle: "社区活跃贡献者排名" },
      assets: { preview3d: "3D 预览", downloadView: "下载文件查看", noPreview: "格式暂不支持浏览器预览", printParams: "打印参数", relatedBounties: "相关悬赏", postBounty: "💰 发起悬赏", copyright: "版权证书", notExist: "资产不存在", params: { material: "材料", nozzle: "喷嘴", layer: "层高", infill: "填充率", weight: "重量", size: "尺寸", support: "支撑", printTime: "打印时间", assembly: "组装说明", yes: "需要", no: "不需要" } },
    },
  },
  es: {
    nav: { discover: "Descubrir", story: "Historia de W", contact: "Contacto", login: "Iniciar sesión", logout: "Cerrar sesión", home: "Inicio", market: "Mercado", collab: "Colaborar", about: "Sobre WuuW", notifications: "Notificaciones", profile: "Perfil", settings: "Ajustes", signout: "Cerrar sesión" },
    home: { tagline: "Dream. Create. Manifest.", sub: "Convierte tu despertar en realidad", cta1: "Empezar a crear", cta2: "Explorar", cycleTitle: "El ciclo es todo", liveTitle: "Manifestaciones en vivo", chakraTitle: "Las Siete Puertas", chakraSub: "Desde un pensamiento, a través de siete puertas, hacia la luz blanca" },
    sidebar: { ideas: "Ideas", models: "Modelos", draft: "Borrador", inProgress: "En progreso", ready: "Listo para imprimir", mold: "Producción", orders: "Pedidos", cart: "Carrito", wishlist: "Favoritos", ordered: "Pedido", received: "Recibido", printers: "Impresoras", findPrinters: "Buscar impresoras", becomePrinter: "Ser impresora", wallet: "Billetera", balance: "Saldo", withdraw: "Retirar", history: "Historial", projectsHeader: "Proyectos", myCreated: "Creados por mí", myJoined: "Unidos", noProjects: "Sin proyectos", projectPlaza: "Plaza / Nuevo", overview: "Resumen", discussion: "Discusión", tasks: "Tareas", modelVersions: "Versiones", milestones: "Hitos", members: "Miembros" },
    common: { loading: "Cargando…", noData: "Sin datos", cancel: "Cancelar", confirm: "Confirmar", submit: "Enviar", back: "← Volver", create: "Crear", publish: "Publicar", publishing: "Publicando…", search: "Buscar", all: "Todo", prev: "Anterior", next: "Siguiente", claim: "Reclamar", claiming: "Reclamando…", claiming2: "Aceptar", claiming2ing: "Aceptando…", save: "Guardar", invite: "Invitar", inviting: "Invitando…", loginRequired: "Inicia sesión primero" },
    status: { open: "Abierto", open_task: "Disponible", claimed: "Reclamado", completed: "Completado", done: "Listo", cancelled: "Cancelado", in_progress: "En progreso", pending: "Pendiente", planning: "Planificando", active: "Activo" },
    pages: {
      ideas: { title: "Plaza de Ideas", subtitle: "Comparte tus ideas, encuentra colaboradores", publish: "Publicar idea", searchPlaceholder: "Buscar ideas…", tabs: { all: "Todo", open: "Abierto", in_project: "En proyecto", completed: "Completado" }, formTitle: "Título de la idea *", formDesc: "Descripción (opcional)", noIdeas: "Sin ideas aún", myIdeas: "Mis ideas" },
      projects: { title: "Proyectos", subtitle: "Colabora y construye juntos", create: "+ Crear proyecto", noProjects: "Sin proyectos", searchPlaceholder: "Buscar proyectos…", status: { planning: "Planificando", active: "Activo", completed: "Completado", cancelled: "Cancelado" }, formTitle: "Nombre *", formDesc: "Descripción (opcional)", formGithub: "GitHub URL (opcional)", overview: "Resumen", memberCount: (n: number) => `${n} miembro${n !== 1 ? "s" : ""}`, milestoneCount: (done: number, total: number) => `${done}/${total} hitos` },
      tasks: { title: "Colaborar", subtitle: "Reclama tareas de la comunidad y gana XP", publishBounty: "💰 Publicar recompensa", tabs: { bounty: "💰 Recompensas", open: "Disponible", claimed: "Reclamado", in_progress: "En progreso", done: "Listo" }, noTasks: "Sin tareas", noBounties: "Sin recompensas", claim: "Reclamar", claiming: "Reclamando…", claimBounty: "Aceptar", claimingBounty: "Aceptando…", assignee: "Asignado", bountyModal: { title: "💰 Publicar recompensa", balance: "Saldo", titleField: "Título *", descField: "Requisito (opcional)", amountField: "Monto (Créditos) *", deadlineField: "Fecha límite", submit: "Publicar", submitting: "Publicando…", cancel: "Cancelar" } },
      bounties: { title: "Sala de recompensas", subtitle: "Publica una necesidad, gana recompensas", post: "+ Publicar recompensa", claim: "Aceptar", cancel: "Cancelar", cancelClaim: "Aceptado", reward: (n: number) => `Ganar ${n}`, searchPlaceholder: "Buscar recompensas…", noData: "Sin recompensas", claimList: "Lista de reclamantes", deadlineLabel: "Fecha límite", tabs: { all: "Todo", open: "Abierto", claimed: "Reclamado", completed: "Completado" }, modal: { title: "Publicar recompensa", balance: "Saldo actual", titleLabel: "Título *", titlePlaceholder: "Describe lo que necesitas…", descLabel: "Detalles", descPlaceholder: "Criterios, referencias…", amountLabel: "Monto (Créditos) *", deadlineLabel: "Fecha límite", submit: "Publicar y deducir", submitting: "Publicando…", cancel: "Cancelar" }, claimModal: { title: "Aceptar recompensa", noteLabel: "Notas (opcional)", submit: "Confirmar", submitting: "Aceptando…", cancel: "Cancelar" } },
      wallet: { loginRequired: "Inicia sesión para ver tu billetera", title: "Billetera de Créditos", subtitle: "Créditos para recompensas e incentivos", balanceLabel: "Saldo de Créditos", credits: "Créditos", earnedLabel: "Ganado", spentLabel: "Gastado", historyTitle: "Historial", noHistory: "Sin transacciones", transferTitle: "Transferir", transferTo: "Usuario destinatario", transferAmount: "Monto", transferNote: "Nota (opcional)", transferSubmit: "Confirmar", transferring: "Transfiriendo…" },
      projectSub: { backToProject: "← Volver", discussion: "Discusión", discussionSub: "Discusión exclusiva para miembros", discussionComing: "Próximamente", tasks: "Tareas", tasksSub: "Tareas de discusiones vinculadas", noTasks: "Sin tareas", noTasksHint: "Vincula el proyecto a una idea", models: "Versiones", modelsSub: "Archivos e historial", modelsComing: "Próximamente", milestones: "Hitos", milestonesSub: "Línea de tiempo", noMilestones: "Sin hitos", noMilestonesHint: "Añade hitos desde el resumen", completedBadge: "Completado", inProgressBadge: "En progreso", members: "Miembros", membersSub: "Lista y acuerdo", totalShare: "Capital total", inviteTitle: "Invitar", inviteUsername: "Usuario", inviteRole: "Rol", inviteShare: "Capital %", roles: { owner: "Propietario", member: "Miembro", contributor: "Colaborador" }, taskStatus: { open: "Disponible", claimed: "Reclamado", in_progress: "En progreso", done: "Listo" } },
      leaderboard: { title: "Tabla de clasificación", subtitle: "Mejores contribuidores" },
      assets: { preview3d: "Vista previa 3D", downloadView: "Descargar para ver", noPreview: "Vista previa no compatible", printParams: "Parámetros de impresión", relatedBounties: "Recompensas relacionadas", postBounty: "💰 Publicar recompensa", copyright: "Certificado de copyright", notExist: "Activo no encontrado", params: { material: "Material", nozzle: "Boquilla", layer: "Altura de capa", infill: "Relleno", weight: "Peso", size: "Dimensiones", support: "Soporte", printTime: "Tiempo", assembly: "Ensamblaje", yes: "Sí", no: "No" } },
    },
  },
  pt: {
    nav: { discover: "Descobrir", story: "História do W", contact: "Contacto", login: "Entrar", logout: "Sair", home: "Início", market: "Mercado", collab: "Colaborar", about: "Sobre WuuW", notifications: "Notificações", profile: "Perfil", settings: "Configurações", signout: "Sair" },
    home: { tagline: "Dream. Create. Manifest.", sub: "Transforma o teu despertar em realidade", cta1: "Começar a criar", cta2: "Explorar", cycleTitle: "O ciclo é tudo", liveTitle: "Manifestações ao vivo", chakraTitle: "As Sete Portas", chakraSub: "De um pensamento, por sete portas, até à luz branca" },
    sidebar: { ideas: "Ideias", models: "Modelos", draft: "Rascunho", inProgress: "Em progresso", ready: "Pronto para imprimir", mold: "Produção", orders: "Encomendas", cart: "Carrinho", wishlist: "Favoritos", ordered: "Encomendado", received: "Recebido", printers: "Impressoras", findPrinters: "Encontrar impressoras", becomePrinter: "Tornar-se impressora", wallet: "Carteira", balance: "Saldo", withdraw: "Levantar", history: "Histórico", projectsHeader: "Projetos", myCreated: "Criados por mim", myJoined: "Participados", noProjects: "Sem projetos", projectPlaza: "Praça / Novo", overview: "Visão geral", discussion: "Discussão", tasks: "Tarefas", modelVersions: "Versões", milestones: "Marcos", members: "Membros" },
    common: { loading: "A carregar…", noData: "Sem dados", cancel: "Cancelar", confirm: "Confirmar", submit: "Enviar", back: "← Voltar", create: "Criar", publish: "Publicar", publishing: "A publicar…", search: "Pesquisar", all: "Todos", prev: "Anterior", next: "Seguinte", claim: "Reclamar", claiming: "A reclamar…", claiming2: "Aceitar", claiming2ing: "A aceitar…", save: "Guardar", invite: "Convidar", inviting: "A convidar…", loginRequired: "Entre primeiro" },
    status: { open: "Aberto", open_task: "Disponível", claimed: "Reclamado", completed: "Concluído", done: "Feito", cancelled: "Cancelado", in_progress: "Em progresso", pending: "Pendente", planning: "A planear", active: "Ativo" },
    pages: {
      ideas: { title: "Praça de Ideias", subtitle: "Partilhe as suas ideias, encontre colaboradores", publish: "Publicar ideia", searchPlaceholder: "Pesquisar ideias…", tabs: { all: "Todos", open: "Aberto", in_project: "Em projeto", completed: "Concluído" }, formTitle: "Título da ideia *", formDesc: "Descrição (opcional)", noIdeas: "Sem ideias ainda", myIdeas: "As minhas ideias" },
      projects: { title: "Projetos", subtitle: "Colabore e construa juntos", create: "+ Criar projeto", noProjects: "Sem projetos", searchPlaceholder: "Pesquisar projetos…", status: { planning: "A planear", active: "Ativo", completed: "Concluído", cancelled: "Cancelado" }, formTitle: "Nome *", formDesc: "Descrição (opcional)", formGithub: "URL do GitHub (opcional)", overview: "Visão geral", memberCount: (n: number) => `${n} membro${n !== 1 ? "s" : ""}`, milestoneCount: (done: number, total: number) => `${done}/${total} marcos` },
      tasks: { title: "Colaborar", subtitle: "Reclame tarefas da comunidade e ganhe XP", publishBounty: "💰 Publicar recompensa", tabs: { bounty: "💰 Recompensas", open: "Disponível", claimed: "Reclamado", in_progress: "Em progresso", done: "Feito" }, noTasks: "Sem tarefas", noBounties: "Sem recompensas", claim: "Reclamar", claiming: "A reclamar…", claimBounty: "Aceitar", claimingBounty: "A aceitar…", assignee: "Atribuído", bountyModal: { title: "💰 Publicar recompensa", balance: "Saldo", titleField: "Título *", descField: "Requisito (opcional)", amountField: "Valor (Créditos) *", deadlineField: "Prazo", submit: "Publicar", submitting: "A publicar…", cancel: "Cancelar" } },
      bounties: { title: "Sala de recompensas", subtitle: "Publique uma necessidade, ganhe recompensas", post: "+ Publicar recompensa", claim: "Aceitar", cancel: "Cancelar", cancelClaim: "Aceite", reward: (n: number) => `Ganhar ${n}`, searchPlaceholder: "Pesquisar recompensas…", noData: "Sem recompensas", claimList: "Lista de reclamantes", deadlineLabel: "Prazo", tabs: { all: "Todos", open: "Aberto", claimed: "Reclamado", completed: "Concluído" }, modal: { title: "Publicar recompensa", balance: "Saldo atual", titleLabel: "Título *", titlePlaceholder: "Descreva o que precisa…", descLabel: "Detalhes", descPlaceholder: "Critérios, referências…", amountLabel: "Valor (Créditos) *", deadlineLabel: "Prazo", submit: "Publicar e deduzir", submitting: "A publicar…", cancel: "Cancelar" }, claimModal: { title: "Aceitar recompensa", noteLabel: "Notas (opcional)", submit: "Confirmar", submitting: "A aceitar…", cancel: "Cancelar" } },
      wallet: { loginRequired: "Entre para ver a sua carteira", title: "Carteira de Créditos", subtitle: "Créditos para recompensas e incentivos", balanceLabel: "Saldo de Créditos", credits: "Créditos", earnedLabel: "Ganho", spentLabel: "Gasto", historyTitle: "Histórico", noHistory: "Sem transações", transferTitle: "Transferir", transferTo: "Utilizador destinatário", transferAmount: "Valor", transferNote: "Nota (opcional)", transferSubmit: "Confirmar", transferring: "A transferir…" },
      projectSub: { backToProject: "← Voltar", discussion: "Discussão", discussionSub: "Discussão exclusiva para membros", discussionComing: "Em breve", tasks: "Tarefas", tasksSub: "Tarefas de discussões vinculadas", noTasks: "Sem tarefas", noTasksHint: "Vincule o projeto a uma ideia", models: "Versões", modelsSub: "Ficheiros e histórico", modelsComing: "Em breve", milestones: "Marcos", milestonesSub: "Linha de tempo", noMilestones: "Sem marcos", noMilestonesHint: "Adicione marcos na visão geral", completedBadge: "Concluído", inProgressBadge: "Em progresso", members: "Membros", membersSub: "Lista e acordo", totalShare: "Capital total", inviteTitle: "Convidar", inviteUsername: "Utilizador", inviteRole: "Função", inviteShare: "Capital %", roles: { owner: "Proprietário", member: "Membro", contributor: "Contribuidor" }, taskStatus: { open: "Disponível", claimed: "Reclamado", in_progress: "Em progresso", done: "Feito" } },
      leaderboard: { title: "Tabela de classificação", subtitle: "Melhores contribuidores" },
      assets: { preview3d: "Pré-visualização 3D", downloadView: "Descarregar para ver", noPreview: "Pré-visualização não suportada", printParams: "Parâmetros de impressão", relatedBounties: "Recompensas relacionadas", postBounty: "💰 Publicar recompensa", copyright: "Certificado de copyright", notExist: "Ativo não encontrado", params: { material: "Material", nozzle: "Bocal", layer: "Altura de camada", infill: "Preenchimento", weight: "Peso", size: "Dimensões", support: "Suporte", printTime: "Tempo", assembly: "Montagem", yes: "Sim", no: "Não" } },
    },
  },
  ja: {
    nav: { discover: "発見", story: "Wのストーリー", contact: "お問い合わせ", login: "ログイン", logout: "ログアウト", home: "ホーム", market: "マーケット", collab: "コラボ", about: "WuuWについて", notifications: "通知", profile: "プロフィール", settings: "設定", signout: "ログアウト" },
    home: { tagline: "Dream. Create. Manifest.", sub: "あなたの覚醒を現実に変えよう", cta1: "作成を始める", cta2: "探索", cycleTitle: "循環こそが本質", liveTitle: "ライブマニフェスト", chakraTitle: "七つの門", chakraSub: "一つの思いから、七つの門を経て、白い光へ" },
    sidebar: { ideas: "アイデア", models: "モデル", draft: "草稿", inProgress: "進行中", ready: "印刷準備完了", mold: "量産", orders: "注文", cart: "カート", wishlist: "ウィッシュリスト", ordered: "注文済み", received: "受取済み", printers: "プリンター", findPrinters: "プリンターを探す", becomePrinter: "プリンターになる", wallet: "ウォレット", balance: "残高", withdraw: "引き出し", history: "履歴", projectsHeader: "プロジェクト", myCreated: "作成したもの", myJoined: "参加したもの", noProjects: "プロジェクトなし", projectPlaza: "広場 / 新規", overview: "概要", discussion: "ディスカッション", tasks: "タスク", modelVersions: "バージョン", milestones: "マイルストーン", members: "メンバー" },
    common: { loading: "読み込み中…", noData: "データなし", cancel: "キャンセル", confirm: "確認", submit: "送信", back: "← 戻る", create: "作成", publish: "公開", publishing: "公開中…", search: "検索", all: "すべて", prev: "前へ", next: "次へ", claim: "申請", claiming: "申請中…", claiming2: "承認", claiming2ing: "承認中…", save: "保存", invite: "招待", inviting: "招待中…", loginRequired: "先にログインしてください" },
    status: { open: "オープン", open_task: "募集中", claimed: "受注済み", completed: "完了", done: "完了", cancelled: "キャンセル", in_progress: "進行中", pending: "保留中", planning: "計画中", active: "アクティブ" },
    pages: {
      ideas: { title: "アイデア広場", subtitle: "アイデアを共有し、コラボレーターを見つけよう", publish: "アイデアを投稿", searchPlaceholder: "アイデアを検索…", tabs: { all: "すべて", open: "オープン", in_project: "プロジェクト中", completed: "完了" }, formTitle: "アイデアのタイトル *", formDesc: "説明（任意）", noIdeas: "まだアイデアがありません", myIdeas: "私のアイデア" },
      projects: { title: "プロジェクト", subtitle: "協力して一緒に構築しよう", create: "+ プロジェクト作成", noProjects: "プロジェクトなし", searchPlaceholder: "プロジェクトを検索…", status: { planning: "計画中", active: "アクティブ", completed: "完了", cancelled: "キャンセル" }, formTitle: "名前 *", formDesc: "説明（任意）", formGithub: "GitHub URL（任意）", overview: "概要", memberCount: (n: number) => `${n}人のメンバー`, milestoneCount: (done: number, total: number) => `${done}/${total}マイルストーン` },
      tasks: { title: "コラボ", subtitle: "コミュニティタスクを申請してXPを獲得しよう", publishBounty: "💰 懸賞を掲載", tabs: { bounty: "💰 懸賞", open: "募集中", claimed: "受注済み", in_progress: "進行中", done: "完了" }, noTasks: "タスクなし", noBounties: "懸賞なし", claim: "申請", claiming: "申請中…", claimBounty: "承認", claimingBounty: "承認中…", assignee: "担当者", bountyModal: { title: "💰 懸賞を掲載", balance: "残高", titleField: "タイトル *", descField: "要件（任意）", amountField: "金額（クレジット）*", deadlineField: "締め切り", submit: "掲載", submitting: "掲載中…", cancel: "キャンセル" } },
      bounties: { title: "懸賞ホール", subtitle: "ニーズを投稿し、報酬を獲得しよう", post: "+ 懸賞を掲載", claim: "承認", cancel: "キャンセル", cancelClaim: "承認済み", reward: (n: number) => `${n}を獲得`, searchPlaceholder: "懸賞を検索…", noData: "懸賞なし", claimList: "申請リスト", deadlineLabel: "締め切り", tabs: { all: "すべて", open: "オープン", claimed: "受注済み", completed: "完了" }, modal: { title: "懸賞を掲載", balance: "現在の残高", titleLabel: "タイトル *", titlePlaceholder: "何が必要か記述…", descLabel: "詳細", descPlaceholder: "基準、参考…", amountLabel: "金額（クレジット）*", deadlineLabel: "締め切り", submit: "掲載して控除", submitting: "掲載中…", cancel: "キャンセル" }, claimModal: { title: "懸賞を承認", noteLabel: "メモ（任意）", submit: "確認", submitting: "承認中…", cancel: "キャンセル" } },
      wallet: { loginRequired: "ウォレットを見るにはログインしてください", title: "クレジットウォレット", subtitle: "懸賞とコラボレーション報酬のためのクレジット", balanceLabel: "クレジット残高", credits: "クレジット", earnedLabel: "獲得", spentLabel: "使用", historyTitle: "取引履歴", noHistory: "取引なし", transferTitle: "送金", transferTo: "受取人ユーザー名", transferAmount: "金額", transferNote: "メモ（任意）", transferSubmit: "確認", transferring: "送金中…" },
      projectSub: { backToProject: "← 戻る", discussion: "ディスカッション", discussionSub: "メンバー専用ディスカッション", discussionComing: "近日公開", tasks: "タスク", tasksSub: "リンクされたタスク", noTasks: "タスクなし", noTasksHint: "プロジェクトをアイデアにリンク", models: "バージョン", modelsSub: "ファイルと履歴", modelsComing: "近日公開", milestones: "マイルストーン", milestonesSub: "タイムライン", noMilestones: "マイルストーンなし", noMilestonesHint: "概要から追加", completedBadge: "完了", inProgressBadge: "進行中", members: "メンバー", membersSub: "リストと合意", totalShare: "総株式", inviteTitle: "招待", inviteUsername: "ユーザー名", inviteRole: "役割", inviteShare: "株式 %", roles: { owner: "オーナー", member: "メンバー", contributor: "コントリビューター" }, taskStatus: { open: "募集中", claimed: "受注済み", in_progress: "進行中", done: "完了" } },
      leaderboard: { title: "貢献ランキング", subtitle: "コミュニティのトップ貢献者" },
      assets: { preview3d: "3Dプレビュー", downloadView: "ダウンロードして表示", noPreview: "このフォーマットはプレビュー非対応", printParams: "印刷パラメータ", relatedBounties: "関連懸賞", postBounty: "💰 懸賞を掲載", copyright: "著作権証明書", notExist: "アセットが見つかりません", params: { material: "素材", nozzle: "ノズル", layer: "レイヤー高さ", infill: "充填率", weight: "重量", size: "寸法", support: "サポート", printTime: "印刷時間", assembly: "組立メモ", yes: "必要", no: "不要" } },
    },
  },
} as const;
