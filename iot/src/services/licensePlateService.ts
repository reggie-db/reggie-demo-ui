// License Plate Service
// API Endpoints defined in /openapi.yaml:
// - GET /license-plates/distribution - Get state distribution
// - GET /license-plates/recent - Get recent detections
// - GET /license-plates/stats - Get overall statistics

import { USE_MOCK_DATA, apiCall, logger } from './config';

export interface StateDistribution {
  state: string;
  name: string;
  count: number;
  percentage: number;
  color: string;
}

export interface RecentPlate {
  id: number;
  state: string;
  plateNumber: string;
  location: string;
  time: string;
  confidence: number;
}

export interface StateStats {
  totalDetected: number;
  uniqueStates: number;
  averagePerHour: number;
  trend: string;
}

// ============================================================================
// MOCK DATA SECTION
// ============================================================================

const mockStateDistribution: StateDistribution[] = [
  { state: 'GA', name: 'Georgia', count: 342, percentage: 28.5, color: '#dc2626' },
  { state: 'FL', name: 'Florida', count: 289, percentage: 24.1, color: '#ea580c' },
  { state: 'TX', name: 'Texas', count: 198, percentage: 16.5, color: '#d97706' },
  { state: 'AL', name: 'Alabama', count: 134, percentage: 11.2, color: '#ca8a04' },
  { state: 'SC', name: 'South Carolina', count: 98, percentage: 8.2, color: '#65a30d' },
  { state: 'NC', name: 'North Carolina', count: 76, percentage: 6.3, color: '#16a34a' },
  { state: 'Other', name: 'Other States', count: 63, percentage: 5.2, color: '#64748b' },
];

const mockRecentPlates: RecentPlate[] = [
  { id: 1, state: 'GA', plateNumber: 'ABC***', location: 'Store #1247 - Pump 3', time: '15 sec ago', confidence: 99 },
  { id: 2, state: 'FL', plateNumber: 'XYZ***', location: 'Store #3421 - Pump 1', time: '32 sec ago', confidence: 97 },
  { id: 3, state: 'TX', plateNumber: 'DEF***', location: 'Store #2145 - Pump 5', time: '58 sec ago', confidence: 98 },
  { id: 4, state: 'GA', plateNumber: 'GHI***', location: 'Store #1248 - Pump 2', time: '1 min ago', confidence: 96 },
  { id: 5, state: 'AL', plateNumber: 'JKL***', location: 'Store #2389 - Pump 4', time: '1 min ago', confidence: 95 },
  { id: 6, state: 'FL', plateNumber: 'MNO***', location: 'Store #3422 - Pump 6', time: '2 min ago', confidence: 99 },
];

const mockStateStats: StateStats = {
  totalDetected: 1200,
  uniqueStates: 24,
  averagePerHour: 50,
  trend: '+15%',
};

const getMockStateDistribution = (): StateDistribution[] => {
  return mockStateDistribution;
};

const getMockTopStates = (distribution: StateDistribution[]): StateDistribution[] => {
  return distribution.slice(0, 6);
};

const getMockRecentPlates = (): RecentPlate[] => {
  return mockRecentPlates;
};

const getMockStateStats = (): StateStats => {
  return mockStateStats;
};

const getMockTotalPlatesDetected = (distribution: StateDistribution[]): number => {
  return distribution.reduce((sum, state) => sum + state.count, 0);
};

// ============================================================================
// API CALL SECTION
// ============================================================================

const getStateDistributionFromAPI = async (period: 'today' | 'week' | 'month' = 'today'): Promise<StateDistribution[]> => {
  return apiCall<StateDistribution[]>(`/license-plates/distribution?period=${period}`);
};

const getRecentPlatesFromAPI = async (limit: number = 20): Promise<RecentPlate[]> => {
  return apiCall<RecentPlate[]>(`/license-plates/recent?limit=${limit}`);
};

const getStateStatsFromAPI = async (): Promise<StateStats> => {
  return apiCall<StateStats>('/license-plates/stats');
};

// ============================================================================
// PUBLIC API - Switches between mock and real data
// ============================================================================

/**
 * Get license plate state distribution
 * Uses mock data if USE_MOCK_DATA is true, otherwise calls the API
 */
export const getStateDistribution = async (period: 'today' | 'week' | 'month' = 'today'): Promise<StateDistribution[]> => {
  const startTime = performance.now();
  logger.request('LicensePlateService', 'getStateDistribution', { period });
  
  try {
    let result: StateDistribution[];
    
    if (USE_MOCK_DATA) {
      result = getMockStateDistribution();
    } else {
      result = await getStateDistributionFromAPI(period);
    }
    
    const duration = Math.round(performance.now() - startTime);
    logger.response('LicensePlateService', 'getStateDistribution', result, duration);
    
    return result;
  } catch (error) {
    const duration = Math.round(performance.now() - startTime);
    logger.error('LicensePlateService', 'getStateDistribution', error, duration);
    throw error;
  }
};

/**
 * Get top states (top 6)
 */
export const getTopStates = (distribution: StateDistribution[]): StateDistribution[] => {
  return distribution.slice(0, 6);
};

/**
 * Get recent plate detections
 * Uses mock data if USE_MOCK_DATA is true, otherwise calls the API
 */
export const getRecentPlates = async (limit: number = 20): Promise<RecentPlate[]> => {
  const startTime = performance.now();
  logger.request('LicensePlateService', 'getRecentPlates', { limit });
  
  try {
    let result: RecentPlate[];
    
    if (USE_MOCK_DATA) {
      result = getMockRecentPlates();
    } else {
      result = await getRecentPlatesFromAPI(limit);
    }
    
    const duration = Math.round(performance.now() - startTime);
    logger.response('LicensePlateService', 'getRecentPlates', result, duration);
    
    return result;
  } catch (error) {
    const duration = Math.round(performance.now() - startTime);
    logger.error('LicensePlateService', 'getRecentPlates', error, duration);
    throw error;
  }
};

/**
 * Get license plate statistics
 * Uses mock data if USE_MOCK_DATA is true, otherwise calls the API
 */
export const getStateStats = async (): Promise<StateStats> => {
  const startTime = performance.now();
  logger.request('LicensePlateService', 'getStateStats');
  
  try {
    let result: StateStats;
    
    if (USE_MOCK_DATA) {
      result = getMockStateStats();
    } else {
      result = await getStateStatsFromAPI();
    }
    
    const duration = Math.round(performance.now() - startTime);
    logger.response('LicensePlateService', 'getStateStats', result, duration);
    
    return result;
  } catch (error) {
    const duration = Math.round(performance.now() - startTime);
    logger.error('LicensePlateService', 'getStateStats', error, duration);
    throw error;
  }
};

/**
 * Calculate total plates detected
 */
export const getTotalPlatesDetected = (distribution: StateDistribution[]): number => {
  return distribution.reduce((sum, state) => sum + state.count, 0);
};
