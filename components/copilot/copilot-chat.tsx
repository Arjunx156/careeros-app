"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowUp, Bot, Square, User } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type ChatMessage = { role: "user" | "model"; content: string };

export function CopilotChat({ suggestions }: { suggestions: string[] }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Keep the newest content in view as it streams in.
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  async function send(question: string) {
    const trimmed = question.trim();
    if (trimmed.length === 0 || isStreaming) return;

    const history: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages([...history, { role: "model", content: "" }]);
    setInput("");
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        toast.error(payload.error ?? "The copilot could not answer.");
        setMessages(history);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let answer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        answer += decoder.decode(value, { stream: true });
        setMessages([...history, { role: "model", content: answer }]);
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        toast.error("Connection error. Please try again.");
        setMessages(history);
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }

  function stop() {
    abortRef.current?.abort();
    setIsStreaming(false);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void send(input);
  }

  return (
    <div className="card flex h-[calc(100dvh-13rem)] min-h-96 flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-5">
        {messages.length === 0 ? (
          <div className="grid h-full place-items-center text-center">
            <div className="max-w-md">
              <Bot aria-hidden className="mx-auto size-10 text-line" strokeWidth={1.5} />
              <h2 className="mt-3 text-card-title text-ink">
                Ask about your own job search
              </h2>
              <p className="mt-1 text-body text-ink-secondary">
                I can see your applications, resumes, analyses and outcomes. I answer
                from those numbers — and say so when they cannot answer a question.
              </p>
            </div>
          </div>
        ) : (
          <ul className="space-y-4">
            {messages.map((message, index) => (
              <li key={index} className="flex gap-3">
                <div
                  className={cn(
                    "grid size-7 shrink-0 place-items-center rounded-full",
                    message.role === "user"
                      ? "bg-surface-hover text-ink-secondary"
                      : "bg-brand-50 text-brand-600",
                  )}
                >
                  {message.role === "user" ? (
                    <User aria-hidden className="size-3.5" />
                  ) : (
                    <Bot aria-hidden className="size-3.5" />
                  )}
                </div>

                <div className="min-w-0 flex-1 pt-0.5">
                  {message.content ? (
                    <p className="text-body whitespace-pre-wrap text-ink">
                      {message.content}
                    </p>
                  ) : (
                    <span className="inline-flex gap-1" aria-label="Thinking">
                      {[0, 150, 300].map((delay) => (
                        <span
                          key={delay}
                          className="size-1.5 animate-pulse rounded-full bg-ink-muted"
                          style={{ animationDelay: `${delay}ms` }}
                        />
                      ))}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-line p-4">
        {messages.length === 0 ? (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => void send(suggestion)}
                className="rounded-[var(--radius-badge)] border border-line bg-surface px-2.5 py-1 text-label text-ink-secondary transition-colors hover:bg-surface-hover hover:text-ink"
              >
                {suggestion}
              </button>
            ))}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <label htmlFor="copilot-input" className="sr-only">
            Ask the copilot
          </label>
          <textarea
            id="copilot-input"
            rows={1}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void send(input);
              }
            }}
            placeholder="Ask about your applications, resumes or results…"
            className="max-h-32 min-h-10 flex-1 resize-none rounded-[var(--radius-control)] border border-line bg-surface px-3 py-2 text-body text-ink placeholder:text-ink-muted focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none"
          />

          {isStreaming ? (
            <button
              type="button"
              onClick={stop}
              aria-label="Stop generating"
              className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-control)] border border-line text-ink-secondary transition-colors hover:bg-surface-hover"
            >
              <Square aria-hidden className="size-3.5" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={input.trim().length === 0}
              aria-label="Send"
              className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-control)] bg-brand-600 text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowUp aria-hidden className="size-4" />
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
