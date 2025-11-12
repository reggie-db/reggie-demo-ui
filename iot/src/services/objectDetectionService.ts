// Object Detection Service
// API Endpoints defined in /openapi.yaml:
// - GET /object-detection/summary - Get summary data
// - GET /object-detection/hourly - Get hourly detection activity
// - GET /object-detection/recent - Get recent detections

import { USE_MOCK_DATA, apiCall, logger } from './config';

export interface ObjectDetection {
  object: string;
  count: number;
  trend: string;
  icon: string;
  color: string;
}

export interface HourlyDetection {
  hour: string;
  count: number;
}

export interface RecentDetection {
  id: number;
  type: string;
  location: string;
  time: string;
  confidence: number;
}

// ============================================================================
// MOCK DATA SECTION
// ============================================================================

const mockObjectDetectionData: ObjectDetection[] = [
  { object: 'Vehicles', count: 1247, trend: '+12%', icon: 'Car', color: '#3b82f6' },
  { object: 'People', count: 892, trend: '+8%', icon: 'Users', color: '#10b981' },
  { object: 'Trucks', count: 234, trend: '+5%', icon: 'Truck', color: '#f59e0b' },
  { object: 'Packages', count: 156, trend: '-3%', icon: 'Package', color: '#8b5cf6' },
];

const mockHourlyDetections: HourlyDetection[] = [
  { hour: '00:00', count: 45 },
  { hour: '02:00', count: 23 },
  { hour: '04:00', count: 18 },
  { hour: '06:00', count: 89 },
  { hour: '08:00', count: 167 },
  { hour: '10:00', count: 145 },
  { hour: '12:00', count: 198 },
  { hour: '14:00', count: 176 },
  { hour: '16:00', count: 203 },
  { hour: '18:00', count: 189 },
  { hour: '20:00', count: 134 },
  { hour: '22:00', count: 78 },
];

const mockRecentDetections: RecentDetection[] = [
  { id: 1, type: 'Vehicle', location: 'Store #1247 - Pump 3', time: '30 sec ago', confidence: 98 },
  { id: 2, type: 'Person', location: 'Store #2145 - Entrance', time: '45 sec ago', confidence: 95 },
  { id: 3, type: 'Truck', location: 'Store #3421 - Fuel Bay', time: '1 min ago', confidence: 97 },
  { id: 4, type: 'Vehicle', location: 'Store #1248 - Pump 1', time: '1 min ago', confidence: 99 },
  { id: 5, type: 'Person', location: 'Store #2389 - Store Front', time: '2 min ago', confidence: 94 },
  { id: 6, type: 'Vehicle', location: 'Store #3422 - Pump 5', time: '2 min ago', confidence: 96 },
];

const getMockObjectDetectionData = (): ObjectDetection[] => {
  return mockObjectDetectionData;
};

const getMockHourlyDetections = (): HourlyDetection[] => {
  return mockHourlyDetections;
};

const getMockRecentDetections = (): RecentDetection[] => {
  return mockRecentDetections;
};

const getMockTotalDetections = (data: ObjectDetection[]): number => {
  return data.reduce((sum, item) => sum + item.count, 0);
};

// ============================================================================
// API CALL SECTION
// ============================================================================

const getObjectDetectionDataFromAPI = async (period: 'today' | 'week' | 'month' = 'today'): Promise<ObjectDetection[]> => {
  return apiCall<ObjectDetection[]>(`/object-detection/summary?period=${period}`);
};

const getHourlyDetectionsFromAPI = async (date?: string): Promise<HourlyDetection[]> => {
  const queryParam = date ? `?date=${date}` : '';
  return apiCall<HourlyDetection[]>(`/object-detection/hourly${queryParam}`);
};

const getRecentDetectionsFromAPI = async (limit: number = 20): Promise<RecentDetection[]> => {
  return apiCall<RecentDetection[]>(`/object-detection/recent?limit=${limit}`);
};

// ============================================================================
// PUBLIC API - Switches between mock and real data
// ============================================================================

/**
 * Get object detection summary data
 * Uses mock data if USE_MOCK_DATA is true, otherwise calls the API
 */
export const getObjectDetectionData = async (period: 'today' | 'week' | 'month' = 'today'): Promise<ObjectDetection[]> => {
  const startTime = performance.now();
  logger.request('ObjectDetectionService', 'getObjectDetectionData', { period });
  
  try {
    let result: ObjectDetection[];
    
    if (USE_MOCK_DATA) {
      result = getMockObjectDetectionData();
    } else {
      result = await getObjectDetectionDataFromAPI(period);
    }
    
    const duration = Math.round(performance.now() - startTime);
    logger.response('ObjectDetectionService', 'getObjectDetectionData', result, duration);
    
    return result;
  } catch (error) {
    const duration = Math.round(performance.now() - startTime);
    logger.error('ObjectDetectionService', 'getObjectDetectionData', error, duration);
    throw error;
  }
};

/**
 * Get hourly detection activity
 * Uses mock data if USE_MOCK_DATA is true, otherwise calls the API
 */
export const getHourlyDetections = async (date?: string): Promise<HourlyDetection[]> => {
  const startTime = performance.now();
  logger.request('ObjectDetectionService', 'getHourlyDetections', { date });
  
  try {
    let result: HourlyDetection[];
    
    if (USE_MOCK_DATA) {
      result = getMockHourlyDetections();
    } else {
      result = await getHourlyDetectionsFromAPI(date);
    }
    
    const duration = Math.round(performance.now() - startTime);
    logger.response('ObjectDetectionService', 'getHourlyDetections', result, duration);
    
    return result;
  } catch (error) {
    const duration = Math.round(performance.now() - startTime);
    logger.error('ObjectDetectionService', 'getHourlyDetections', error, duration);
    throw error;
  }
};

/**
 * Get recent detections
 * Uses mock data if USE_MOCK_DATA is true, otherwise calls the API
 */
export const getRecentDetections = async (limit: number = 20): Promise<RecentDetection[]> => {
  const startTime = performance.now();
  logger.request('ObjectDetectionService', 'getRecentDetections', { limit });
  
  try {
    let result: RecentDetection[];
    
    if (USE_MOCK_DATA) {
      result = getMockRecentDetections();
    } else {
      result = await getRecentDetectionsFromAPI(limit);
    }
    
    const duration = Math.round(performance.now() - startTime);
    logger.response('ObjectDetectionService', 'getRecentDetections', result, duration);
    
    return result;
  } catch (error) {
    const duration = Math.round(performance.now() - startTime);
    logger.error('ObjectDetectionService', 'getRecentDetections', error, duration);
    throw error;
  }
};

/**
 * Calculate total detections
 */
export const getTotalDetections = (data: ObjectDetection[]): number => {
  return data.reduce((sum, item) => sum + item.count, 0);
};
