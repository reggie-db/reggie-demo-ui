import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { AlertTriangle, AlertCircle, Info, Loader2 } from 'lucide-react';
import { Device } from '../services/deviceService';
import { generateAlerts, Alert } from '../services/alertService';

interface AlertsPanelProps {
  devices: Device[];
}

export function AlertsPanel({ devices }: AlertsPanelProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        setLoading(true);
        const alertsData = await generateAlerts(devices);
        setAlerts(alertsData);
      } catch (error) {
        console.error('Failed to fetch alerts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
  }, [devices]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Active Alerts</CardTitle>
          <CardDescription>
            Showing {alerts.length} alert{alerts.length !== 1 ? 's' : ''} across all devices
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-8 text-slate-500">
                <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin text-slate-400" />
                <p>Loading alerts...</p>
              </div>
            ) : alerts.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Info className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                <p>No active alerts</p>
              </div>
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 rounded-lg border ${
                    alert.type === 'critical' ? 'bg-red-50 border-red-200' :
                    alert.type === 'warning' ? 'bg-amber-50 border-amber-200' :
                    'bg-blue-50 border-blue-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {alert.type === 'critical' ? (
                        <AlertCircle className="w-5 h-5 text-red-600" />
                      ) : alert.type === 'warning' ? (
                        <AlertTriangle className="w-5 h-5 text-amber-600" />
                      ) : (
                        <Info className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-1">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-900">{alert.device}</span>
                            <Badge variant={
                              alert.type === 'critical' ? 'destructive' :
                              alert.type === 'warning' ? 'default' :
                              'outline'
                            } className="text-xs">
                              {alert.type}
                            </Badge>
                          </div>
                          <p className="text-sm mt-0.5 text-slate-600">{alert.location}</p>
                        </div>
                        <span className="text-xs text-slate-500">{alert.time}</span>
                      </div>
                      <p className="text-sm mt-2 text-slate-700">{alert.message}</p>
                      <p className="text-sm mt-1 text-slate-600">
                        <span className="text-xs uppercase tracking-wide">Recommended action:</span> {alert.action}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
