import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { Camera } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface DetectionAlert {
  storeId: string;
  detectionLabel: string;
  timestamp: Date;
}

// Mock store IDs
const STORE_IDS = [
  'Store #1247',
  'Store #1248',
  'Store #2145',
  'Store #2389',
  'Store #3421',
  'Store #3422',
];

// Mock detection labels
const DETECTION_LABELS = [
  'Vehicle',
  'Person',
  'Truck',
  'Package',
  'Bicycle',
  'Motorcycle',
];

interface UseDetectionAlertsOptions {
  enabled: boolean;
  onNewAlert: (alert: DetectionAlert) => void;
}

/**
 * Hook that simulates detection alerts every 5-10 seconds
 */
export function useDetectionAlerts({ enabled, onNewAlert }: UseDetectionAlertsOptions) {
  const navigate = useNavigate();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled) {
      // Clear any pending timeouts if disabled
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    const generateRandomDelay = () => {
      // Random delay between 5-10 seconds (5000-10000ms)
      return Math.floor(Math.random() * 5000) + 5000;
    };

    const showDetectionAlert = () => {
      const storeId = STORE_IDS[Math.floor(Math.random() * STORE_IDS.length)];
      const detectionLabel = DETECTION_LABELS[Math.floor(Math.random() * DETECTION_LABELS.length)];

      const alert: DetectionAlert = {
        storeId,
        detectionLabel,
        timestamp: new Date(),
      };

      // Notify parent component
      onNewAlert(alert);

      // Show toast notification
      toast(
        (t) => (
          <div 
            className="flex items-start gap-3 cursor-pointer"
            onClick={() => {
              toast.dismiss(t.id);
              navigate('/notifications');
            }}
          >
            <div className="flex-shrink-0 mt-0.5">
              <Camera className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900">New Detection</p>
              <p className="text-sm text-slate-600 mt-1">
                <span className="font-medium">{detectionLabel}</span> detected at{' '}
                <span className="font-medium">{storeId}</span>
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                toast.dismiss(t.id);
              }}
              className="flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <span className="sr-only">Close</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ),
        {
          duration: 5000,
          position: 'top-right',
          icon: null,
          style: {
            background: '#fff',
            color: '#1e293b',
            border: '1px solid #e2e8f0',
            borderRadius: '0.5rem',
            padding: '0.75rem',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          },
        }
      );
    };

    // Schedule first alert after initial delay
    const scheduleNext = () => {
      timeoutRef.current = setTimeout(() => {
        showDetectionAlert();
        scheduleNext(); // Schedule next alert
      }, generateRandomDelay());
    };

    scheduleNext();

    // Cleanup on unmount or when disabled
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [enabled, onNewAlert, navigate]);
}

