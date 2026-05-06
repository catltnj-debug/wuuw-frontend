"use client";

import { type ReactNode } from "react";
import { LanguageProvider } from "@/lib/language";
import { AuthProvider, useAuth } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import AuthModal from "@/components/AuthModal";

function InnerLayout({ children }: { children: ReactNode }) {
  const { isLoggedIn } = useAuth();

  return (
    <>
      <Navbar />
      <AuthModal />
      <div className="flex min-h-screen pt-16">
        {isLoggedIn && <Sidebar />}
        <main
          className="flex-1 transition-all duration-300"
          style={{ marginLeft: isLoggedIn ? "220px" : "0" }}
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
        <InnerLayout>{children}</InnerLayout>
      </AuthProvider>
    </LanguageProvider>
  );
}
