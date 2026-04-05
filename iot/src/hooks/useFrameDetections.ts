import { useEffect, useMemo, useRef, useState } from "react";
import { API_BASE_URL } from "../services/config";

export type FrameDetection = {
  id: number;
  frame_id: string;
  timestamp: string;
  label: string;
  class_id: number;
  confidence: number;
  bbox: [number, number, number, number];
};

type _DetectionEvent = {
  type: "detection";
  data: FrameDetection;
};

type _FrameEvent = {
  type: "frame";
  data: {
    id: string;
    timestamp: string;
    ingest_timestamp: string;
    update_timestamp: string;
    stream_id: string;
    fps: number;
    scale: number;
  };
};

type _SSEMessage = _DetectionEvent | _FrameEvent;

type UseFrameDetectionsResult = {
  detectionsByFrameId: Record<string, FrameDetection[]>;
  listening: boolean;
};

/**
 * Best-effort detection lookup for a set of frame ids.
 *
 * Note:
 * - This uses the existing SSE stream to avoid adding a new backend endpoint.
 * - It stops automatically after a short time to avoid backend load.
 * - Some frames may not be present in the SSE replay window and will have no detections.
 */
export function useFrameDetections(
  frameIds: string[],
  enabled: boolean,
  options?: { offset?: number; maxListenMs?: number },
): UseFrameDetectionsResult {
  const offset = options?.offset ?? 2000;
  const maxListenMs = options?.maxListenMs ?? 3000;

  const [detectionsByFrameId, setDetectionsByFrameId] = useState<Record<string, FrameDetection[]>>(
    {},
  );
  const [listening, setListening] = useState(false);
  const seqRef = useRef(0);

  // Use a stable key to avoid effects firing due to new array identities.
  const frameIdsKey = frameIds.join("|");
  const targetSet = useMemo(() => new Set(frameIds), [frameIdsKey]);

  useEffect(() => {
    if (!enabled || frameIds.length === 0) {
      setDetectionsByFrameId((prev) => (Object.keys(prev).length === 0 ? prev : {}));
      setListening((prev) => (prev ? false : prev));
      return;
    }

    const seq = ++seqRef.current;
    setDetectionsByFrameId((prev) => (Object.keys(prev).length === 0 ? prev : {}));
    setListening(true);

    const url = `${API_BASE_URL}/sse/detections?offset=${offset}`;
    const source = new EventSource(url);

    const stop = () => {
      try {
        source.close();
      } catch {
        // Ignore close errors
      }
    };

    const timeoutId = window.setTimeout(() => {
      if (seqRef.current !== seq) return;
      stop();
      setListening(false);
    }, maxListenMs);

    source.onmessage = (event) => {
      if (seqRef.current !== seq) return;

      try {
        const parsed = JSON.parse(event.data) as _SSEMessage;
        if (parsed.type !== "detection") return;
        const det = parsed.data;
        if (!det?.frame_id) return;
        if (!targetSet.has(det.frame_id)) return;

        setDetectionsByFrameId((prev) => {
          const existing = prev[det.frame_id] || [];
          // Keep the list bounded for UI.
          const next = existing.length >= 50 ? existing.slice(-49).concat(det) : existing.concat(det);
          return { ...prev, [det.frame_id]: next };
        });
      } catch {
        // Ignore parse errors
      }
    };

    source.onerror = () => {
      if (seqRef.current !== seq) return;
      stop();
      window.clearTimeout(timeoutId);
      setListening(false);
    };

    return () => {
      window.clearTimeout(timeoutId);
      stop();
      setListening((prev) => (prev ? false : prev));
    };
  }, [enabled, frameIdsKey, frameIds.length, maxListenMs, offset, targetSet]);

  return { detectionsByFrameId, listening };
}

