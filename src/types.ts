export const MSG_SOURCE = "xhs-dislike-ext" as const;

export type DislikeRequestMessage = {
  source: typeof MSG_SOURCE;
  type: "XHS_DISLIKE";
  noteId: string;
  requestId: string;
};

export type DislikeResultMessage = {
  source: typeof MSG_SOURCE;
  type: "XHS_DISLIKE_RESULT";
  requestId: string;
  noteId: string;
  ok: boolean;
  error?: string;
};

export type InjectedReadyMessage = {
  source: typeof MSG_SOURCE;
  type: "XHS_DISLIKE_READY";
  ready: boolean;
  error?: string;
};

export function isExtensionMessage(
  data: unknown
): data is DislikeResultMessage | InjectedReadyMessage {
  return (
    typeof data === "object" &&
    data !== null &&
    (data as { source?: string }).source === MSG_SOURCE
  );
}
