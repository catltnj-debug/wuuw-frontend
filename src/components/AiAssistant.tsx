"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  apiAssistantChat,
  apiAssistantHistory,
  apiAssistantReset,
  type ApiChatMessage,
} from "@/lib/api";
import { useLang } from "@/lib/language";

const SESSION_KEY = "wuuw_assistant_session";
const TEAL = "#00F5D4";

// ─── Suggestion chips shown when chat is empty ────────────────────────────────
const SUGGESTIONS = [
  "How do I upload a 3D model?",
  "What is a copyright certificate?",
  "How do I earn Credits?",
  "What are bounties?",
];

// ─── Single message bubble ────────────────────────────────────────────────────
function Bubble({ msg }: { msg: ApiChatMessage }) {
  const isUser = msg.role === "user";
  return (
    <div
      className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}
    >
      {!isUser && (
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mr-2 shrink-0 mt-0.5"
          style={{ background: TEAL, color: "#000" }}
        >
          悟
        </div>
      )}
      <div
        className="max-w-[78%] px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap"
        style={
          isUser
            ? { background: TEAL, color: "#000", borderBottomRightRadius: 4 }
            : { background: "#1e1e1e", color: "#ddd", borderBottomLeftRadius: 4 }
        }
      >
        {msg.content}
      </div>
    </div>
  );
}

// ─── Typing indicator ─────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div className="flex justify-start mb-3">
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mr-2 shrink-0"
        style={{ background: TEAL, color: "#000" }}
      >
        悟
      </div>
      <div
        className="px-4 py-3 rounded-2xl"
        style={{ background: "#1e1e1e", borderBottomLeftRadius: 4 }}
      >
        <span className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full animate-bounce"
              style={{
                background: "#888",
                animationDelay: `${i * 0.15}s`,
                animationDuration: "0.8s",
              }}
            />
          ))}
        </span>
      </div>
    </div>
  );
}

// ─── Main widget ──────────────────────────────────────────────────────────────
export default function AiAssistant() {
  const { lang } = useLang();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ApiChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Restore session from localStorage
  useEffect(() => {
    const sid = localStorage.getItem(SESSION_KEY) ?? undefined;
    setSessionId(sid);
  }, []);

  // Load history when panel opens for the first time
  useEffect(() => {
    if (!open || historyLoaded || !sessionId) return;
    apiAssistantHistory(sessionId).then((r) => {
      if (r.messages.length > 0) {
        setMessages(r.messages);
        setHistoryLoaded(true);
      }
    });
  }, [open, historyLoaded, sessionId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Focus input when panel opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 200);
  }, [open]);

  const send = useCallback(
    async (text: string) => {
      const msg = text.trim();
      if (!msg || loading) return;
      setInput("");
      setMessages((prev) => [...prev, { role: "user", content: msg }]);
      setLoading(true);
      try {
        const res = await apiAssistantChat(msg, sessionId);

        // Persist session ID — guard against private-browsing localStorage errors
        try {
          localStorage.setItem(SESSION_KEY, res.session_id);
        } catch {
          // ignore quota / private-mode errors
        }

        setSessionId(res.session_id);
        setHistoryLoaded(true);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: res.reply },
        ]);
      } catch (err) {
        console.error("[AiAssistant] chat error:", err);
        const detail =
          err instanceof Error ? err.message : lang === "zh" ? "未知错误" : "Unknown error";
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: lang === "zh"
              ? `抱歉，我暂时无法回答。\n${detail}`
              : `Sorry, I'm unable to respond right now.\n${detail}`,
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [loading, sessionId],
  );

  const handleReset = async () => {
    const res = await apiAssistantReset(sessionId);
    localStorage.setItem(SESSION_KEY, res.session_id);
    setSessionId(res.session_id);
    setMessages([]);
    setHistoryLoaded(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  return (
    <>
      {/* Floating button */}
      <motion.button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-xl font-bold select-none"
        style={{ background: TEAL, color: "#000" }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        title={lang === "zh" ? "打开 AI 助手「悟」" : "Open AI assistant"}
      >
        {open ? "×" : "悟"}
      </motion.button>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="chat-panel"
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.95 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="fixed bottom-24 right-6 z-50 flex flex-col rounded-2xl shadow-2xl overflow-hidden"
            style={{
              width: 360,
              height: 520,
              background: "#111",
              border: "1px solid #222",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3 shrink-0"
              style={{ background: "#161616", borderBottom: "1px solid #222" }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: TEAL, color: "#000" }}
                >
                  悟
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: "#eee" }}>
                    {lang === "zh" ? "WuuW 助手" : "WuuW Assistant"}
                  </p>
                  <p className="text-xs" style={{ color: "#555" }}>
                    Platform guide · Powered by Claude
                  </p>
                </div>
              </div>
              <button
                onClick={handleReset}
                className="text-xs px-2 py-1 rounded transition-colors"
                style={{ color: "#555" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#aaa")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#555")}
                title={lang === "zh" ? "清空对话" : "Clear conversation"}
              >
                {lang === "zh" ? "清空" : "Clear"}
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3">
              {messages.length === 0 && !loading && (
                <div className="flex flex-col items-center pt-6 gap-4">
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold"
                    style={{ background: TEAL + "22", border: `1px solid ${TEAL}44` }}
                  >
                    <span style={{ color: TEAL }}>悟</span>
                  </div>
                  <p className="text-sm text-center" style={{ color: "#777" }}>
                    {lang === "zh" ? "你好！我是 WuuW 平台助手。" : "Hi! I'm the WuuW platform assistant."}
                    <br />
                    {lang === "zh" ? "有什么可以帮助你的？" : "How can I help you?"}
                  </p>
                  <div className="flex flex-col gap-2 w-full mt-2">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => send(s)}
                        className="text-left text-xs px-3 py-2 rounded-xl transition-colors"
                        style={{
                          background: "#1a1a1a",
                          color: "#aaa",
                          border: "1px solid #2a2a2a",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = TEAL + "66";
                          e.currentTarget.style.color = TEAL;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = "#2a2a2a";
                          e.currentTarget.style.color = "#aaa";
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <Bubble key={i} msg={msg} />
              ))}

              {loading && <TypingDots />}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div
              className="shrink-0 px-3 py-3"
              style={{ background: "#161616", borderTop: "1px solid #222" }}
            >
              <div
                className="flex items-end gap-2 rounded-xl px-3 py-2"
                style={{ background: "#1e1e1e" }}
              >
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={lang === "zh" ? "输入消息… (Enter 发送)" : "Type a message… (Enter to send)"}
                  rows={1}
                  className="flex-1 bg-transparent resize-none text-sm outline-none leading-relaxed"
                  style={{
                    color: "#eee",
                    maxHeight: 88,
                    overflowY: "auto",
                  }}
                  disabled={loading}
                />
                <button
                  onClick={() => send(input)}
                  disabled={loading || !input.trim()}
                  className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                  style={{
                    background: input.trim() && !loading ? TEAL : "#2a2a2a",
                    color: input.trim() && !loading ? "#000" : "#555",
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" />
                  </svg>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
