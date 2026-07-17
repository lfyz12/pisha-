"""Server-sent events machinery for the AI assistant chat stream.

Runs the compiled LangGraph agent in a background thread and bridges its
token stream to an SSE generator via a queue. The generator emits heartbeat
comments while waiting so proxies do not buffer or time out the connection,
and guarantees that ``on_finalize`` receives the accumulated assistant text
exactly once — the full reply on normal completion, or the partial reply
when the client disconnects mid-stream.
"""

import json
import logging
import queue
import threading
from typing import Callable, Iterable

from django.db import close_old_connections
from langchain_core.messages import AIMessage, HumanMessage

logger = logging.getLogger(__name__)

#: Extra headers for the SSE response (disable proxy buffering and caching).
SSE_HEADERS = {
    "Cache-Control": "no-cache",
    "X-Accel-Buffering": "no",
}

#: How long the generator waits for the next token before emitting a heartbeat.
HEARTBEAT_TIMEOUT_SECONDS = 30


def build_history(messages: Iterable) -> list:
    """Map ChatMessage rows (oldest first) to LangChain messages."""
    from ai_assistant.models import ChatMessage

    history = []
    for msg in messages:
        if msg.role == ChatMessage.Role.USER:
            history.append(HumanMessage(content=msg.content))
        elif msg.role == ChatMessage.Role.ASSISTANT:
            history.append(AIMessage(content=msg.content))
    return history


def _frame(payload_type: str, data: dict) -> str:
    payload = {"type": payload_type, **data}
    return f"data: {json.dumps(payload, ensure_ascii=False, separators=(',', ':'))}\n\n"


def _extract_token(message) -> str:
    content = getattr(message, "content", "")
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return "".join(str(part) for part in content)
    return ""


def sse_stream(
    graph,
    input_messages: list,
    on_finalize: Callable[[str], None],
) -> Iterable[str]:
    """Return a generator of SSE frames for ``graph`` streaming ``input_messages``.

    The agent runs in a daemon thread. Chunks become ``token`` frames; normal
    completion yields a final ``done`` frame carrying the full text; a thread
    error yields an ``error`` frame. While no chunk arrives for
    ``HEARTBEAT_TIMEOUT_SECONDS`` a ``: ping`` heartbeat comment is emitted;
    if the agent thread dies without producing a terminal frame, an ``error``
    frame is emitted instead of hanging forever.

    ``on_finalize`` is called exactly once (from the agent thread) with the
    accumulated assistant text: the full reply on success, or the partial
    reply when the client disconnected mid-stream. When the generator exits
    for any reason (including client disconnect) the agent thread is
    signalled to stop between chunks, and database connections opened by the
    thread are returned to the pool.
    """
    token_queue: queue.Queue = queue.Queue()
    stop_event = threading.Event()
    state = {"text": ""}

    def run_agent():
        error = None
        stopped = False
        try:
            stream = graph.stream(
                {"messages": input_messages}, stream_mode="messages"
            )
            for message, _metadata in stream:
                if stop_event.is_set():
                    stopped = True
                    break
                token = _extract_token(message)
                if token:
                    state["text"] += token
                    token_queue.put(("token", token))
        except Exception:  # noqa: BLE001 - stream errors are reported via SSE
            logger.exception("Agent stream failed")
            error = "generation failed"
        finally:
            # Finalize before the terminal frame so the client never sees
            # "done" before the assistant message is persisted.
            try:
                on_finalize(state["text"])
            except Exception:  # noqa: BLE001 - finalization must not kill the thread
                logger.exception("Failed to finalize chat stream")
            close_old_connections()
            if error is not None:
                token_queue.put(("error", error))
            elif not stopped:
                token_queue.put(("done", None))
            # When stopped (client disconnected) the generator is gone; no
            # terminal frame is needed and it will notice the thread's death.

    thread = threading.Thread(target=run_agent, daemon=True)
    thread.start()

    def generate():
        try:
            while True:
                try:
                    kind, payload = token_queue.get(timeout=HEARTBEAT_TIMEOUT_SECONDS)
                except queue.Empty:
                    if not thread.is_alive():
                        # Thread died without a terminal frame: report instead
                        # of streaming heartbeats forever.
                        yield _frame("error", {"message": "agent stopped unexpectedly"})
                        break
                    yield ": ping\n\n"
                    continue
                if kind == "token":
                    yield _frame("token", {"content": payload})
                elif kind == "done":
                    yield _frame("done", {"content": state["text"]})
                    break
                elif kind == "error":
                    yield _frame("error", {"message": payload})
                    break
        finally:
            stop_event.set()

    return generate()
