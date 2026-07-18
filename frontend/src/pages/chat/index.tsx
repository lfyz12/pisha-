import { memo, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useQueryClient } from "@tanstack/react-query";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PROJECT_ACCEPT, StudentProjectsPanel } from "@/components/student-projects-panel";
import {
  CHAT_SESSION_KEYS,
  useChatMessages,
  useChatSessions,
  useCreateChatSession,
  useDeleteChatSession,
  useUploadStudentProject,
} from "@/hooks";
import { listMessages, streamMessage } from "@/services";
import { toast, useChatStore } from "@/stores";
import { extractApiError } from "@/lib/api-error";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/types";

const QUICK_PROMPTS = [
  "Как повысить рейтинг?",
  "Какие стипендии доступны?",
  "Как рассчитывается балл?",
];

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

type LiveMessage = ChatMessage & { failed?: boolean };

function createLocalMessage(role: ChatMessage["role"], content: string): LiveMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    createdAt: new Date().toISOString(),
  };
}

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

const MessageBubble = memo(function MessageBubble({ msg }: { msg: LiveMessage }) {
  return (
    <div
      className={cn(
        "flex animate-message-in",
        msg.role === "user" ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed",
          msg.role === "user"
            ? "bg-primary text-on-primary rounded-br-md"
            : msg.failed
              ? "bg-status-error/10 text-status-error border border-status-error/30 rounded-bl-md"
              : "bg-surface-container-high text-text-main border border-border-subtle rounded-bl-md"
        )}
      >
        {msg.failed && (
          <span className="flex items-center gap-1.5 font-semibold mb-1">
            <Icon name="error" className="text-base shrink-0" />
            Ошибка
          </span>
        )}
        <p className="whitespace-pre-wrap">{msg.content}</p>
        <span
          className={cn(
            "text-[10px] mt-1 block",
            msg.role === "user"
              ? "text-on-primary/60"
              : msg.failed
                ? "text-status-error/60"
                : "text-muted-foreground"
          )}
        >
          {formatTime(msg.createdAt)}
        </span>
      </div>
    </div>
  );
});

export default function ChatPage() {
  const currentSessionId = useChatStore((s) => s.currentSessionId);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const draft = useChatStore((s) => s.draft);
  const setCurrentSession = useChatStore((s) => s.setCurrentSession);
  const setStreaming = useChatStore((s) => s.setStreaming);
  const setDraft = useChatStore((s) => s.setDraft);

  const queryClient = useQueryClient();
  const sessionsQuery = useChatSessions();
  const messagesQuery = useChatMessages(currentSessionId);
  const createSession = useCreateChatSession();
  const deleteSession = useDeleteChatSession();
  const uploadProject = useUploadStudentProject();

  const [live, setLive] = useState<{ sessionId: string | null; messages: LiveMessage[] }>({
    sessionId: null,
    messages: [],
  });
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [projectsOpen, setProjectsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const attachInputRef = useRef<HTMLInputElement>(null);
  const streamAbortRef = useRef<AbortController | null>(null);

  // Abort the in-flight stream when the page unmounts.
  useEffect(() => {
    return () => streamAbortRef.current?.abort();
  }, []);

  const sessions = useMemo(() => sessionsQuery.data?.data ?? [], [sessionsQuery.data]);
  const historyMessages = messagesQuery.data?.data ?? [];
  // Optimistic/streaming messages are only shown for the session they were sent in.
  const liveMessages = useMemo(
    () => (live.sessionId === currentSessionId ? live.messages : []),
    [live, currentSessionId]
  );
  const allMessages: LiveMessage[] = [...historyMessages, ...liveMessages];
  const messages = allMessages.filter(
    (msg) => !(isStreaming && msg.role === "assistant" && msg.content === "" && !msg.failed)
  );
  const isForbidden =
    axios.isAxiosError(sessionsQuery.error) && sessionsQuery.error.response?.status === 403;
  const isWaitingFirstToken =
    isStreaming &&
    liveMessages[liveMessages.length - 1]?.role === "assistant" &&
    liveMessages[liveMessages.length - 1]?.content === "";

  // Select the most recent session by default; clear selection if it disappeared.
  useEffect(() => {
    if (!sessionsQuery.data) return;
    if (sessions.length === 0) {
      if (currentSessionId) setCurrentSession(null);
      return;
    }
    if (!currentSessionId || !sessions.some((s) => s.id === currentSessionId)) {
      setCurrentSession(sessions[0].id);
    }
  }, [sessionsQuery.data, sessions, currentSessionId, setCurrentSession]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isWaitingFirstToken, liveMessages]);

  // Refetch history and drop optimistic messages that the backend already
  // persisted (matched by role+content). Keeps non-persisted messages, e.g.
  // the failed bubble after a stream error.
  const finalizeLiveMessages = async (sessionId: string) => {
    await queryClient.invalidateQueries({ queryKey: CHAT_SESSION_KEYS.all });
    const history = await queryClient.fetchQuery({
      queryKey: CHAT_SESSION_KEYS.messages(sessionId),
      queryFn: () => listMessages(sessionId),
    });
    const persisted = new Set(history.data.map((m) => `${m.role}\n${m.content}`));
    setLive((prev) => ({
      ...prev,
      messages: prev.messages.filter((m) => !persisted.has(`${m.role}\n${m.content}`)),
    }));
  };

  const handleSend = async (text?: string) => {
    const content = (text ?? draft).trim();
    if (!content || isStreaming || isForbidden) return;

    streamAbortRef.current?.abort();
    const controller = new AbortController();
    streamAbortRef.current = controller;

    setDraft("");
    setStreaming(true);

    let sessionId = currentSessionId;
    try {
      if (!sessionId) {
        try {
          const created = await createSession.mutateAsync();
          sessionId = created.data.id;
          setCurrentSession(sessionId);
        } catch (error) {
          toast({
            title: "Не удалось создать чат",
            description: extractApiError(error),
            variant: "destructive",
          });
          return;
        }
      }

      const userMessage = createLocalMessage("user", content);
      const assistantMessage = createLocalMessage("assistant", "");
      setLive({ sessionId, messages: [userMessage, assistantMessage] });

      await streamMessage(sessionId, content, {
        signal: controller.signal,
        onToken: (token) => {
          setLive((prev) => {
            const next = [...prev.messages];
            const last = next[next.length - 1];
            if (last?.role === "assistant") {
              next[next.length - 1] = { ...last, content: last.content + token };
            }
            return { ...prev, messages: next };
          });
        },
      });
    } catch (error) {
      if (controller.signal.aborted) return;
      const message = error instanceof Error ? error.message : "Не удалось получить ответ";
      setLive((prev) => {
        const next = [...prev.messages];
        const last = next[next.length - 1];
        if (last?.role === "assistant") {
          next[next.length - 1] = { ...last, content: message, failed: true };
        }
        return { ...prev, messages: next };
      });
    } finally {
      if (sessionId && !controller.signal.aborted) {
        try {
          await finalizeLiveMessages(sessionId);
        } catch {
          // History refetch failed (e.g. network loss) — keep live messages as-is.
        }
      }
      if (streamAbortRef.current === controller) {
        streamAbortRef.current = null;
        setStreaming(false);
      }
    }
  };

  const handleNewChat = () => {
    if (isStreaming) return;
    setCurrentSession(null);
  };

  const handleDeleteSession = () => {
    if (!sessionToDelete) return;
    deleteSession.mutate(sessionToDelete, {
      onSuccess: () => {
        if (sessionToDelete === currentSessionId) {
          setCurrentSession(null);
        }
      },
      onError: () => toast({ title: "Не удалось удалить чат", variant: "destructive" }),
    });
    setSessionToDelete(null);
  };

  const handleAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast({ title: "Файл больше 20 МБ", variant: "destructive" });
      if (attachInputRef.current) attachInputRef.current.value = "";
      return;
    }
    uploadProject.mutate(
      { file },
      {
        onSuccess: () => {
          toast({ title: "Проект загружен", description: "Идёт обработка файла" });
          setProjectsOpen(true);
        },
        onError: (error) => {
          toast({
            title: extractApiError(error, "Не удалось загрузить проект"),
            variant: "destructive",
          });
        },
      }
    );
    if (attachInputRef.current) attachInputRef.current.value = "";
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatSessionDate = (ts: string) =>
    new Date(ts).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });

  if (isForbidden) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] text-center gap-4">
        <div className="w-16 h-16 bg-surface-container-high rounded-2xl flex items-center justify-center">
          <Icon name="smart_toy" className="text-secondary text-3xl" />
        </div>
        <div>
          <h3 className="text-base font-bold text-text-main mb-1">
            ИИ-чат отключён администратором
          </h3>
          <p className="text-sm text-secondary max-w-[24rem]">
            Функция временно недоступна. Обратитесь к администратору, если вам нужен доступ.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-4 h-[calc(100vh-8rem)]">
      <aside className="hidden md:flex w-72 shrink-0 flex-col glass border rounded-xl overflow-hidden">
        <div className="p-3 border-b border-border-subtle">
          <Button
            variant="glass"
            onClick={handleNewChat}
            disabled={isStreaming}
            className="w-full font-bold rounded-lg"
          >
            <Icon name="add" className="text-lg" />
            Новый чат
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={cn(
                "group flex items-center gap-1 rounded-lg px-2 py-2 cursor-pointer transition-colors",
                session.id === currentSessionId
                  ? "bg-primary/10 border border-primary/30"
                  : "hover:bg-surface-container-high border border-transparent"
              )}
              onClick={() => !isStreaming && setCurrentSession(session.id)}
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-text-main truncate">
                  {session.title || "Новый чат"}
                </p>
                <p className="text-[10px] text-secondary">{formatSessionDate(session.updatedAt)}</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSessionToDelete(session.id);
                }}
                className="opacity-0 group-hover:opacity-100 text-secondary hover:text-status-error transition-all shrink-0"
                title="Удалить чат"
              >
                <Icon name="delete" className="text-base" />
              </button>
            </div>
          ))}
          {sessionsQuery.isError && (
            <p className="text-xs text-status-error text-center py-4">
              Не удалось загрузить историю
            </p>
          )}
          {sessions.length === 0 && !sessionsQuery.isLoading && !sessionsQuery.isError && (
            <p className="text-xs text-secondary text-center py-4">История чатов пуста</p>
          )}
        </div>

        <div className="border-t border-border-subtle">
          <button
            onClick={() => setProjectsOpen((open) => !open)}
            className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-bold text-text-main hover:bg-surface-container-high transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <Icon name="folder" className="text-base text-primary" />
              Мои проекты
            </span>
            <Icon
              name="expand_more"
              className={cn(
                "text-base text-secondary transition-transform",
                projectsOpen && "rotate-180"
              )}
            />
          </button>
          <div className={cn("px-3 pb-3", !projectsOpen && "hidden")}>
            <StudentProjectsPanel enabled={projectsOpen} />
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
            <Icon name="smart_toy" fill className="text-on-primary text-xl" />
          </div>
          <div>
            <h2 className="text-lg font-headline font-bold text-text-main">ИИ-Помощник УПИШ</h2>
            <p className="text-xs text-secondary flex items-center gap-1.5">
              <span className="w-2 h-2 bg-status-success rounded-full" />
              {isStreaming ? "Думаю..." : "Онлайн"}
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
                <p className="text-sm text-secondary max-w-[24rem]">
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
            <MessageBubble key={msg.id} msg={msg} />
          ))}

          {isWaitingFirstToken && (
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

          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-border-subtle pt-3">
          <div className="flex items-end gap-2">
            <input
              ref={attachInputRef}
              type="file"
              accept={PROJECT_ACCEPT}
              onChange={handleAttach}
              className="hidden"
            />
            <button
              onClick={() => attachInputRef.current?.click()}
              disabled={uploadProject.isPending}
              className="w-10 h-10 bg-surface-container-high border border-border-subtle text-secondary rounded-xl flex items-center justify-center shrink-0 hover:text-primary hover:border-primary transition-colors disabled:opacity-40"
              title="Прикрепить проект (.md, .docx, .pdf, .pptx)"
            >
              <Icon
                name={uploadProject.isPending ? "hourglass_empty" : "attach_file"}
                className="text-xl"
              />
            </button>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Задайте вопрос..."
              rows={1}
              className="flex-1 bg-surface-container-high border border-border-subtle rounded-xl px-4 py-3 text-sm text-text-main resize-none focus:outline-none focus:border-primary transition-colors max-h-32 placeholder:text-secondary"
            />
            <button
              onClick={() => handleSend()}
              disabled={!draft.trim() || isStreaming}
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

      <AlertDialog open={Boolean(sessionToDelete)} onOpenChange={() => setSessionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить чат?</AlertDialogTitle>
            <AlertDialogDescription>
              История сообщений будет удалена без возможности восстановления.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSession}>Удалить</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
