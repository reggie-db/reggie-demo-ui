"use client";

import { getSessionId } from "../services/serviceUtils";

export type JoltRecipient = {
  type: "user" | "role" | "group";
  value: string;
};

export type JoltRule = {
  id: string;
  name: string;
  label: string;
  countThreshold?: number;
  withinMinutes?: number;
  operator: "AND" | "OR";
  recipients: JoltRecipient[];
};

export type JoltNotification = {
  id: string;
  sessionId: string;
  createdAtIso: string;
  title: string;
  body: string;
  rule?: Pick<JoltRule, "id" | "name">;
  recipients: JoltRecipient[];
  severity: "info" | "warning" | "critical";
};

type _BusMessage =
  | {
      type: "jolt.notification";
      payload: JoltNotification;
    }
  | {
      type: "jolt.ping";
      sessionId: string;
      createdAtIso: string;
    };

const _CHANNEL_NAME = "jolt-demo.notifications";
const _JOLT_SESSION_STORAGE_KEY = "jolt_demo_session_id";

const _getChannel = (): BroadcastChannel | null => {
  // BroadcastChannel is the cleanest way to communicate between tabs without
  // adding any storage. It is supported in all modern browsers.
  if (typeof BroadcastChannel === "undefined") return null;
  return new BroadcastChannel(_CHANNEL_NAME);
};

const _newId = (): string => {
  return `jolt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

export const getJoltSessionId = (): string => {
  // We need the same session id across tabs/windows for the demo.
  // sessionStorage is per-tab, so we prefer a localStorage backed session id.
  try {
    const existing = localStorage.getItem(_JOLT_SESSION_STORAGE_KEY);
    if (existing && existing.trim()) {
      return existing;
    }
    const next = getSessionId();
    localStorage.setItem(_JOLT_SESSION_STORAGE_KEY, next);
    return next;
  } catch {
    // Fallback when storage is unavailable.
    return getSessionId();
  }
};

export const setJoltSessionId = (sessionId: string) => {
  try {
    localStorage.setItem(_JOLT_SESSION_STORAGE_KEY, sessionId);
  } catch {
    // Ignore storage failures
  }
};

export const publishJoltNotification = (input: Omit<JoltNotification, "id" | "sessionId" | "createdAtIso">) => {
  const sessionId = getJoltSessionId();
  const message: _BusMessage = {
    type: "jolt.notification",
    payload: {
      ...input,
      id: _newId(),
      sessionId,
      createdAtIso: new Date().toISOString(),
    },
  };

  const channel = _getChannel();
  channel?.postMessage(message);
  channel?.close();
};

export const pingJoltBus = () => {
  const channel = _getChannel();
  if (!channel) return;
  const message: _BusMessage = {
    type: "jolt.ping",
    sessionId: getJoltSessionId(),
    createdAtIso: new Date().toISOString(),
  };
  channel.postMessage(message);
  channel.close();
};

export const subscribeToJoltBus = (handlers: {
  onNotification: (notification: JoltNotification) => void;
  onPing?: (sessionId: string) => void;
}) => {
  const channel = _getChannel();
  if (!channel) {
    return () => {};
  }

  const onMessage = (ev: MessageEvent) => {
    const msg = ev.data as _BusMessage;
    if (!msg || typeof msg !== "object" || !("type" in msg)) return;

    // Do NOT capture session id at subscribe time. The demo can open the receiver
    // window first, then set the shared session id later from the rules page.
    // Always compare against the current shared session id.
    const currentSessionId = getJoltSessionId();

    if (msg.type === "jolt.notification") {
      // Session-scoped delivery: only accept notifications for our session.
      if (msg.payload?.sessionId !== currentSessionId) return;
      handlers.onNotification(msg.payload);
    } else if (msg.type === "jolt.ping") {
      if (msg.sessionId !== currentSessionId) return;
      handlers.onPing?.(msg.sessionId);
    }
  };

  channel.addEventListener("message", onMessage);

  return () => {
    channel.removeEventListener("message", onMessage);
    channel.close();
  };
};

