"use client";

import { type ReactNode } from "react";
import { LanguageProvider } from "@/lib/language";
import { AuthProvider, useAuth } from "@/lib/auth";
import { SidebarProvider, useSidebar } from "@/lib/sidebar";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import AuthModal from "@/components/AuthModal";
import { ToastProvider } from "@/components/Toast";
import AiAssistant from "@/components/AiAssistant";

const T = "#00F5D4";

function InnerLayout({ children }: { children: ReactNode }) {
  const { isLoggedIn } = useAuth();
  const { collapsed, mobileOpen, setMobileOpen } = useSidebar();
  const sidebarW = isLoggedIn ? (collapsed ? 48 : 240) : 0;

  return (
    <>
      <Navbar />
      <AuthModal />
      <AiAssistant />
      <div className="flex min-h-screen pt-16">
        {isLoggedIn && <Sidebar />}
        <main
          className="flex-1 transition-all duration-300 w-full"
          style={{ marginLeft: typeof window !== "undefined" && window.innerWidth >= 1024 ? sidebarW : 0 }}
        >
          {children}
        </main>
      </div>

      {/* Mobile sidebar toggle — only when logged in, only on small screens */}
      {isLoggedIn && (
        <button
          className="lg:hidden fixed bottom-20 left-4 z-50 w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all"
          style={{
            background: mobileOpen ? "rgba(0,245,212,0.2)" : "rgba(3,3,6,0.92)",
            border: `1px solid ${mobileOpen ? "rgba(0,245,212,0.5)" : "rgba(255,255,255,0.12)"}`,
            color: mobileOpen ? T : "#666",
          }}
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle sidebar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {mobileOpen
              ? <path d="M6 18L18 6M6 6l12 12" />
              : <><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></>}
          </svg>
        </button>
      )}
    </>
  );
}

export default function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider>
      <AuthProvider>
        <SidebarProvider>
          <ToastProvider>
            <InnerLayout>{children}</InnerLayout>
          </ToastProvider>
        </SidebarProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
