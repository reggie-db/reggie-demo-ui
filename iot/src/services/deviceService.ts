// Device Service
// API Endpoints defined in /openapi.yaml:
// - GET /devices - Retrieve all devices
// - GET /devices/{deviceId} - Get specific device
// - GET /devices/{deviceId}/history - Get historical data
// - GET /devices/stats - Get device statistics

import { USE_MOCK_DATA, apiCall, logger } from './config';

// Device types
export interface Device {
  id: string;
  name: string;
  location: string;
  currentTemp: number;
  status: 'normal' | 'warning' | 'critical';
  lastUpdate: string;
}

export interface TemperatureDataPoint {
  time: string;
  temperature: number;
  humidity: number;
}

export interface DeviceStats {
  normalCount: number;
  warningCount: number;
  criticalCount: number;
  avgTemp: string;
  totalDevices: number;
}

// ============================================================================
// MOCK DATA SECTION
// ============================================================================

const mockDevices: Device[] = [
  {
    id: 'RT-ATL-001',
    name: 'Store #1247 - Atlanta',
    location: 'Atlanta, GA',
    currentTemp: 72.4,
    status: 'normal',
    lastUpdate: '2 min ago',
  },
  {
    id: 'RT-ATL-002',
    name: 'Store #1248 - Atlanta North',
    location: 'Atlanta, GA',
    currentTemp: 85.2,
    status: 'warning',
    lastUpdate: '1 min ago',
  },
  {
    id: 'RT-DAL-001',
    name: 'Store #2145 - Dallas',
    location: 'Dallas, TX',
    currentTemp: 71.8,
    status: 'normal',
    lastUpdate: '3 min ago',
  },
  {
    id: 'RT-HOU-001',
    name: 'Store #2389 - Houston',
    location: 'Houston, TX',
    currentTemp: 73.1,
    status: 'normal',
    lastUpdate: '1 min ago',
  },
  {
    id: 'RT-TAM-001',
    name: 'Store #3421 - Tampa',
    location: 'Tampa, FL',
    currentTemp: 91.5,
    status: 'critical',
    lastUpdate: '30 sec ago',
  },
  {
    id: 'RT-TAM-002',
    name: 'Store #3422 - Tampa Bay',
    location: 'Tampa, FL',
    currentTemp: 74.2,
    status: 'normal',
    lastUpdate: '2 min ago',
  },
];

const getMockDevices = (): Device[] => {
  return mockDevices;
};

const getMockDeviceById = (deviceId: string): Device | undefined => {
  return mockDevices.find(d => d.id === deviceId);
};

const generateMockHistoricalData = (deviceId: string): TemperatureDataPoint[] => {
  const data: TemperatureDataPoint[] = [];
  const baseTemp = 72;
  const hours = 24;

  for (let i = 0; i < hours; i++) {
    const hour = i;
    const variance = Math.sin(i / 4) * 10 + Math.random() * 5;
    const temp = baseTemp + variance;
    
    data.push({
      time: `${hour}:00`,
      temperature: parseFloat(temp.toFixed(1)),
      humidity: parseFloat((50 + Math.random() * 20).toFixed(1)),
    });
  }

  return data;
};

const calculateMockDeviceStats = (devices: Device[]): DeviceStats => {
  const normalCount = devices.filter(d => d.status === 'normal').length;
  const warningCount = devices.filter(d => d.status === 'warning').length;
  const criticalCount = devices.filter(d => d.status === 'critical').length;
  const avgTemp = (devices.reduce((sum, d) => sum + d.currentTemp, 0) / devices.length).toFixed(1);

  return {
    normalCount,
    warningCount,
    criticalCount,
    avgTemp,
    totalDevices: devices.length,
  };
};

// ============================================================================
// API CALL SECTION
// ============================================================================

const getDevicesFromAPI = async (): Promise<Device[]> => {
  return apiCall<Device[]>('/devices');
};

const getDeviceByIdFromAPI = async (deviceId: string): Promise<Device | undefined> => {
  try {
    return await apiCall<Device>(`/devices/${deviceId}`);
  } catch (error) {
    // Return undefined if device not found
    console.error(`Device ${deviceId} not found:`, error);
    return undefined;
  }
};

const getDeviceHistoryFromAPI = async (
  deviceId: string,
  hours: number = 24
): Promise<TemperatureDataPoint[]> => {
  return apiCall<TemperatureDataPoint[]>(`/devices/${deviceId}/history?hours=${hours}`);
};

const getDeviceStatsFromAPI = async (): Promise<DeviceStats> => {
  return apiCall<DeviceStats>('/devices/stats');
};

// ============================================================================
// PUBLIC API - Switches between mock and real data
// ============================================================================

/**
 * Get all devices
 * Uses mock data if USE_MOCK_DATA is true, otherwise calls the API
 */
export const getDevices = async (): Promise<Device[]> => {
  const startTime = performance.now();
  logger.request('DeviceService', 'getDevices');
  
  try {
    let result: Device[];
    
    if (USE_MOCK_DATA) {
      result = getMockDevices();
    } else {
      result = await getDevicesFromAPI();
    }
    
    const duration = Math.round(performance.now() - startTime);
    logger.response('DeviceService', 'getDevices', result, duration);
    
    return result;
  } catch (error) {
    const duration = Math.round(performance.now() - startTime);
    logger.error('DeviceService', 'getDevices', error, duration);
    throw error;
  }
};

/**
 * Get device by ID
 * Uses mock data if USE_MOCK_DATA is true, otherwise calls the API
 */
export const getDeviceById = async (deviceId: string): Promise<Device | undefined> => {
  const startTime = performance.now();
  logger.request('DeviceService', 'getDeviceById', { deviceId });
  
  try {
    let result: Device | undefined;
    
    if (USE_MOCK_DATA) {
      result = getMockDeviceById(deviceId);
    } else {
      result = await getDeviceByIdFromAPI(deviceId);
    }
    
    const duration = Math.round(performance.now() - startTime);
    logger.response('DeviceService', 'getDeviceById', result, duration);
    
    return result;
  } catch (error) {
    const duration = Math.round(performance.now() - startTime);
    logger.error('DeviceService', 'getDeviceById', error, duration);
    throw error;
  }
};

/**
 * Get historical temperature data for a device
 * Uses mock data if USE_MOCK_DATA is true, otherwise calls the API
 */
export const generateHistoricalData = async (
  deviceId: string,
  hours: number = 24
): Promise<TemperatureDataPoint[]> => {
  const startTime = performance.now();
  logger.request('DeviceService', 'generateHistoricalData', { deviceId, hours });
  
  try {
    let result: TemperatureDataPoint[];
    
    if (USE_MOCK_DATA) {
      result = generateMockHistoricalData(deviceId);
    } else {
      result = await getDeviceHistoryFromAPI(deviceId, hours);
    }
    
    const duration = Math.round(performance.now() - startTime);
    logger.response('DeviceService', 'generateHistoricalData', result, duration);
    
    return result;
  } catch (error) {
    const duration = Math.round(performance.now() - startTime);
    logger.error('DeviceService', 'generateHistoricalData', error, duration);
    throw error;
  }
};

/**
 * Calculate device statistics
 * Uses mock data if USE_MOCK_DATA is true, otherwise calls the API
 */
export const calculateDeviceStats = async (devices?: Device[]): Promise<DeviceStats> => {
  const startTime = performance.now();
  logger.request('DeviceService', 'calculateDeviceStats', { devicesProvided: !!devices });
  
  try {
    let result: DeviceStats;
    
    if (USE_MOCK_DATA) {
      // If devices are provided, calculate from them, otherwise get all devices first
      const devicesToUse = devices || getMockDevices();
      result = calculateMockDeviceStats(devicesToUse);
    } else {
      result = await getDeviceStatsFromAPI();
    }
    
    const duration = Math.round(performance.now() - startTime);
    logger.response('DeviceService', 'calculateDeviceStats', result, duration);
    
    return result;
  } catch (error) {
    const duration = Math.round(performance.now() - startTime);
    logger.error('DeviceService', 'calculateDeviceStats', error, duration);
    throw error;
  }
};

/**
 * Get device statistics directly (for API mode)
 * In mock mode, this will get all devices and calculate stats
 */
export const getDeviceStats = async (): Promise<DeviceStats> => {
  const startTime = performance.now();
  logger.request('DeviceService', 'getDeviceStats');
  
  try {
    let result: DeviceStats;
    
    if (USE_MOCK_DATA) {
      const devices = getMockDevices();
      result = calculateMockDeviceStats(devices);
    } else {
      result = await getDeviceStatsFromAPI();
    }
    
    const duration = Math.round(performance.now() - startTime);
    logger.response('DeviceService', 'getDeviceStats', result, duration);
    
    return result;
  } catch (error) {
    const duration = Math.round(performance.now() - startTime);
    logger.error('DeviceService', 'getDeviceStats', error, duration);
    throw error;
  }
};
