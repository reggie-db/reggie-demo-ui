// Alert Service
// API Endpoints defined in /openapi.yaml:
// - GET /alerts - Get all alerts
// - GET /alerts/stats - Get alert statistics

import { USE_MOCK_DATA, apiCall, logger } from './config';
import { Device } from './deviceService';

export interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  device: string;
  location: string;
  message: string;
  time: string;
  action: string;
}

export interface AlertStats {
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  totalCount: number;
}

// ============================================================================
// MOCK DATA SECTION
// ============================================================================

const generateMockAlerts = (devices: Device[]): Alert[] => {
  const alerts: Alert[] = [];
  
  devices.forEach(device => {
    if (device.status === 'critical') {
      alerts.push({
        id: `${device.id}-critical`,
        type: 'critical',
        device: device.name,
        location: device.location,
        message: `Temperature critically high at ${device.currentTemp}°F`,
        time: device.lastUpdate,
        action: 'Check HVAC system immediately',
      });
    } else if (device.status === 'warning') {
      alerts.push({
        id: `${device.id}-warning`,
        type: 'warning',
        device: device.name,
        location: device.location,
        message: `Temperature elevated at ${device.currentTemp}°F`,
        time: device.lastUpdate,
        action: 'Monitor temperature trends',
      });
    }
  });

  // Add system alerts
  alerts.push({
    id: 'sys-1',
    type: 'info',
    device: 'System',
    location: 'Network',
    message: 'All devices connected and reporting',
    time: '5 min ago',
    action: 'No action required',
  });

  return alerts;
};

const getMockAlertStats = (alerts: Alert[]): AlertStats => {
  return {
    criticalCount: alerts.filter(a => a.type === 'critical').length,
    warningCount: alerts.filter(a => a.type === 'warning').length,
    infoCount: alerts.filter(a => a.type === 'info').length,
    totalCount: alerts.length,
  };
};

// ============================================================================
// API CALL SECTION
// ============================================================================

const getAlertsFromAPI = async (type?: 'critical' | 'warning' | 'info'): Promise<Alert[]> => {
  const queryParam = type ? `?type=${type}` : '';
  return apiCall<Alert[]>(`/alerts${queryParam}`);
};

const getAlertStatsFromAPI = async (): Promise<AlertStats> => {
  return apiCall<AlertStats>('/alerts/stats');
};

// ============================================================================
// PUBLIC API - Switches between mock and real data
// ============================================================================

/**
 * Generate/fetch alerts based on device data
 * Uses mock data if USE_MOCK_DATA is true, otherwise calls the API
 */
export const generateAlerts = async (devices: Device[]): Promise<Alert[]> => {
  const startTime = performance.now();
  logger.request('AlertService', 'generateAlerts', { deviceCount: devices.length });
  
  try {
    let result: Alert[];
    
    if (USE_MOCK_DATA) {
      result = generateMockAlerts(devices);
    } else {
      // In API mode, ignore the devices parameter and fetch from server
      result = await getAlertsFromAPI();
    }
    
    const duration = Math.round(performance.now() - startTime);
    logger.response('AlertService', 'generateAlerts', result, duration);
    
    return result;
  } catch (error) {
    const duration = Math.round(performance.now() - startTime);
    logger.error('AlertService', 'generateAlerts', error, duration);
    throw error;
  }
};

/**
 * Get all alerts
 * Uses mock data if USE_MOCK_DATA is true, otherwise calls the API
 */
export const getAlerts = async (type?: 'critical' | 'warning' | 'info'): Promise<Alert[]> => {
  const startTime = performance.now();
  logger.request('AlertService', 'getAlerts', { type });
  
  try {
    let result: Alert[];
    
    if (USE_MOCK_DATA) {
      // In mock mode, we need devices to generate alerts
      // This is a simplified version - in real usage, components should pass devices
      result = [];
    } else {
      result = await getAlertsFromAPI(type);
    }
    
    const duration = Math.round(performance.now() - startTime);
    logger.response('AlertService', 'getAlerts', result, duration);
    
    return result;
  } catch (error) {
    const duration = Math.round(performance.now() - startTime);
    logger.error('AlertService', 'getAlerts', error, duration);
    throw error;
  }
};

/**
 * Get alert statistics
 * Uses mock data if USE_MOCK_DATA is true, otherwise calls the API
 */
export const getAlertStats = async (alerts?: Alert[]): Promise<AlertStats> => {
  const startTime = performance.now();
  logger.request('AlertService', 'getAlertStats', { alertsProvided: !!alerts });
  
  try {
    let result: AlertStats;
    
    if (USE_MOCK_DATA) {
      if (alerts) {
        result = getMockAlertStats(alerts);
      } else {
        result = { criticalCount: 0, warningCount: 0, infoCount: 0, totalCount: 0 };
      }
    } else {
      result = await getAlertStatsFromAPI();
    }
    
    const duration = Math.round(performance.now() - startTime);
    logger.response('AlertService', 'getAlertStats', result, duration);
    
    return result;
  } catch (error) {
    const duration = Math.round(performance.now() - startTime);
    logger.error('AlertService', 'getAlertStats', error, duration);
    throw error;
  }
};

/**
 * Get critical alerts count
 */
export const getCriticalAlertsCount = (alerts: Alert[]): number => {
  return alerts.filter(a => a.type === 'critical').length;
};

/**
 * Get warning alerts count
 */
export const getWarningAlertsCount = (alerts: Alert[]): number => {
  return alerts.filter(a => a.type === 'warning').length;
};
