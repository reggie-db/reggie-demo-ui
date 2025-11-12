import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Thermometer, MapPin, Clock } from 'lucide-react';
import { Device } from '../services/deviceService';

interface DeviceGridProps {
  devices: Device[];
}

export function DeviceGrid({ devices }: DeviceGridProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'bg-red-50 border-red-200';
      case 'warning': return 'bg-amber-50 border-amber-200';
      default: return 'bg-green-50 border-green-200';
    }
  };

  const getTempColor = (status: string) => {
    switch (status) {
      case 'critical': return 'text-red-600';
      case 'warning': return 'text-amber-600';
      default: return 'text-green-600';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {devices.map((device) => (
        <Card key={device.id} className={`${getStatusColor(device.status)} transition-all hover:shadow-md`}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <CardTitle className="text-slate-900">{device.name}</CardTitle>
              <Badge variant={
                device.status === 'critical' ? 'destructive' :
                device.status === 'warning' ? 'default' :
                'outline'
              }>
                {device.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Thermometer className={`w-5 h-5 ${getTempColor(device.status)}`} />
              <span className={`text-2xl ${getTempColor(device.status)}`}>
                {device.currentTemp}°F
              </span>
            </div>
            
            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <MapPin className="w-4 h-4" />
                {device.location}
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Clock className="w-4 h-4" />
                Updated {device.lastUpdate}
              </div>
              <div className="text-xs font-mono mt-2 text-slate-500">
                ID: {device.id}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
