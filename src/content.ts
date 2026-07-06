import {
  isExtensionMessage,
  MSG_SOURCE,
  type DislikeRequestMessage,
} from "./types";

const NOTE_ID_RE = /\/explore\/([0-9a-f]{24})/i;
const INJECTED_ATTR = "data-xhs-dislike-injected";
const pending = new Map<string, { btn: HTMLButtonElement; card: HTMLElement }>();
let injectedScriptLoaded = false;
let signReady = false;

function injectPageScript(): void {
  if (injectedScriptLoaded) return;
  const src = chrome.runtime.getURL("injected.js");
  const script = document.createElement("script");
  script.src = src;
  script.async = false;
  script.onload = () => script.remove();
  (document.head || document.documentElement).appendChild(script);
  injectedScriptLoaded = true;
}

function extractNoteId(likeWrapper: Element): string | null {
  const section =
    likeWrapper.closest("section.note-item") ??
    likeWrapper.closest('section:has(a[href*="/explore/"])') ??
    likeWrapper.closest("section");

  if (!section) return null;

  const link = section.querySelector<HTMLAnchorElement>('a[href*="/explore/"]');
  if (!link?.href) return null;

  const match = link.href.match(NOTE_ID_RE);
  return match?.[1] ?? null;
}

function createDislikeIcon(active = false): string {
  const strokeAttrs = active
    ? 'fill="none" stroke="currentColor" stroke-width="1.5"'
    : 'fill="none" stroke="currentColor" stroke-width="1.5"';

  return `
    <svg viewBox="0 0 24 24" ${strokeAttrs} stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9"/>
      <path d="M8.5 10.25c.75 1.25 1.75 1.25 2.5 0"/>
      <path d="M13 10.25c.75 1.25 1.75 1.25 2.5 0"/>
      <line x1="9.5" y1="15" x2="14.5" y2="15"/>
    </svg>
  `;
}

function createDislikeButton(): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "xhs-dislike-btn";
  btn.title = "不感兴趣";
  btn.setAttribute("aria-label", "不感兴趣");
  btn.innerHTML = createDislikeIcon();
  return btn;
}

function markDislikeSuccess(btn: HTMLButtonElement): void {
  btn.classList.remove("is-loading");
  btn.classList.add("is-active");
  btn.disabled = true;
  btn.innerHTML = createDislikeIcon(true);
  btn.title = "已标记不感兴趣";
}

function dimCard(card: HTMLElement): void {
  card.classList.add("xhs-dislike-card-dimmed");
  card.setAttribute("data-xhs-disliked", "true");
}

function requestDislike(noteId: string, btn: HTMLButtonElement, card: HTMLElement): void {
  if (!signReady) {
    btn.classList.add("is-error");
    btn.title = "请求客户端未就绪，请刷新页面";
    window.setTimeout(() => btn.classList.remove("is-error"), 500);
    return;
  }

  const requestId = crypto.randomUUID();
  pending.set(requestId, { btn, card });

  btn.disabled = true;
  btn.classList.add("is-loading");
  btn.title = "处理中…";

  const message: DislikeRequestMessage = {
    source: MSG_SOURCE,
    type: "XHS_DISLIKE",
    noteId,
    requestId,
  };

  window.postMessage(message, window.location.origin);
}

function injectButton(likeWrapper: Element): void {
  if (likeWrapper.getAttribute(INJECTED_ATTR) === "true") return;

  const parent = likeWrapper.parentElement;
  if (!parent) return;

  const noteId = extractNoteId(likeWrapper);
  const btn = createDislikeButton();
  const spacer = document.createElement("span");
  spacer.className = "flex-1 xhs-dislike-spacer";
  spacer.setAttribute("aria-hidden", "true");

  if (!noteId) {
    btn.disabled = true;
    btn.title = "无法识别笔记 ID";
  } else {
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const card =
        likeWrapper.closest("section.note-item") ??
        likeWrapper.closest('section:has(a[href*="/explore/"])') ??
        likeWrapper.closest("section");
      if (!card || !(card instanceof HTMLElement)) return;
      requestDislike(noteId, btn, card);
    });
  }

  parent.insertBefore(spacer, likeWrapper);
  parent.insertBefore(btn, likeWrapper);
  likeWrapper.setAttribute(INJECTED_ATTR, "true");
}

function scan(root: ParentNode = document): void {
  root.querySelectorAll(".like-wrapper").forEach((el) => {
    if (el.getAttribute(INJECTED_ATTR) !== "true") {
      injectButton(el);
    }
  });
}

function handleMessage(event: MessageEvent): void {
  if (event.source !== window || !isExtensionMessage(event.data)) return;

  const data = event.data;

  if (data.type === "XHS_DISLIKE_READY") {
    signReady = data.ready;
    if (!data.ready && data.error) {
      console.warn("[xhs-dislike]", data.error);
    }
    return;
  }

  if (data.type !== "XHS_DISLIKE_RESULT") return;

  const entry = pending.get(data.requestId);
  pending.delete(data.requestId);
  if (!entry) return;

  const { btn, card } = entry;

  if (data.ok) {
    markDislikeSuccess(btn);
    dimCard(card);
    return;
  }

  btn.classList.remove("is-loading");
  btn.disabled = false;

  btn.classList.add("is-error");
  btn.title = data.error ?? "操作失败";
  window.setTimeout(() => btn.classList.remove("is-error"), 600);
}

function init(): void {
  injectPageScript();
  scan();

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (!(node instanceof HTMLElement)) return;
        if (node.matches?.(".like-wrapper")) {
          injectButton(node);
        } else {
          scan(node);
        }
      });
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener("message", handleMessage);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
