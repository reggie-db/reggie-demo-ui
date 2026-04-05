// Frame Coverage Service
// Handles API calls for frame coverage analytics

import { API_BASE_URL, getAuthHeaders } from './config';
import { apiCall, buildRequestHeaders } from './serviceUtils';

export interface FrameCoverageBucket {
  store_id: number | string | null;
  device_name: string | null;
  stream_id: string | null;
  label: string;
  interval_start: string; // ISO datetime string
  interval_end: string; // ISO datetime string
  avg_coverage: number;
  avg_confidence: number;
  total_frames: number;
}

export interface FrameCoverageParams {
  endpoint_name?: string[];
  label?: string[];
  min_confidence?: number;
  interval?: string;
  store_id?: string[];
  device_name?: string[];
  start?: string; // ISO datetime string
  end?: string; // ISO datetime string
  max_deviation?: number;
}

type _RequestOptions = {
  /**
   * Optional AbortSignal to cancel an in-flight request.
   * This is critical for keeping filters and results in sync when requests are slow.
   */
  signal?: AbortSignal;
};

const _buildFrameCoverageEndpoint = (params: FrameCoverageParams): string => {
  const queryParams = new URLSearchParams();

  // Add array parameters (repeat parameter for multiple values)
  if (params.endpoint_name) {
    params.endpoint_name.forEach((val) => queryParams.append('endpoint_name', val));
  }
  if (params.label) {
    params.label.forEach((val) => queryParams.append('label', val));
  }
  if (params.store_id) {
    params.store_id.forEach((val) => queryParams.append('store_id', val));
  }
  if (params.device_name) {
    params.device_name.forEach((val) => queryParams.append('device_name', val));
  }

  // Add scalar parameters
  if (params.min_confidence !== undefined) {
    queryParams.append('min_confidence', params.min_confidence.toString());
  }
  if (params.interval) {
    queryParams.append('interval', params.interval);
  }
  if (params.start) {
    queryParams.append('start', params.start);
  }
  if (params.end) {
    queryParams.append('end', params.end);
  }
  if (params.max_deviation !== undefined) {
    queryParams.append('max_deviation', params.max_deviation.toString());
  }

  return `/frames/coverage${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
};

/**
 * Get frame coverage buckets from the API
 */
export async function getFrameCoverage(
  params: FrameCoverageParams = {},
  options: _RequestOptions = {},
): Promise<FrameCoverageBucket[]> {
  const endpoint = _buildFrameCoverageEndpoint(params);

  // If we need cancellation, avoid apiCall's internal controller and use fetch directly.
  if (options.signal) {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: buildRequestHeaders({
        ...getAuthHeaders(),
      }),
      signal: options.signal,
    });

    if (!response.ok) {
      const bodyText = await response.text().catch(() => '');
      throw new Error(bodyText || `Failed to fetch frame coverage (HTTP ${response.status})`);
    }

    const responseData = await response.json();

    // Match apiCall behavior: unwrap { success, data } if present.
    if (
      responseData &&
      typeof responseData === 'object' &&
      'success' in responseData &&
      'data' in responseData
    ) {
      return responseData.data as FrameCoverageBucket[];
    }

    return responseData as FrameCoverageBucket[];
  }

  return await apiCall<FrameCoverageBucket[]>(endpoint);
}

/**
 * Get available store IDs
 * Note: This endpoint does not accept filter parameters - returns all distinct values
 */
export async function getAvailableStoreIds(): Promise<string[]> {
  const endpoint = `/frames/coverage/values/store_id`;
  return await apiCall<string[]>(endpoint);
}

/**
 * Get available stream IDs
 * Note: This endpoint does not accept filter parameters - returns all distinct values
 */
export async function getAvailableStreamIds(): Promise<string[]> {
  const endpoint = `/frames/coverage/values/stream_id`;
  return await apiCall<string[]>(endpoint);
}

/**
 * Get available device names
 * Note: This endpoint does not accept filter parameters - returns all distinct values
 */
export async function getAvailableDeviceNames(): Promise<string[]> {
  const endpoint = `/frames/coverage/values/device_name`;
  return await apiCall<string[]>(endpoint);
}

/**
 * Get available labels
 * Note: This endpoint does not accept filter parameters - returns all distinct values
 */
export async function getAvailableLabels(): Promise<string[]> {
  const endpoint = `/frames/coverage/values/label`;
  return await apiCall<string[]>(endpoint);
}
