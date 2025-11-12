import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Camera } from 'lucide-react';
import { DetectionAlert } from '../hooks/useDetectionAlerts';
import { formatTimestamp } from '../utils/dateUtils';

interface NotificationsPanelProps {
  notifications: DetectionAlert[];
}

export function NotificationsPanel({ notifications }: NotificationsPanelProps) {
  const [sortedNotifications, setSortedNotifications] = useState<DetectionAlert[]>([]);

  useEffect(() => {
    // Sort notifications by timestamp (newest first)
    const sorted = [...notifications].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    setSortedNotifications(sorted);
  }, [notifications]);

  if (notifications.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Detection Notifications</CardTitle>
          <CardDescription>No notifications yet</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Camera className="w-12 h-12 text-slate-300 mb-4" />
            <p className="text-slate-600">No detection notifications have been received yet.</p>
            <p className="text-sm text-slate-500 mt-2">Enable detection alerts in the sidebar to start receiving notifications.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Detection Notifications</CardTitle>
              <CardDescription>
                {notifications.length} {notifications.length === 1 ? 'notification' : 'notifications'}
              </CardDescription>
            </div>
            <Badge variant="outline">{notifications.length}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sortedNotifications.map((notification, index) => (
              <div
                key={`${notification.storeId}-${notification.timestamp.getTime()}-${index}`}
                className="flex items-start gap-3 p-3 border rounded-lg hover:bg-slate-50 transition-colors"
              >
                <div className="flex-shrink-0 mt-0.5">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Camera className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-900">New Detection</p>
                      <p className="text-sm text-slate-600 mt-1">
                        <span className="font-medium">{notification.detectionLabel}</span> detected at{' '}
                        <span className="font-medium">{notification.storeId}</span>
                      </p>
                      <p className="text-xs text-slate-500 mt-2">
                        {formatTimestamp(notification.timestamp)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

