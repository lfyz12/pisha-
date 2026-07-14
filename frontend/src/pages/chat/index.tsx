import { useState, useRef, useEffect } from "react";
import { Icon } from "@/components/ui/icon";
import { sendChatMessage, createChatMessage } from "@/services";
import type { ChatMessage } from "@/types";

const QUICK_PROMPTS = [
  "Как повысить рейтинг?",
  "Какие стипендии доступны?",
  "Как рассчитывается балл?",
];

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (text?: string) => {
    const message = (text ?? input).trim();
    if (!message || isLoading) return;

    setInput("");
    setError("");
    setIsLoading(true);

    const userMsg = createChatMessage("user", message);
    setMessages((prev) => [...prev, userMsg]);

    try {
      const { response } = await sendChatMessage(message);
      const aiMsg = createChatMessage("assistant", response);
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      setError("Не удалось получить ответ. Проверьте, запущен ли backend-сервер.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (ts: string) =>
    new Date(ts).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
          <Icon name="smart_toy" fill className="text-on-primary text-xl" />
        </div>
        <div>
          <h2 className="text-lg font-headline font-bold text-text-main">ИИ-Помощник УПИШ</h2>
          <p className="text-xs text-secondary flex items-center gap-1.5">
            <span className="w-2 h-2 bg-status-success rounded-full" />
            {isLoading ? "Думаю..." : "Онлайн"}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 mb-4 px-1">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-4">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
              <Icon name="smart_toy" fill className="text-primary text-3xl" />
            </div>
            <div>
              <h3 className="text-base font-bold text-text-main mb-1">Задайте вопрос</h3>
              <p className="text-sm text-secondary max-w-sm">
                Я помогу разобраться в рейтинге, баллах, стипендиях и функционале системы
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleSend(prompt)}
                  className="px-4 py-2 bg-surface-container-high border border-border-subtle rounded-lg text-sm text-secondary hover:text-primary hover:border-primary transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-primary text-on-primary rounded-br-md"
                  : "bg-surface-container-high text-text-main border border-border-subtle rounded-bl-md"
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.text}</p>
              <span
                className={`text-[10px] mt-1 block ${
                  msg.role === "user" ? "text-on-primary/60" : "text-muted-foreground"
                }`}
              >
                {formatTime(msg.timestamp)}
              </span>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-surface-container-high border border-border-subtle px-4 py-3 rounded-2xl rounded-bl-md">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 bg-secondary rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-2 h-2 bg-secondary rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-2 h-2 bg-secondary rounded-full animate-bounce" />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="flex justify-center">
            <div className="bg-status-error/10 border border-status-error/30 text-status-error text-sm px-4 py-3 rounded-lg flex items-center gap-2">
              <Icon name="error" className="text-base shrink-0" />
              <span>{error}</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div id="chat-input">
        <div className="border-t border-border-subtle pt-3">
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Задайте вопрос..."
              rows={1}
              className="flex-1 bg-surface-container-high border border-border-subtle rounded-xl px-4 py-3 text-sm text-text-main resize-none focus:outline-none focus:border-primary transition-colors max-h-32 placeholder:text-secondary"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              className="w-10 h-10 bg-primary text-on-primary rounded-xl flex items-center justify-center shrink-0 hover:opacity-90 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Icon name="send" className="text-xl" />
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
            Enter — отправить, Shift+Enter — перенос строки
          </p>
        </div>
      </div>
    </div>
  );
}
