// Frames Service
// Lightweight service calls for frame ids and related lookups.

import { API_BASE_URL, getAuthHeaders } from "./config";
import { buildRequestHeaders } from "./serviceUtils";

export type ListFrameIdsParams = {
  stream_id: string;
  start: string;
  end: string;
  /**
   * Optional label filter for frame id selection (backend may use this for caching
   * or additional filtering).
   */
  label?: string;
  /**
   * Optional minimum detection confidence (0.0 to 1.0) used by the backend to
   * filter returned frame ids.
   */
  min_confidence?: number;
  limit?: number;
};

type _ListFrameIdsOptions = {
  signal?: AbortSignal;
};

type _CacheEntry = {
  ids: string[];
  cachedAtMs: number;
};

const _CACHE_TTL_MS = 60_000;
const _frameIdsCache = new Map<string, _CacheEntry>();
const _inFlight = new Map<string, Promise<string[]>>();

const _cacheKey = (params: ListFrameIdsParams): string => {
  return [
    params.stream_id,
    params.start,
    params.end,
    params.label ?? "",
    String(params.min_confidence ?? ""),
    String(params.limit ?? 500),
  ].join("|");
};

/**
 * Fetch a list of frame ids for a stream within a time range.
 *
 * Note:
 * - Uses a small in-memory cache to avoid repeated calls while hovering.
 * - Accepts an AbortSignal so hover transitions can cancel in-flight requests.
 */
export async function listFrameIds(
  params: ListFrameIdsParams,
  options: _ListFrameIdsOptions = {},
): Promise<string[]> {
  const normalized: ListFrameIdsParams = {
    ...params,
    limit: params.limit ?? 500,
  };

  const key = _cacheKey(normalized);

  const cached = _frameIdsCache.get(key);
  if (cached && Date.now() - cached.cachedAtMs < _CACHE_TTL_MS) {
    return cached.ids;
  }

  const existing = _inFlight.get(key);
  if (existing) {
    return existing;
  }

  const promise = (async () => {
    const queryParams = new URLSearchParams();
    queryParams.set("stream_id", normalized.stream_id);
    queryParams.set("start", normalized.start);
    queryParams.set("end", normalized.end);
    if (normalized.label) {
      queryParams.set("label", normalized.label);
    }
    if (normalized.min_confidence !== undefined) {
      queryParams.set("min_confidence", String(normalized.min_confidence));
    }
    queryParams.set("limit", String(normalized.limit));

    const url = `${API_BASE_URL}/frames/ids?${queryParams.toString()}`;
    const response = await fetch(url, {
      method: "GET",
      headers: buildRequestHeaders({
        ...getAuthHeaders(),
      }),
      signal: options.signal,
    });

    if (!response.ok) {
      const bodyText = await response.text().catch(() => "");
      throw new Error(
        bodyText || `Failed to load frame ids (HTTP ${response.status})`,
      );
    }

    const ids = (await response.json()) as unknown;
    const list = Array.isArray(ids) ? (ids as string[]) : [];

    _frameIdsCache.set(key, { ids: list, cachedAtMs: Date.now() });
    return list;
  })();

  _inFlight.set(key, promise);

  try {
    return await promise;
  } finally {
    _inFlight.delete(key);
  }
}

export type DetectionBBox = {
  label: string | null;
  class_id: number | null;
  confidence: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export type FrameDetectionsBBoxResponse = {
  frame_id: string;
  boxes: DetectionBBox[];
};

export type FrameDetectionsBBoxRequest = {
  frame_ids: string[];
  label?: string | null;
  min_confidence?: number;
};

type _FrameBBoxesOptions = {
  signal?: AbortSignal;
};

/**
 * Fetch detection bounding boxes for specific frame ids.
 */
export async function getFrameDetectionBBoxes(
  body: FrameDetectionsBBoxRequest,
  options: _FrameBBoxesOptions = {},
): Promise<FrameDetectionsBBoxResponse[]> {
  const url = `${API_BASE_URL}/frames/detections/bboxes`;
  const response = await fetch(url, {
    method: "POST",
    headers: buildRequestHeaders({
      ...getAuthHeaders(),
    }),
    body: JSON.stringify({
      frame_ids: body.frame_ids,
      label: body.label ?? null,
      min_confidence: body.min_confidence ?? 0.0,
    }),
    signal: options.signal,
  });

  if (!response.ok) {
    const bodyText = await response.text().catch(() => "");
    throw new Error(
      bodyText || `Failed to load frame bboxes (HTTP ${response.status})`,
    );
  }

  const data = (await response.json()) as unknown;
  return Array.isArray(data) ? (data as FrameDetectionsBBoxResponse[]) : [];
}

