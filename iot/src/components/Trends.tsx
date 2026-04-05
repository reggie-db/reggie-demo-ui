// Trends Component
// Displays frame coverage trends over time with filtering

import { AlertCircle, ChevronDown, Loader2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { API_BASE_URL } from '../services/config';
import {
  FrameCoverageBucket,
  FrameCoverageParams,
  getAvailableDeviceNames,
  getAvailableLabels,
  getAvailableStoreIds,
  getFrameCoverage,
} from '../services/frameCoverageService';
import { getFrameDetectionBBoxes, listFrameIds } from '../services/framesService';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { DateTimeFilterInput } from './ui/date-time-filter-input';
import type { DetectionOverlayDetection } from './ui/detection-overlay';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { FrameImageWithOverlay } from './ui/frame-image-with-overlay';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { TokenInput } from './ui/token-input';
import { cn } from './ui/utils';

interface ChartDataPoint {
  time: string;
  [key: string]: string | number | null; // Dynamic keys for stream_id/label combinations (null for gaps)
}

type _HoveredPoint = {
  timeKey: string;
  seriesKey: string;
} | null;

type _ActiveDotProps = {
  cx?: number;
  cy?: number;
  payload?: any;
};

type _ClickableActiveDotProps = _ActiveDotProps & {
  seriesKey: string;
  onOpen: (seriesKey: string, timeKey: string) => void;
};

const _ClickableActiveDot = ({ cx, cy, payload, seriesKey, onOpen }: _ClickableActiveDotProps) => {
  const timeKey: string | undefined = payload?.time;
  if (!cx || !cy || !timeKey) return null;

  return (
    <g
      style={{ cursor: 'pointer' }}
      onClick={(e) => {
        e.stopPropagation();
        onOpen(seriesKey, timeKey);
      }}
    >
      {/* outer ring for easier clicking */}
      <circle cx={cx} cy={cy} r={9} fill="transparent" />
      <circle cx={cx} cy={cy} r={5} fill="#0f172a" stroke="#ffffff" strokeWidth={2} />
    </g>
  );
};

type _FramePreviewTooltipProps = {
  identifier: string;
  formattedLabel: string;
  bucket?: FrameCoverageBucket;
  valueNum?: number;
  minConfidence?: number;
};

const _FramePreviewTooltip = ({
  identifier,
  formattedLabel,
  bucket,
  valueNum,
  minConfidence,
}: _FramePreviewTooltipProps) => {
  const [frameIds, setFrameIds] = useState<string[] | null>(null);
  const [framesLoading, setFramesLoading] = useState(false);
  const [framesError, setFramesError] = useState<string | null>(null);
  const [loadedThumbs, setLoadedThumbs] = useState<Record<string, boolean>>({});
  const requestSeqRef = useRef(0);

  const streamId = bucket?.stream_id || undefined;
  const start = bucket?.interval_start || undefined;
  const end = bucket?.interval_end || undefined;

  useEffect(() => {
    if (frameIds && frameIds.length > 0) {
      setLoadedThumbs({});
    }
  }, [frameIds]);

  useEffect(() => {
    if (!streamId || !start || !end) {
      setFrameIds(null);
      setFramesError(null);
      setFramesLoading(false);
      return;
    }

    const controller = new AbortController();
    const requestSeq = ++requestSeqRef.current;
    const debounceMs = 250;

    // Always show loading immediately, but debounce backend calls to avoid
    // hammering the API when the user scrubs across points.
    setFramesLoading(true);
    setFramesError(null);
    setFrameIds(null);

    const timeoutId = window.setTimeout(() => {
      listFrameIds(
        {
          stream_id: streamId,
          start,
          end,
          label: bucket?.label,
          min_confidence: minConfidence,
          limit: 5,
        },
        { signal: controller.signal },
      )
        .then((ids) => {
          // Ignore results from stale requests (hover changes quickly).
          if (requestSeqRef.current !== requestSeq) return;
          setFrameIds(ids.slice(0, 5));
        })
        .catch((err) => {
          // Abort is expected during quick hover transitions.
          if (controller.signal.aborted) return;
          if (requestSeqRef.current !== requestSeq) return;
          setFramesError(err instanceof Error ? err.message : 'Failed to load frame ids');
          setFrameIds([]);
        })
        .finally(() => {
          if (controller.signal.aborted) return;
          if (requestSeqRef.current !== requestSeq) return;
          setFramesLoading(false);
        });
    }, debounceMs);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [streamId, start, end]);

  return (
    <div className="relative z-50 w-[440px] rounded-lg border border-slate-200 bg-white p-3 shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-900 truncate">
            {identifier} {formattedLabel}
          </div>
          {bucket ? (
            <div className="mt-1 text-xs text-slate-600">
              <div>
                {_formatTooltipDateTime(bucket.interval_start)} to {_formatTooltipDateTime(bucket.interval_end)}
              </div>
              <div className="mt-0.5">
                {typeof valueNum === 'number'
                  ? `${valueNum.toFixed(2)}% (Conf: ${(bucket.avg_confidence * 100).toFixed(1)}%, Frames: ${bucket.total_frames})`
                  : '-'}
              </div>
            </div>
          ) : (
            <div className="mt-1 text-xs text-slate-600">
              {typeof valueNum === 'number' ? `${valueNum.toFixed(2)}%` : '-'}
            </div>
          )}
        </div>
        {framesLoading && (
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <Loader2 className="w-3 h-3 animate-spin" />
            Loading frames...
          </div>
        )}
      </div>

      {!streamId && (
        <div className="mt-3 text-xs text-slate-500">
          No stream id available for this series.
        </div>
      )}

      {framesError && (
        <div className="mt-3 text-xs text-red-600">
          {framesError}
        </div>
      )}

      {streamId && !framesLoading && !framesError && (
        <div className="mt-3">
          {frameIds === null ? (
            <div className="text-xs text-slate-500">Loading frames...</div>
          ) : frameIds.length === 0 ? (
            <div className="text-xs text-slate-500">No frames in this window.</div>
          ) : (
            <div className="grid grid-cols-5 gap-2">
              {frameIds.map((id) => (
                <div key={id} className="w-full">
                  <div className="relative h-16 w-full">
                    {!loadedThumbs[id] && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-md border border-slate-200 bg-slate-50">
                        <Loader2 className="size-4 animate-spin text-slate-500" />
                      </div>
                    )}
                    <img
                      src={`${API_BASE_URL}/image/${encodeURIComponent(id)}`}
                      alt={`Frame ${id}`}
                      className="h-16 w-full rounded-md border border-slate-200 object-cover bg-slate-50"
                      loading="lazy"
                      onLoad={() => setLoadedThumbs((prev) => ({ ...prev, [id]: true }))}
                      onError={() => setLoadedThumbs((prev) => ({ ...prev, [id]: true }))}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

type _SeriesKeyParts = {
  identifier: string;
  label: string;
};

const _parseSeriesKey = (seriesKey: string): _SeriesKeyParts => {
  const parts = seriesKey.split('_');
  const label = parts[parts.length - 1] || '';
  const identifier = parts.slice(0, -1).join('_') || 'unknown';
  return { identifier, label };
};

const _formatTooltipDateTime = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const _estimateFrameTimestampLabel = (
  bucket: FrameCoverageBucket | undefined,
  index: number,
  total: number,
): string | undefined => {
  // Backend `/frames/ids` currently returns only ids, not timestamps.
  // Provide a best-effort estimate based on bucket start/end and id order.
  if (!bucket?.interval_start || !bucket?.interval_end) return undefined;
  const start = new Date(bucket.interval_start).getTime();
  const end = new Date(bucket.interval_end).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return undefined;
  if (total <= 1) {
    return _formatTooltipDateTime(bucket.interval_start);
  }

  const ratio = Math.min(1, Math.max(0, index / (total - 1)));
  const ts = new Date(start + (end - start) * ratio).toISOString();
  return `~ ${_formatTooltipDateTime(ts)}`;
};

const _findBucketForPoint = (
  buckets: FrameCoverageBucket[],
  seriesKey: string,
  timeKey: string,
): FrameCoverageBucket | undefined => {
  const { identifier, label } = _parseSeriesKey(seriesKey);
  return buckets.find((b) => {
    const bucketId = String(b.store_id || b.stream_id || 'unknown');
    return (
      bucketId === identifier &&
      b.label === label &&
      new Date(b.interval_start).toISOString() === timeKey
    );
  });
};

export function Trends() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<FrameCoverageBucket[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const isInitialMount = useRef(true);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const coverageAbortRef = useRef<AbortController | null>(null);
  const coverageRequestSeqRef = useRef(0);
  const COVERAGE_DEBOUNCE_MS = 1000;
  const [, setHoveredPoint] = useState<_HoveredPoint>(null);
  const hoveredPointRef = useRef<_HoveredPoint>(null);

  // Available options from /values endpoints
  const [availableLabels, setAvailableLabels] = useState<string[]>([]);
  const [availableStoreIds, setAvailableStoreIds] = useState<string[]>([]);
  const [availableDeviceNames, setAvailableDeviceNames] = useState<string[]>([]);

  // Filter state with defaults matching the API
  const [filters, setFilters] = useState<FrameCoverageParams>({
    label: ['truck'],
    min_confidence: 0.75,
    interval: '30 minutes',
    max_deviation: 0.20,
  });

  const hasRequiredFilter = useMemo(() => {
    // Require at least one "real" filter to avoid expensive unbounded queries.
    // Note: interval/confidence/deviation tune the query but are not sufficient alone.
    const labelCount = filters.label?.length || 0;
    const storeCount = filters.store_id?.length || 0;
    const deviceCount = filters.device_name?.length || 0;
    const endpointCount = filters.endpoint_name?.length || 0;
    const hasTime = Boolean(filters.start || filters.end);

    return labelCount > 0 || storeCount > 0 || deviceCount > 0 || endpointCount > 0 || hasTime;
  }, [
    filters.label,
    filters.store_id,
    filters.device_name,
    filters.endpoint_name,
    filters.start,
    filters.end,
  ]);

  const [frameModalOpen, setFrameModalOpen] = useState(false);
  const [frameModalBucket, setFrameModalBucket] = useState<FrameCoverageBucket | undefined>(undefined);
  const [frameModalTitle, setFrameModalTitle] = useState<string>('');
  const [modalFrameIds, setModalFrameIds] = useState<string[] | null>(null);
  const [modalFramesLoading, setModalFramesLoading] = useState(false);
  const [modalFramesError, setModalFramesError] = useState<string | null>(null);
  const [modalBoxesLoading, setModalBoxesLoading] = useState(false);
  const [modalBoxesError, setModalBoxesError] = useState<string | null>(null);
  const [modalBoxesByFrameId, setModalBoxesByFrameId] = useState<Record<string, DetectionOverlayDetection[]>>({});
  const modalBoxesAbortRef = useRef<AbortController | null>(null);
  const modalFrameIdsAbortRef = useRef<AbortController | null>(null);
  const modalFrameIdsRequestSeqRef = useRef(0);
  const [zoomFrameId, setZoomFrameId] = useState<string | null>(null);
  const [modalImagesLoaded, setModalImagesLoaded] = useState<Record<string, boolean>>({});

  const modalTimestampByFrameId = useMemo(() => {
    const map: Record<string, string> = {};
    if (!frameModalBucket || !modalFrameIds || modalFrameIds.length === 0) return map;
    modalFrameIds.forEach((id, idx) => {
      const label = _estimateFrameTimestampLabel(frameModalBucket, idx, modalFrameIds.length);
      if (label) {
        map[id] = label;
      }
    });
    return map;
  }, [frameModalBucket, modalFrameIds]);
  const zoomTimestampLabel = zoomFrameId ? modalTimestampByFrameId[zoomFrameId] : undefined;
  const modalImageTotals = useMemo(() => {
    const total = modalFrameIds?.length || 0;
    if (total === 0) return { loaded: 0, total: 0 };
    let loaded = 0;
    for (const id of modalFrameIds || []) {
      if (modalImagesLoaded[id]) loaded += 1;
    }
    return { loaded, total };
  }, [modalFrameIds, modalImagesLoaded]);

  const openFramesModalForPoint = (seriesKey: string, timeKey: string) => {
    const bucket = _findBucketForPoint(data, seriesKey, timeKey);
    if (!bucket?.stream_id) return;

    const { identifier, label } = _parseSeriesKey(seriesKey);
    const formattedLabel = label ? label.charAt(0).toUpperCase() + label.slice(1) : 'Unknown';

    setFrameModalOpen(true);
    setFrameModalBucket(bucket);
    setFrameModalTitle(`${identifier} ${formattedLabel}`);
    setModalFramesLoading(true);
    setModalFramesError(null);
    setModalBoxesLoading(false);
    setModalBoxesError(null);
    setModalBoxesByFrameId({});
    setModalFrameIds(null);
    setZoomFrameId(null);
    setModalImagesLoaded({});

    modalFrameIdsAbortRef.current?.abort();
    const controller = new AbortController();
    modalFrameIdsAbortRef.current = controller;
    const requestSeq = ++modalFrameIdsRequestSeqRef.current;

    listFrameIds(
      {
        stream_id: bucket.stream_id,
        start: bucket.interval_start,
        end: bucket.interval_end,
        label: bucket.label,
        min_confidence: filters.min_confidence,
        limit: 5,
      },
      { signal: controller.signal },
    )
      .then((ids) => {
        if (controller.signal.aborted) return;
        if (modalFrameIdsRequestSeqRef.current !== requestSeq) return;
        setModalFrameIds(ids.slice(0, 5));
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        if (modalFrameIdsRequestSeqRef.current !== requestSeq) return;
        setModalFramesError(err instanceof Error ? err.message : 'Failed to load frame ids');
        setModalFrameIds([]);
      })
      .finally(() => {
        if (controller.signal.aborted) return;
        if (modalFrameIdsRequestSeqRef.current !== requestSeq) return;
        setModalFramesLoading(false);
      });
  };

  useEffect(() => {
    // When the modal has frame ids, fetch bounding boxes via the backend endpoint.
    if (!frameModalOpen || !frameModalBucket || !modalFrameIds || modalFrameIds.length === 0) {
      modalBoxesAbortRef.current?.abort();
      setModalBoxesLoading(false);
      setModalBoxesError(null);
      setModalBoxesByFrameId({});
      return;
    }

    modalBoxesAbortRef.current?.abort();
    const controller = new AbortController();
    modalBoxesAbortRef.current = controller;

    setModalBoxesLoading(true);
    setModalBoxesError(null);

    getFrameDetectionBBoxes(
      {
        frame_ids: modalFrameIds,
        // Keep boxes relevant to the selected series. Backend normalizes to lowercase.
        label: frameModalBucket.label,
        min_confidence: filters.min_confidence ?? 0.0,
      },
      { signal: controller.signal },
    )
      .then((rows) => {
        if (controller.signal.aborted) return;

        const byId: Record<string, DetectionOverlayDetection[]> = {};
        for (const row of rows) {
          byId[row.frame_id] = (row.boxes || []).map((b, idx) => ({
            id: `${row.frame_id}_${idx}`,
            label: b.label || frameModalBucket.label,
            class_id: b.class_id ?? 0,
            confidence: b.confidence,
            bbox: [b.x1, b.y1, b.x2, b.y2],
          }));
        }
        setModalBoxesByFrameId(byId);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setModalBoxesError(err instanceof Error ? err.message : 'Failed to load bounding boxes');
        setModalBoxesByFrameId({});
      })
      .finally(() => {
        if (controller.signal.aborted) return;
        setModalBoxesLoading(false);
      });

    return () => controller.abort();
  }, [frameModalOpen, frameModalBucket?.label, modalFrameIds?.join('|'), filters.min_confidence]);

  useEffect(() => {
    return () => {
      // Cancel any in-flight coverage request when the component unmounts.
      coverageAbortRef.current?.abort();
    };
  }, []);

  // Fetch data
  const fetchData = async () => {
    if (!hasRequiredFilter) {
      coverageAbortRef.current?.abort();
      setLoading(false);
      setError(null);
      setData([]);
      return;
    }

    // Cancel any previous request immediately. This prevents slow responses from
    // overwriting the UI with stale data after filters have changed.
    coverageAbortRef.current?.abort();
    const controller = new AbortController();
    coverageAbortRef.current = controller;
    const requestSeq = ++coverageRequestSeqRef.current;

    setLoading(true);
    setError(null);
    try {
      const result = await getFrameCoverage(filters, { signal: controller.signal });
      // Ignore stale responses if a newer request has started.
      if (coverageRequestSeqRef.current !== requestSeq) return;
      setData(result);
    } catch (err) {
      // Abort is expected during rapid filter changes.
      if (controller.signal.aborted) return;
      if (coverageRequestSeqRef.current !== requestSeq) return;
      setError(err instanceof Error ? err.message : 'Failed to fetch coverage data');
      console.error('Error fetching frame coverage:', err);
    } finally {
      if (coverageRequestSeqRef.current !== requestSeq) return;
      setLoading(false);
    }
  };

  // Fetch available options on mount (no filters - endpoints return all distinct values)
  useEffect(() => {
    const fetchOptions = async () => {
      setLoadingOptions(true);
      try {
        const [labels, storeIds, deviceNames] = await Promise.all([
          getAvailableLabels(),
          getAvailableStoreIds(),
          getAvailableDeviceNames(),
        ]);
        setAvailableLabels(labels);
        setAvailableStoreIds(storeIds);
        setAvailableDeviceNames(deviceNames);
      } catch (err) {
        console.error('Error fetching available options:', err);
        // Set empty arrays on error so UI doesn't break
        setAvailableLabels([]);
        setAvailableStoreIds([]);
        setAvailableDeviceNames([]);
      } finally {
        setLoadingOptions(false);
      }
    };
    fetchOptions();
  }, []); // Only fetch once on mount - endpoints return all values without filters

  // Debounced data fetch when filters change
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    // Cancel any in-flight coverage request as soon as filters change so the UI
    // can't be updated by a slow, stale response.
    coverageAbortRef.current?.abort();

    if (!hasRequiredFilter) {
      setLoading(false);
      setError(null);
      setData([]);
      return;
    }

    if (isInitialMount.current) {
      // First load - fetch immediately
      isInitialMount.current = false;
      fetchData();
    } else {
      // Subsequent changes - debounce
      timeoutId = setTimeout(() => {
        fetchData();
      }, COVERAGE_DEBOUNCE_MS);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [
    filters.label,
    filters.min_confidence,
    filters.interval,
    filters.max_deviation,
    filters.store_id,
    filters.device_name,
    filters.start,
    filters.end,
    filters.endpoint_name,
  ]);

  // Transform data for charting - group by stream_id/label pairs
  const chartData = useMemo(() => {
    if (!data.length) return [];

    // Parse interval to get milliseconds
    const intervalStr = filters.interval || '30 minutes';
    const intervalMatch = intervalStr.match(/(\d+)\s*(minute|hour|day)/i);
    let intervalMs = 15 * 60 * 1000; // Default 15 minutes
    if (intervalMatch) {
      const value = parseInt(intervalMatch[1]);
      const unit = intervalMatch[2].toLowerCase();
      if (unit === 'minute') {
        intervalMs = value * 60 * 1000;
      } else if (unit === 'hour') {
        intervalMs = value * 60 * 60 * 1000;
      } else if (unit === 'day') {
        intervalMs = value * 24 * 60 * 60 * 1000;
      }
    }

    // Create a map of time -> data points
    const timeMap = new Map<string, ChartDataPoint>();

    // Group by stream_id + label combination
    const seriesKeys = new Set<string>();

    data.forEach((bucket) => {
      // Use store_id with fallback to stream_id for the key
      // Convert to string to ensure consistent key format
      const identifier = String(bucket.store_id || bucket.stream_id || 'unknown');
      const key = `${identifier}_${bucket.label}`;
      seriesKeys.add(key);

      const timeKey = new Date(bucket.interval_start).toISOString();

      if (!timeMap.has(timeKey)) {
        timeMap.set(timeKey, { time: timeKey });
      }

      const point = timeMap.get(timeKey)!;
      point[key] = bucket.avg_coverage * 100; // Convert to percentage
    });

    // Convert to array and sort by time
    const sortedData = Array.from(timeMap.values()).sort(
      (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
    );

    // Handle gaps in timeline - if there's a gap > 1.5x the interval, insert null
    const gapThreshold = intervalMs * 1.5;

    const result: ChartDataPoint[] = [];

    for (let i = 0; i < sortedData.length; i++) {
      result.push(sortedData[i]);

      if (i < sortedData.length - 1) {
        const currentTime = new Date(sortedData[i].time).getTime();
        const nextTime = new Date(sortedData[i + 1].time).getTime();
        const gap = nextTime - currentTime;

        if (gap > gapThreshold) {
          // Insert a gap marker (null values) to break the line
          const gapPoint: ChartDataPoint = {
            time: new Date(currentTime + intervalMs).toISOString(),
          };
          seriesKeys.forEach((key) => {
            gapPoint[key] = null;
          });
          result.push(gapPoint);
        }
      }
    }

    return result;
  }, [data, filters.interval]);

  // Generate colors for each series
  const colors = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899',
    '#06b6d4', '#84cc16', '#f97316', '#6366f1', '#a855f7', '#d946ef',
  ];

  const seriesKeys = useMemo(() => {
    const keys = new Set<string>();
    data.forEach((bucket) => {
      // Use store_id with fallback to stream_id
      // Convert to string to ensure consistent key format
      const identifier = String(bucket.store_id || bucket.stream_id || 'unknown');
      const key = `${identifier}_${bucket.label}`;
      keys.add(key);
    });
    return Array.from(keys);
  }, [data]);

  const yDomain = useMemo((): [number, number] => {
    // Make the chart "react" to the actual data range so low percentages are still readable.
    // We keep values in percent units while shrinking the Y-axis range when appropriate.
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;

    for (const point of chartData) {
      for (const key of seriesKeys) {
        const raw = point[key];
        if (raw === null || raw === undefined) continue;
        const value = typeof raw === 'number' ? raw : Number.parseFloat(String(raw));
        if (Number.isNaN(value)) continue;
        if (value < min) min = value;
        if (value > max) max = value;
      }
    }

    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      return [0, 100];
    }

    // Pad a bit so lines do not touch the top/bottom.
    const range = Math.max(0, max - min);
    const pad = Math.max(1, range * 0.1);

    // Use tighter steps for low values to avoid jumping to huge domains.
    const step = max <= 20 ? 1 : 5;

    const paddedMin = Math.max(0, Math.floor((min - pad) / step) * step);
    const paddedMax = Math.ceil((max + pad) / step) * step;

    // Keep percent charts sensible. If values are within 0-100, keep the upper bound <= 100.
    const upper = max <= 100 ? Math.min(100, Math.max(paddedMax, step)) : paddedMax;

    // Ensure we always have a non-zero domain.
    if (upper <= paddedMin) {
      return [0, Math.max(step, upper)];
    }

    return [paddedMin, upper];
  }, [chartData, seriesKeys]);

  const handleFilterChange = (key: keyof FrameCoverageParams, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleArrayFilterChange = (key: 'label' | 'store_id' | 'device_name' | 'endpoint_name', value: string[]) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value.length > 0 ? value : undefined,
    }));
  };

  return (
    <div className="space-y-6">
      <Dialog open={frameModalOpen} onOpenChange={(open: boolean) => {
        setFrameModalOpen(open);
        if (!open) {
          setFrameModalBucket(undefined);
          setFrameModalTitle('');
          setModalFrameIds(null);
          setModalFramesLoading(false);
          setModalFramesError(null);
          setModalBoxesLoading(false);
          setModalBoxesError(null);
          setModalBoxesByFrameId({});
          modalBoxesAbortRef.current?.abort();
          modalFrameIdsAbortRef.current?.abort();
          setZoomFrameId(null);
          setModalImagesLoaded({});
        }
      }}>
        <DialogContent className="max-w-[80vw] w-[80vw] h-[80vh] sm:max-w-[80vw] sm:w-[80vw] sm:h-[80vh] p-0 overflow-hidden flex flex-col gap-0 pointer-events-auto">
          <div className="h-full flex flex-col min-h-0">
            <DialogHeader className="px-6 pt-6 pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <DialogTitle className="text-slate-900">
                    {frameModalTitle || 'Frames'}
                  </DialogTitle>
                  {frameModalBucket?.interval_start && frameModalBucket?.interval_end && (
                    <div className="text-sm text-slate-600">
                      {_formatTooltipDateTime(frameModalBucket.interval_start)} to {_formatTooltipDateTime(frameModalBucket.interval_end)}
                    </div>
                  )}
                  {zoomFrameId && (
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                      {zoomTimestampLabel && (
                        <div className="text-xs text-slate-600">{zoomTimestampLabel}</div>
                      )}
                      <div className="text-xs font-mono text-slate-500 break-all">{zoomFrameId}</div>
                    </div>
                  )}
                </div>
                {zoomFrameId && (
                  <Button type="button" variant="outline" size="sm" onClick={() => setZoomFrameId(null)}>
                    Back
                  </Button>
                )}
              </div>
              {modalBoxesLoading && (
                <div className="text-xs text-slate-500 flex items-center gap-2">
                  <Loader2 className="size-3 animate-spin" />
                  Loading bounding boxes...
                </div>
              )}
              {!zoomFrameId && modalImageTotals.total > 0 && (
                <div className="text-xs text-slate-500">
                  Images loaded: {modalImageTotals.loaded}/{modalImageTotals.total}
                </div>
              )}
            </DialogHeader>

            <div className="flex-1 overflow-auto px-6 pb-6 min-h-0">
              {modalFramesLoading && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Loader2 className="size-4 animate-spin" />
                  Loading frame ids...
                </div>
              )}

              {modalFramesError && (
                <div className="mt-3 text-sm text-red-600">
                  {modalFramesError}
                </div>
              )}

              {modalBoxesError && (
                <div className="mt-3 text-sm text-red-600">
                  {modalBoxesError}
                </div>
              )}

              {!modalFramesLoading && !modalFramesError && modalFrameIds && modalFrameIds.length === 0 && (
                <div className="mt-3 text-sm text-slate-600">
                  No frames in this window.
                </div>
              )}

              {!modalFramesLoading && !modalFramesError && modalFrameIds && modalFrameIds.length > 0 && (
                <>
                  {zoomFrameId ? (
                    <div className="mx-auto max-w-[75vw]">
                      <FrameImageWithOverlay
                        src={`${API_BASE_URL}/image/${encodeURIComponent(zoomFrameId)}`}
                        alt={`Frame ${zoomFrameId}`}
                        detections={modalBoxesByFrameId[zoomFrameId] || []}
                        heightClassName="h-[62vh]"
                        onLoadedChange={(loaded) => {
                          setModalImagesLoaded((prev) => ({ ...prev, [zoomFrameId]: loaded }));
                        }}
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {modalFrameIds.map((id, idx) => (
                        <div key={id} className="space-y-2">
                          <div className="flex items-baseline justify-between gap-3">
                            <div className="text-xs text-slate-600">
                              {modalTimestampByFrameId[id] || _estimateFrameTimestampLabel(frameModalBucket, idx, modalFrameIds.length)}
                            </div>
                            <div className="text-xs text-slate-500">
                              Frame {idx + 1} of {modalFrameIds.length}
                            </div>
                          </div>
                          <FrameImageWithOverlay
                            src={`${API_BASE_URL}/image/${encodeURIComponent(id)}`}
                            alt={`Frame ${id}`}
                            detections={modalBoxesByFrameId[id] || []}
                            heightClassName="h-[38vh]"
                            onClick={() => setZoomFrameId(id)}
                            onLoadedChange={(loaded) => {
                              setModalImagesLoaded((prev) => ({ ...prev, [id]: loaded }));
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Configure coverage analysis parameters</CardDescription>
        </CardHeader>
        <CardContent>
          {!hasRequiredFilter && (
            <Alert className="mb-4">
              <AlertCircle />
              <AlertTitle>At least one filter is required</AlertTitle>
              <AlertDescription>
                Add a label, store id, device name, or a start and end time range to load coverage.
              </AlertDescription>
            </Alert>
          )}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="space-y-2 md:col-span-6">
              <Label htmlFor="label">Labels</Label>
              <TokenInput
                value={filters.label || []}
                onChange={(value) => handleArrayFilterChange('label', value)}
                options={availableLabels}
                placeholder="Select or type labels"
                disabled={loadingOptions}
                restrictToOptions={true}
              />
            </div>
            <div className="space-y-2 md:col-span-3">
              <Label htmlFor="store_id">Store IDs</Label>
              <TokenInput
                value={filters.store_id || []}
                onChange={(value) => handleArrayFilterChange('store_id', value)}
                options={availableStoreIds}
                placeholder="Select or type store IDs"
                disabled={loadingOptions}
                restrictToOptions={true}
              />
            </div>
            <div className="space-y-2 md:col-span-3">
              <Label htmlFor="device_name">Device Names</Label>
              <TokenInput
                value={filters.device_name || []}
                onChange={(value) => handleArrayFilterChange('device_name', value)}
                options={availableDeviceNames}
                placeholder="Select or type device names"
                disabled={loadingOptions}
                restrictToOptions={true}
              />
            </div>
            <div className="space-y-2 md:col-span-4">
              <Label htmlFor="start">Start</Label>
              <DateTimeFilterInput
                id="start"
                value={filters.start}
                onValueChange={(next) => handleFilterChange('start', next)}
                placeholder="e.g. yesterday 5pm, 2026-02-01 13:00"
              />
            </div>
            <div className="space-y-2 md:col-span-4">
              <Label htmlFor="end">End</Label>
              <DateTimeFilterInput
                id="end"
                value={filters.end}
                onValueChange={(next) => handleFilterChange('end', next)}
                placeholder="e.g. now, 2 hours ago, 2026-02-01 18:30"
              />
            </div>
            <div className="space-y-2 md:col-span-4">
              <Label htmlFor="interval">Interval</Label>
              <Input
                id="interval"
                value={filters.interval || '15 minutes'}
                onChange={(e) => handleFilterChange('interval', e.target.value)}
                placeholder="30 minutes"
              />
            </div>

            <div className="md:col-span-12">
              <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-slate-600">Advanced</div>
                  <CollapsibleTrigger asChild>
                    <Button type="button" variant="outline" size="sm" className="gap-2">
                      {advancedOpen ? 'Hide advanced' : 'Show advanced'}
                      <ChevronDown
                        className={cn(
                          "size-4 transition-transform",
                          advancedOpen ? "rotate-180" : undefined,
                        )}
                      />
                    </Button>
                  </CollapsibleTrigger>
                </div>

                <CollapsibleContent className="pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="space-y-2 md:col-span-3">
                      <Label htmlFor="min_confidence">Min Confidence</Label>
                      <Input
                        id="min_confidence"
                        type="number"
                        step="0.01"
                        min="0"
                        max="1"
                        value={filters.min_confidence || 0.7}
                        onChange={(e) => handleFilterChange('min_confidence', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-3">
                      <Label htmlFor="max_deviation">Max Deviation</Label>
                      <Input
                        id="max_deviation"
                        type="number"
                        step="0.01"
                        min="0"
                        max="1"
                        value={filters.max_deviation || 0.2}
                        onChange={(e) => handleFilterChange('max_deviation', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Coverage Over Time</CardTitle>
              <CardDescription>
                Average coverage percentage by store_id/stream_id and label. Gaps in timeline break the line.
              </CardDescription>
            </div>
            {loading && data.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Refreshing...</span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!hasRequiredFilter ? (
            <div className="flex flex-col items-center justify-center h-96 gap-2 text-center">
              <AlertCircle className="w-8 h-8 text-slate-300" />
              <p className="text-sm text-slate-600">
                Apply at least one filter to load coverage.
              </p>
              <p className="text-xs text-slate-500">
                Labels, Store IDs, Device Names, and Start or End are all valid.
              </p>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
                  {error}
                </div>
              )}
              {(loading || loadingOptions) && data.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-96 gap-2">
                  <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                  <p className="text-sm text-slate-500">
                    {loadingOptions ? 'Loading available options...' : 'Loading coverage data...'}
                  </p>
                </div>
              ) : chartData.length === 0 ? (
                <div className="flex items-center justify-center h-96 text-slate-500">
                  No data available. Adjust filters and click "Refresh Data".
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={500}>
                  <LineChart
                    data={chartData}
                    onMouseMove={(e: any) => {
                      if (frameModalOpen) return;
                      const item: any = e?.activePayload?.[0];
                      const nextTimeKey: string | undefined = item?.payload?.time;
                      const nextSeriesKey: string | undefined = item?.dataKey || item?.name;

                      if (!nextTimeKey || !nextSeriesKey) {
                        if (hoveredPointRef.current !== null) {
                          hoveredPointRef.current = null;
                          setHoveredPoint(null);
                        }
                        return;
                      }

                      const next: _HoveredPoint = { timeKey: nextTimeKey, seriesKey: nextSeriesKey };
                      const prev = hoveredPointRef.current;
                      if (prev?.timeKey === next.timeKey && prev?.seriesKey === next.seriesKey) return;

                      hoveredPointRef.current = next;
                      setHoveredPoint(next);
                    }}
                    onMouseLeave={() => {
                      if (frameModalOpen) return;
                      hoveredPointRef.current = null;
                      setHoveredPoint(null);
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="time"
                      stroke="#64748b"
                      tick={{ fill: '#64748b', fontSize: 12 }}
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                      }}
                    />
                    <YAxis
                      stroke="#64748b"
                      tick={{ fill: '#64748b', fontSize: 12 }}
                      domain={yDomain}
                      label={{ value: 'Coverage %', angle: -90, position: 'insideLeft', fill: '#64748b' }}
                    />
                    {!frameModalOpen && (
                      <Tooltip
                        shared={false}
                        wrapperStyle={{ zIndex: 70 }}
                        content={({ active, payload }) => {
                          if (!active || !payload || payload.length === 0) return null;

                          // With shared={false}, this is the hovered series at a single time.
                          const item: any = payload[0];
                          const timeKey: string | undefined = item?.payload?.time;
                          const seriesKey: string | undefined = item?.dataKey || item?.name;

                          if (!timeKey || !seriesKey) return null;

                          const bucket = _findBucketForPoint(data, seriesKey, timeKey);
                          const valueRaw = item?.value;
                          const valueNum =
                            valueRaw === null || valueRaw === undefined
                              ? undefined
                              : typeof valueRaw === 'number'
                                ? valueRaw
                                : Number.parseFloat(String(valueRaw));

                          const { identifier, label } = _parseSeriesKey(seriesKey);
                          const formattedLabel = label ? label.charAt(0).toUpperCase() + label.slice(1) : 'Unknown';

                          return (
                            <_FramePreviewTooltip
                              identifier={identifier}
                              formattedLabel={formattedLabel}
                              bucket={bucket}
                              valueNum={valueNum}
                        minConfidence={filters.min_confidence}
                            />
                          );
                        }}
                      />
                    )}
                    <Legend
                      formatter={(value) => {
                        const parts = value.split('_');
                        const label = parts[parts.length - 1];
                        const identifier = parts.slice(0, -1).join('_') || 'unknown';
                        return `${identifier} ${label.charAt(0).toUpperCase() + label.slice(1)}`;
                      }}
                    />
                    {seriesKeys.map((key, index) => (
                      <Line
                        key={key}
                        type="monotone"
                        dataKey={key}
                        stroke={colors[index % colors.length]}
                        strokeWidth={2}
                        dot={false}
                        activeDot={
                          frameModalOpen
                            ? false
                            : (props: any) => (
                                <_ClickableActiveDot
                                  {...props}
                                  seriesKey={key}
                                  onOpen={openFramesModalForPoint}
                                />
                              )
                        }
                        connectNulls={false} // This breaks the line at null values
                        name={key}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
