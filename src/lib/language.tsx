"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

export type Lang = "zh" | "en";

interface LangCtx { lang: Lang; toggle: () => void }
const LangContext = createContext<LangCtx>({ lang: "zh", toggle: () => {} });

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("zh");
  return (
    <LangContext.Provider value={{ lang, toggle: () => setLang(l => l === "zh" ? "en" : "zh") }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() { return useContext(LangContext); }

// 所有界面文字
export const COPY = {
  zh: {
    nav: {
      discover: "探索",
      story: "W 的故事",
      contact: "联系我们",
      login: "登录",
      logout: "退出",
    },
    home: {
      tagline: "Dream. Create. Manifest.",
      sub: "把你的悟变成真实之物",
      cta1: "开始创作",
      cta2: "探索显化",
      cycleTitle: "循环即是本质",
      liveTitle: "正在显化",
      chakraTitle: "七脉轮之路",
      chakraSub: "从一念而起，历七关而悟，化为白光",
    },
    sidebar: {
      ideas: "想法",
      models: "模型",
      draft: "草稿",
      inProgress: "进行中",
      ready: "待打印",
      mold: "量产",
      orders: "订单",
      cart: "购物车",
      wishlist: "收藏",
      ordered: "已下单",
      received: "已收货",
      printers: "打印终端",
      findPrinters: "寻找打印机",
      becomePrinter: "成为打印终端",
      wallet: "钱包",
      balance: "余额",
      withdraw: "提现",
      history: "记录",
    },
  },
  en: {
    nav: {
      discover: "Discover",
      story: "W's Story",
      contact: "Contact",
      login: "Login",
      logout: "Logout",
    },
    home: {
      tagline: "Dream. Create. Manifest.",
      sub: "Turn your awakening into reality",
      cta1: "Start Creating",
      cta2: "Explore",
      cycleTitle: "The Cycle is Everything",
      liveTitle: "Live Manifestations",
      chakraTitle: "The Seven Gates",
      chakraSub: "From a single thought, through seven gates, into white light",
    },
    sidebar: {
      ideas: "Ideas",
      models: "Models",
      draft: "Draft",
      inProgress: "In Progress",
      ready: "Ready to Print",
      mold: "Mold Stage",
      orders: "Orders",
      cart: "Cart",
      wishlist: "Wishlist",
      ordered: "Ordered",
      received: "Received",
      printers: "Printers",
      findPrinters: "Find Printers",
      becomePrinter: "Become a Printer",
      wallet: "Wallet",
      balance: "Balance",
      withdraw: "Withdraw",
      history: "History",
    },
  },
} as const;
