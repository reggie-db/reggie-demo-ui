// AI Chat Service
// API Endpoints defined in /openapi.yaml:
// - POST /ai/chat - Send message and receive AI response

import { USE_MOCK_DATA, apiCall, logger } from './config';

export interface AIChatRequest {
  message: string;
  context?: {
    currentView?: string;
    selectedDevice?: string;
  };
}

export interface AIChatResponse {
  response: string;
  confidence: number;
  timestamp: string;
}

// ============================================================================
// MOCK DATA SECTION
// ============================================================================

const generateMockAIResponse = (userMessage: string): string => {
  const lowerMessage = userMessage.toLowerCase();
  
  if (lowerMessage.includes('temperature') || lowerMessage.includes('temp')) {
    return "The average temperature across all monitored locations is currently 75.4°F. Store #3421 in Tampa has a critical temperature of 91.5°F that requires immediate attention. Would you like me to provide more details about any specific location?";
  }
  
  if (lowerMessage.includes('alert') || lowerMessage.includes('warning')) {
    return "There are currently 2 active alerts: 1 critical alert at Store #3421 (Tampa) with temperature at 91.5°F, and 1 warning at Store #1248 (Atlanta North) at 85.2°F. I recommend checking the HVAC systems at these locations.";
  }
  
  if (lowerMessage.includes('device') || lowerMessage.includes('store')) {
    return "We're monitoring 6 store locations with IoT temperature sensors. 3 devices are operating normally, 2 have warnings, and 1 is in critical status. All devices are connected and reporting data within the last 5 minutes.";
  }
  
  if (lowerMessage.includes('license') || lowerMessage.includes('plate')) {
    return "Our license plate detection system has captured 1,200 plates in the last 24 hours across all locations. Georgia leads with 28.5% (342 plates), followed by Florida at 24.1% (289 plates). Detection confidence averages 97%.";
  }
  
  if (lowerMessage.includes('object') || lowerMessage.includes('detection')) {
    return "Object detection is active across all stores. In the last 24 hours, we've detected 1,247 vehicles, 892 people, 234 trucks, and 156 packages. Peak detection activity occurs between 4-6 PM.";
  }
  
  if (lowerMessage.includes('help') || lowerMessage.includes('what can you')) {
    return "I can help you with:\n• Temperature monitoring and alerts\n• Device status and connectivity\n• License plate detection analytics\n• Object detection insights\n• Historical data analysis\n• Recommendations for system optimization\n\nJust ask me anything about your IoT monitoring system!";
  }
  
  return "I understand you're asking about the monitoring system. Could you please be more specific? I can provide information about temperatures, alerts, device status, license plate detection, or object detection.";
};

const getMockAIResponseDelay = (): number => {
  return 1000 + Math.random() * 1000;
};

// ============================================================================
// API CALL SECTION
// ============================================================================

const sendChatMessageToAPI = async (request: AIChatRequest): Promise<AIChatResponse> => {
  return apiCall<AIChatResponse>('/ai/chat', {
    method: 'POST',
    body: JSON.stringify(request),
  });
};

// ============================================================================
// PUBLIC API - Switches between mock and real data
// ============================================================================

/**
 * Generate AI response for user message
 * Uses mock data if USE_MOCK_DATA is true, otherwise calls the API
 */
export const generateAIResponse = async (
  userMessage: string,
  context?: { currentView?: string; selectedDevice?: string }
): Promise<string> => {
  const startTime = performance.now();
  logger.request('AIService', 'generateAIResponse', { message: userMessage, context });
  
  try {
    let result: string;
    
    if (USE_MOCK_DATA) {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, getMockAIResponseDelay()));
      result = generateMockAIResponse(userMessage);
    } else {
      const request: AIChatRequest = {
        message: userMessage,
        context,
      };
      
      const response = await sendChatMessageToAPI(request);
      result = response.response;
    }
    
    const duration = Math.round(performance.now() - startTime);
    logger.response('AIService', 'generateAIResponse', { response: result }, duration);
    
    return result;
  } catch (error) {
    const duration = Math.round(performance.now() - startTime);
    logger.error('AIService', 'generateAIResponse', error, duration);
    throw error;
  }
};

/**
 * Get AI response with full response object
 * Uses mock data if USE_MOCK_DATA is true, otherwise calls the API
 */
export const getChatResponse = async (
  userMessage: string,
  context?: { currentView?: string; selectedDevice?: string }
): Promise<AIChatResponse> => {
  const startTime = performance.now();
  logger.request('AIService', 'getChatResponse', { message: userMessage, context });
  
  try {
    let result: AIChatResponse;
    
    if (USE_MOCK_DATA) {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, getMockAIResponseDelay()));
      result = {
        response: generateMockAIResponse(userMessage),
        confidence: 0.85 + Math.random() * 0.15, // Random confidence between 0.85 and 1.0
        timestamp: new Date().toISOString(),
      };
    } else {
      const request: AIChatRequest = {
        message: userMessage,
        context,
      };
      
      result = await sendChatMessageToAPI(request);
    }
    
    const duration = Math.round(performance.now() - startTime);
    logger.response('AIService', 'getChatResponse', result, duration);
    
    return result;
  } catch (error) {
    const duration = Math.round(performance.now() - startTime);
    logger.error('AIService', 'getChatResponse', error, duration);
    throw error;
  }
};

/**
 * Get simulated AI thinking delay
 * Returns delay in milliseconds
 */
export const getAIResponseDelay = (): number => {
  return getMockAIResponseDelay();
};
