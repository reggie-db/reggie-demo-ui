// Trends Component
// Displays frame coverage trends over time with filtering

import { Loader2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  FrameCoverageBucket,
  FrameCoverageParams,
  getAvailableDeviceNames,
  getAvailableLabels,
  getAvailableStoreIds,
  getFrameCoverage,
} from '../services/frameCoverageService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { TokenInput } from './ui/token-input';

interface ChartDataPoint {
  time: string;
  [key: string]: string | number | null; // Dynamic keys for stream_id/label combinations (null for gaps)
}

export function Trends() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<FrameCoverageBucket[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const isInitialMount = useRef(true);

  // Available options from /values endpoints
  const [availableLabels, setAvailableLabels] = useState<string[]>([]);
  const [availableStoreIds, setAvailableStoreIds] = useState<string[]>([]);
  const [availableDeviceNames, setAvailableDeviceNames] = useState<string[]>([]);

  // Filter state with defaults matching the API
  const [filters, setFilters] = useState<FrameCoverageParams>({
    label: ['truck'],
    min_confidence: 0.50,
    interval: '15 minutes',
    max_deviation: 0.20,
  });

  // Fetch data
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getFrameCoverage(filters);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch coverage data');
      console.error('Error fetching frame coverage:', err);
    } finally {
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
        console.log('Options loaded:', { 
          labels: { count: labels.length, sample: labels.slice(0, 5) }, 
          storeIds: { count: storeIds.length, sample: storeIds.slice(0, 5) }, 
          deviceNames: { count: deviceNames.length, sample: deviceNames.slice(0, 5) },
        });
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

    if (isInitialMount.current) {
      // First load - fetch immediately
      isInitialMount.current = false;
      fetchData();
    } else {
      // Subsequent changes - debounce
      timeoutId = setTimeout(() => {
        fetchData();
      }, 1000); // 1 second debounce
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Frame Coverage Trends</h2>
          <p className="text-sm text-slate-600 mt-1">Analyze detection coverage over time by stream and label</p>
        </div>
        {loading && (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Loading...</span>
          </div>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Configure coverage analysis parameters</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
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
            <div className="space-y-2">
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
            <div className="space-y-2">
              <Label htmlFor="interval">Interval</Label>
              <Input
                id="interval"
                value={filters.interval || '15 minutes'}
                onChange={(e) => handleFilterChange('interval', e.target.value)}
                placeholder="15 minutes"
              />
            </div>
            <div className="space-y-2">
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
            <div className="space-y-2">
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
            <div className="space-y-2">
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
            <div className="space-y-2">
              <Label htmlFor="start">Start Time (ISO)</Label>
              <Input
                id="start"
                type="datetime-local"
                value={filters.start ? new Date(filters.start).toISOString().slice(0, 16) : ''}
                onChange={(e) => handleFilterChange('start', e.target.value ? new Date(e.target.value).toISOString() : undefined)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end">End Time (ISO)</Label>
              <Input
                id="end"
                type="datetime-local"
                value={filters.end ? new Date(filters.end).toISOString().slice(0, 16) : ''}
                onChange={(e) => handleFilterChange('end', e.target.value ? new Date(e.target.value).toISOString() : undefined)}
              />
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
              <LineChart data={chartData}>
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
                  domain={[0, 100]}
                  label={{ value: 'Coverage %', angle: -90, position: 'insideLeft', fill: '#64748b' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                  }}
                  labelFormatter={(value) => {
                    const date = new Date(value);
                    return date.toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    });
                  }}
                  formatter={(value: any, name: string, props: any) => {
                    if (value === null || value === undefined) return ['-', name];
                    const numValue = typeof value === 'number' ? value : parseFloat(value);
                    if (isNaN(numValue)) return ['-', name];
                    // Find the corresponding bucket for this data point
                    const timeKey = props.payload.time;
                    const parts = name.split('_');
                    // The last part is always the label, everything before is the identifier
                    const label = parts[parts.length - 1];
                    const identifier = parts.slice(0, -1).join('_') || 'unknown';
                    
                    const bucket = data.find(
                      (b) => {
                        const bucketId = String(b.store_id || b.stream_id || 'unknown');
                        return (
                          bucketId === identifier &&
                          b.label === label &&
                          new Date(b.interval_start).toISOString() === timeKey
                        );
                      }
                    );
                    // Format label with capital first letter
                    const formattedLabel = label.charAt(0).toUpperCase() + label.slice(1);
                    if (bucket) {
                      return [
                        `${numValue.toFixed(2)}% (Conf: ${(bucket.avg_confidence * 100).toFixed(1)}%, Frames: ${bucket.total_frames})`,
                        `${identifier} ${formattedLabel}`,
                      ];
                    }
                    return [`${numValue.toFixed(2)}%`, `${identifier} ${formattedLabel}`];
                  }}
                />
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
                    connectNulls={false} // This breaks the line at null values
                    name={key}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
