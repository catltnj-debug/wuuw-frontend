"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";

const T = "#00F5D4";

type ToastKind = "success" | "error" | "info";
interface Toast { id: number; message: string; kind: ToastKind }

interface ToastCtx { toast: (msg: string, kind?: ToastKind) => void }
const ToastContext = createContext<ToastCtx>({ toast: () => {} });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  let idRef = 0;

  const toast = useCallback((message: string, kind: ToastKind = "success") => {
    const id = ++idRef;
    setToasts(prev => [...prev, { id, message, kind }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []); // eslint-disable-line

  const COLORS: Record<ToastKind, string> = {
    success: T,
    error: "#f56",
    info: "#aaa",
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="px-4 py-3 rounded-xl text-sm max-w-sm pointer-events-auto"
              style={{
                background: "#0d0d12",
                border: `1px solid ${COLORS[t.kind]}44`,
                color: COLORS[t.kind],
                boxShadow: `0 4px 24px rgba(0,0,0,0.5), 0 0 0 1px ${COLORS[t.kind]}22`,
              }}
            >
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() { return useContext(ToastContext); }
