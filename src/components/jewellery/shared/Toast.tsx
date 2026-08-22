"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AlertCircle, Check, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ToastMessage[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
    setMessages((current) => current.filter((message) => message.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, type: ToastType = "success") => {
      const id = ++nextId.current;
      setMessages((current) => [...current, { id, message, type }]);
      timers.current.set(id, setTimeout(() => dismiss(id), 4000));
    },
    [dismiss],
  );

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      timers.current.clear();
    },
    [],
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        className="fixed inset-x-4 bottom-4 z-[100] flex flex-col items-end gap-2 sm:left-auto sm:max-w-sm"
        aria-live="polite"
        aria-atomic="false"
      >
        {messages.map((item) => {
          const Icon = item.type === "success" ? Check : item.type === "error" ? AlertCircle : Info;
          return (
            <div
              key={item.id}
              role={item.type === "error" ? "alert" : "status"}
              className="flex w-full items-start gap-3 border border-border bg-foreground px-4 py-3 text-sm text-background shadow-[0_18px_50px_rgba(28,25,23,0.22)] sm:w-auto sm:min-w-80"
            >
              <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span className="flex-1 leading-5">{item.message}</span>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                className="-m-2 grid size-9 shrink-0 place-items-center text-background/70 transition-colors hover:text-background"
                aria-label="Dismiss notification"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}
