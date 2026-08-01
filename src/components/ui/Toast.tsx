"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2, Info, X } from "lucide-react";

type ToastItem = { id: number; message: string; variant: "success" | "info" };

const ToastContext = createContext<{
  push: (message: string, variant?: "success" | "info") => void;
} | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const push = useCallback((message: string, variant: "success" | "info" = "success") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-white px-4 py-3 shadow-lg shadow-emerald-900/5 animate-in"
          >
            {t.variant === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            ) : (
              <Info className="h-4 w-4 text-emerald-600" />
            )}
            <span className="text-sm text-slate-700">{t.message}</span>
            <button
              className="ml-2 text-slate-400 hover:text-slate-600"
              onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
