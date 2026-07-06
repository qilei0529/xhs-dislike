import { MSG_SOURCE } from "./types";
import { initSignBridge, isSignReady, signedPost } from "./sign";

const DISLIKE_URI = "/api/sns/web/v1/note/dislike";

async function dislikeNote(noteId: string): Promise<void> {
  const response = await signedPost(DISLIKE_URI, { note_oid: noteId });
  let payload: { success?: boolean; code?: number; msg?: string } | null = null;

  try {
    payload = await response.json();
  } catch {
    // ignore parse errors
  }

  if (!response.ok) {
    throw new Error(payload?.msg ?? `请求失败 (${response.status})`);
  }

  if (payload && payload.success === false) {
    throw new Error(payload.msg ?? `接口错误 (${payload.code ?? "unknown"})`);
  }
}

function postResult(
  requestId: string,
  noteId: string,
  ok: boolean,
  error?: string
): void {
  window.postMessage(
    {
      source: MSG_SOURCE,
      type: "XHS_DISLIKE_RESULT",
      requestId,
      noteId,
      ok,
      error,
    },
    window.location.origin
  );
}

function postReady(ready: boolean, error?: string): void {
  window.postMessage(
    {
      source: MSG_SOURCE,
      type: "XHS_DISLIKE_READY",
      ready,
      error,
    },
    window.location.origin
  );
}

async function boot(): Promise<void> {
  try {
    await initSignBridge();
    postReady(isSignReady());
  } catch (error) {
    postReady(false, error instanceof Error ? error.message : "请求客户端初始化失败");
  }
}

window.addEventListener("message", async (event) => {
  if (event.source !== window || event.origin !== window.location.origin) return;
  const data = event.data;
  if (!data || data.source !== MSG_SOURCE || data.type !== "XHS_DISLIKE") return;

  const { noteId, requestId } = data as { noteId: string; requestId: string };
  if (!noteId || !requestId) return;

  try {
    if (!isSignReady()) {
      await initSignBridge(5000);
    }
    await dislikeNote(noteId);
    postResult(requestId, noteId, true);
  } catch (error) {
    postResult(
      requestId,
      noteId,
      false,
      error instanceof Error ? error.message : "操作失败"
    );
  }
});

void boot();
