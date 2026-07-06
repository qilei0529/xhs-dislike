const BASE_URL = "https://edith.xiaohongshu.com";

type XhsAxios = {
  get: (url: string, config?: unknown) => Promise<unknown>;
  post: (url: string, body?: unknown, config?: unknown) => Promise<unknown>;
  interceptors?: {
    response?: { handlers?: Array<unknown | null> };
  };
};

type WebpackRequire = {
  c: Record<string, { exports?: unknown }>;
};

declare global {
  interface Window {
    __xhsWpr?: WebpackRequire;
    __xhsAxios?: XhsAxios;
    webpackChunkxhs_pc_web?: unknown[];
    webpackChunkxiaohongshu_web?: unknown[];
    webpackChunkxiaohongshu?: unknown[];
  }
}

let cachedAxios: XhsAxios | null = null;

function getWebpackChunk(): { push: (args: unknown[]) => unknown } | null {
  const names = [
    "webpackChunkxhs_pc_web",
    "webpackChunkxiaohongshu_web",
    "webpackChunkxiaohongshu",
  ];

  for (const name of names) {
    const chunk = (window as Record<string, unknown>)[name] as
      | { push: (args: unknown[]) => unknown }
      | undefined;
    if (chunk?.push) return chunk;
  }
  return null;
}

function getWebpackRequire(): WebpackRequire | null {
  if (window.__xhsWpr) return window.__xhsWpr;

  const chunk = getWebpackChunk();
  if (!chunk) return null;

  try {
    const key = `xhs_dislike_${Date.now()}`;
    chunk.push([
      [key],
      {},
      (require: WebpackRequire) => {
        window.__xhsWpr = require;
      },
    ]);
  } catch {
    return null;
  }

  return window.__xhsWpr ?? null;
}

function isAxiosCandidate(value: unknown): value is XhsAxios {
  if (!value || typeof value !== "object") return false;
  const candidate = value as XhsAxios;
  return (
    (typeof candidate.get === "function" || typeof candidate.post === "function") &&
    Boolean(candidate.interceptors)
  );
}

function findAxios(): XhsAxios | null {
  if (cachedAxios) return cachedAxios;
  if (window.__xhsAxios && isAxiosCandidate(window.__xhsAxios)) {
    cachedAxios = window.__xhsAxios;
    return cachedAxios;
  }

  const require = getWebpackRequire();
  if (!require?.c) return null;

  for (const id of Object.keys(require.c)) {
    const exp = require.c[id]?.exports;
    const candidates = [
      exp,
      (exp as { default?: unknown })?.default,
      (exp as { Z?: unknown })?.Z,
      (exp as { A?: unknown })?.A,
      (exp as { N?: unknown })?.N,
    ];

    for (const candidate of candidates) {
      if (isAxiosCandidate(candidate)) {
        cachedAxios = candidate;
        window.__xhsAxios = candidate;
        return candidate;
      }
    }
  }

  const fallback = require.c["85456"]?.exports as
    | { default?: XhsAxios }
    | XhsAxios
    | undefined;
  const fallbackAxios =
    (fallback as { default?: XhsAxios })?.default ?? (fallback as XhsAxios | undefined);

  if (isAxiosCandidate(fallbackAxios)) {
    cachedAxios = fallbackAxios;
    window.__xhsAxios = fallbackAxios;
    return fallbackAxios;
  }

  return null;
}

function buildUrl(path: string): string {
  return `${BASE_URL}${path}`;
}

function unwrapAxiosResponse(result: unknown): {
  success?: boolean;
  code?: number;
  msg?: string;
} {
  if (!result || typeof result !== "object") return {};

  const response = result as {
    status?: number;
    data?: { success?: boolean; code?: number; msg?: string };
    success?: boolean;
    code?: number;
    msg?: string;
  };

  if (
    typeof response.status === "number" &&
    response.data &&
    typeof response.data === "object"
  ) {
    return response.data;
  }

  return response;
}

export async function initSignBridge(timeoutMs = 15000): Promise<void> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (findAxios()) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error("页面请求客户端未就绪，请刷新小红书页面后重试");
}

export async function signedPost<T extends Record<string, unknown>>(
  uri: string,
  body: T
): Promise<Response> {
  const axios = findAxios();
  if (!axios) {
    throw new Error("页面请求客户端未就绪，请刷新页面后重试");
  }

  try {
    const result = await axios.post(buildUrl(uri), body);
    const payload = unwrapAxiosResponse(result);
    const ok =
      payload.success !== false && (payload.code === undefined || payload.code === 0);

    return new Response(JSON.stringify(payload), {
      status: ok ? 200 : 406,
      headers: { "content-type": "application/json" },
    });
  } catch (error) {
    const err = error as {
      response?: { status?: number; data?: { msg?: string; code?: number; success?: boolean } };
      message?: string;
    };

    if (err.response?.data) {
      const payload = err.response.data;
      return new Response(JSON.stringify(payload), {
        status: err.response.status ?? 406,
        headers: { "content-type": "application/json" },
      });
    }

    throw new Error(err.message ?? "请求失败");
  }
}

export function isSignReady(): boolean {
  return findAxios() !== null;
}
