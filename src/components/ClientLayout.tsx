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

function InnerLayout({ children }: { children: ReactNode }) {
  const { isLoggedIn } = useAuth();
  const { collapsed } = useSidebar();
  const sidebarW = isLoggedIn ? (collapsed ? 48 : 240) : 0;

  return (
    <>
      <Navbar />
      <AuthModal />
      <AiAssistant />
      <div className="flex min-h-screen pt-16">
        {isLoggedIn && <Sidebar />}
        <main
          className="flex-1 transition-all duration-300"
          style={{ marginLeft: sidebarW }}
        >
          {children}
        </main>
      </div>
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
