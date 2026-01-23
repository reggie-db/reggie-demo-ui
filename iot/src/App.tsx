import { Activity, AlertTriangle, Bell, Camera, Car, CheckCircle, Cpu, Database, LayoutDashboard, Loader2, MapPin, Menu, Package, Thermometer, Upload, Video } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AIChatButton } from './components/AIChatButton';
import { AlertsPanel } from './components/AlertsPanel';
import { DetectionViewer } from './components/DetectionViewer';
import { DeviceGrid } from './components/DeviceGrid';
import { ImageUpload } from './components/ImageUpload';
import { Inventory } from './components/Inventory';
import { LazyDataGrid } from './components/LazyDataGrid';
import { LicensePlateStatesPanel } from './components/LicensePlateStatesPanel';
import { TemperatureChart } from './components/TemperatureChart';
import { WebcamStream } from './components/WebcamStream';
import { Badge } from './components/ui/badge';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from './components/ui/sheet';
import { Switch } from './components/ui/switch';
import { Device, DeviceStats, generateHistoricalData, getDeviceById, getDevices, getDeviceStats, TemperatureDataPoint } from './services/deviceService';
import { closeWebSocket, initializeWebSocket, setToastsEnabled } from './services/websocketService';

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedDevice, setSelectedDevice] = useState('RT-ATL-001');
  const [timeRange, setTimeRange] = useState('24h');
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDeviceData, setSelectedDeviceData] = useState<Device | undefined>();
  const [historicalData, setHistoricalData] = useState<TemperatureDataPoint[]>([]);
  const [stats, setStats] = useState<DeviceStats>({ normalCount: 0, warningCount: 0, criticalCount: 0, avgTemp: '0', totalDevices: 0 });
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [alertsEnabled, setAlertsEnabled] = useState(false);
  const [userRole, setUserRole] = useState<'Admin' | 'Store Manager'>('Admin');

  // Get activeView from URL, default to 'overview'
  const activeView = location.pathname.slice(1) || 'overview';
  
  // Restricted views for Store Managers
  const restrictedViews = ['search', 'live', 'plates', 'detections'];
  const isRestrictedView = restrictedViews.includes(activeView);
  
  // Redirect Store Managers away from restricted views
  useEffect(() => {
    if (userRole === 'Store Manager' && isRestrictedView) {
      navigate('/overview', { replace: true });
    }
  }, [userRole, activeView, isRestrictedView, navigate]);

  // Initialize WebSocket connection (replaces mock detection alerts)
  useEffect(() => {
    let cleanup: (() => void) | undefined;

    if (alertsEnabled) {
      // Enable toasts and initialize WebSocket
      setToastsEnabled(true);
      const result = initializeWebSocket(undefined, true);
      cleanup = result.cleanup;
    } else {
      // Disable toasts and close WebSocket when alerts are turned off
      setToastsEnabled(false);
      closeWebSocket();
    }

    return () => {
      if (cleanup) {
        cleanup();
      }
      if (!alertsEnabled) {
        closeWebSocket();
      }
    };
  }, [alertsEnabled]);

  // Initialize URL if on root path
  useEffect(() => {
    if (location.pathname === '/') {
      navigate('/overview', { replace: true });
    }
  }, [location.pathname, navigate]);

  // Fetch devices on mount
  useEffect(() => {
    const fetchDevices = async () => {
      try {
        setLoading(true);
        const devicesData = await getDevices();
        setDevices(devicesData);
      } catch (error) {
        console.error('Failed to fetch devices:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDevices();
  }, []);

  // Fetch device stats when devices change
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const statsData = await getDeviceStats();
        setStats(statsData);
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      }
    };

    if (devices.length > 0) {
      fetchStats();
    }
  }, [devices]);

  // Fetch selected device data when selection changes
  useEffect(() => {
    const fetchDeviceData = async () => {
      try {
        const device = await getDeviceById(selectedDevice);
        setSelectedDeviceData(device);
      } catch (error) {
        console.error('Failed to fetch device:', error);
      }
    };

    if (selectedDevice) {
      fetchDeviceData();
    }
  }, [selectedDevice]);

  // Fetch historical data when device or time range changes
  useEffect(() => {
    const fetchHistoricalData = async () => {
      try {
        const data = await generateHistoricalData(selectedDevice);
        setHistoricalData(data);
      } catch (error) {
        console.error('Failed to fetch historical data:', error);
      }
    };

    if (selectedDevice) {
      fetchHistoricalData();
    }
  }, [selectedDevice, timeRange]);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-red-600" />
          <p className="text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Navigation items component
  const NavItems = ({ onItemClick }: { onItemClick?: () => void }) => {
    const handleNavigation = (view: string) => {
      // Prevent navigation to restricted views for Store Managers
      if (userRole === 'Store Manager' && restrictedViews.includes(view)) {
        return;
      }
      navigate(`/${view}`);
      onItemClick?.();
    };
    
    const isViewRestricted = (view: string) => {
      return userRole === 'Store Manager' && restrictedViews.includes(view);
    };

    return (
      <nav className="flex flex-col gap-2">
        <Button
          variant={activeView === 'overview' ? 'default' : 'ghost'}
          className="justify-start gap-2"
          onClick={() => handleNavigation('overview')}
        >
          <LayoutDashboard className="w-4 h-4" />
          Overview
        </Button>
        <Button
          variant={activeView === 'devices' ? 'default' : 'ghost'}
          className="justify-start gap-2"
          onClick={() => handleNavigation('devices')}
        >
          <Cpu className="w-4 h-4" />
          All Devices
        </Button>
        <Button
          variant={activeView === 'alerts' ? 'default' : 'ghost'}
          className="justify-start gap-2"
          onClick={() => handleNavigation('alerts')}
        >
          <Bell className="w-4 h-4" />
          Alerts
        </Button>
        {!isViewRestricted('detections') && (
          <Button
            variant={activeView === 'detections' ? 'default' : 'ghost'}
            className="justify-start gap-2"
            onClick={() => handleNavigation('detections')}
          >
            <Camera className="w-4 h-4" />
            Detections
          </Button>
        )}
        {!isViewRestricted('plates') && (
          <Button
            variant={activeView === 'plates' ? 'default' : 'ghost'}
            className="justify-start gap-2"
            onClick={() => handleNavigation('plates')}
          >
            <Car className="w-4 h-4" />
            License Plates
          </Button>
        )}
        {!isViewRestricted('search') && (
          <Button
            variant={activeView === 'search' ? 'default' : 'ghost'}
            className="justify-start gap-2"
            onClick={() => handleNavigation('search')}
          >
            <Database className="w-4 h-4" />
            Data Search
          </Button>
        )}
        <Button
          variant={activeView === 'inventory' ? 'default' : 'ghost'}
          className="justify-start gap-2"
          onClick={() => handleNavigation('inventory')}
        >
          <Package className="w-4 h-4" />
          Inventory
        </Button>
        {!isViewRestricted('live') && (
          <Button
            variant={activeView === 'live' ? 'default' : 'ghost'}
            className="justify-start gap-2"
            onClick={() => handleNavigation('live')}
          >
            <Video className="w-4 h-4" />
            Live
          </Button>
        )}
        <Button
          variant={activeView === 'upload' ? 'default' : 'ghost'}
          className="justify-start gap-2"
          onClick={() => handleNavigation('upload')}
        >
          <Upload className="w-4 h-4" />
          Upload
        </Button>

        {/* Divider */}
        <div className="my-2 border-t border-slate-200" />

        {/* Detection Alerts Toggle */}
        <div className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-slate-100 transition-colors">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-slate-600" />
            <span className="text-sm text-slate-700">Detection Alerts</span>
          </div>
          <Switch
            checked={alertsEnabled}
            onCheckedChange={setAlertsEnabled}
          />
        </div>
      </nav>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-white border-r border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <img
              src="/icon.png"
              alt="RaceTrac Logo"
              className="w-10 h-10 rounded-lg object-cover"
            />
            <div>
              <h2 className="text-slate-900">RaceTrac</h2>
              <p className="text-xs text-slate-600">IoT Monitoring</p>
            </div>
          </div>
        </div>
        <div className="flex-1 p-4 overflow-y-auto">
          <NavItems />
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white border-slate-200 border-b">
          <div className="px-4 md:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Mobile/Tablet Drawer */}
                <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="lg:hidden">
                      <Menu className="w-5 h-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[280px] sm:w-[320px]">
                    <SheetHeader>
                      <SheetTitle>Navigation</SheetTitle>
                    </SheetHeader>
                    <div className="mt-6">
                      <NavItems onItemClick={() => setDrawerOpen(false)} />
                    </div>
                  </SheetContent>
                </Sheet>

                {/* Mobile/Tablet Logo */}
                <img
                  src="/icon.png"
                  alt="RaceTrac Logo"
                  className="lg:hidden w-10 h-10 rounded-lg object-cover"
                />
                <div className="lg:hidden">
                  <h1 className="text-slate-900">RaceTrac Petroleum</h1>
                  <p className="text-sm text-slate-600 hidden sm:block">IoT Temperature Monitoring System</p>
                </div>

                {/* Desktop Page Title */}
                <div className="hidden lg:block">
                  <h1 className="text-slate-900">
                    {activeView === 'overview' && 'Dashboard Overview'}
                    {activeView === 'devices' && 'All Devices'}
                    {activeView === 'alerts' && 'Alerts'}
                    {activeView === 'detections' && 'Detections'}
                    {activeView === 'plates' && 'License Plates'}
                    {activeView === 'search' && 'Data Search'}
                    {activeView === 'inventory' && 'Inventory'}
                    {activeView === 'live' && 'Live Stream'}
                    {activeView === 'upload' && 'Image Upload'}
                  </h1>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Select value={userRole} onValueChange={(value: string) => setUserRole(value as 'Admin' | 'Store Manager')}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="Store Manager">Store Manager</SelectItem>
                  </SelectContent>
                </Select>
                <Badge variant="outline" className="gap-1">
                  <Activity className="w-3 h-3" />
                  <span className="hidden sm:inline">Live</span>
                </Badge>
                <span className="text-sm text-slate-500 hidden md:block">Last updated: just now</span>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 px-4 md:px-8 py-6 overflow-auto">
          {/* Main Content */}
          <div className="space-y-4">
            {activeView === 'overview' && (
              <div className="space-y-4">
                {/* Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardDescription>Total Devices</CardDescription>
                      <CardTitle className="text-slate-900">{stats.totalDevices}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        {stats.normalCount} operational
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardDescription>Average Temperature</CardDescription>
                      <CardTitle className="text-slate-900">{stats.avgTemp}°F</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Thermometer className="w-4 h-4" />
                        Across all locations
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardDescription>Warnings</CardDescription>
                      <CardTitle className="text-amber-600">{stats.warningCount}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        Requires attention
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardDescription>Critical Alerts</CardDescription>
                      <CardTitle className="text-red-600">{stats.criticalCount}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                        Immediate action needed
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Camera and Traffic Graphs */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Online Cameras Frequency */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Online Cameras Frequency</CardTitle>
                      <CardDescription>Last 24 hours</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={[
                          { hour: '12 AM', cameras: 12 },
                          { hour: '4 AM', cameras: 11 },
                          { hour: '8 AM', cameras: 15 },
                          { hour: '12 PM', cameras: 18 },
                          { hour: '4 PM', cameras: 16 },
                          { hour: '8 PM', cameras: 14 }
                        ]}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="hour" stroke="#64748b" tick={{ fontSize: 12, fill: '#64748b' }} />
                          <YAxis stroke="#64748b" tick={{ fontSize: 12, fill: '#64748b' }} label={{ value: 'Cameras', angle: -90, position: 'insideLeft', style: { fontSize: 12, fill: '#64748b' } }} />
                          <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '12px', color: '#0f172a' }} />
                          <Legend wrapperStyle={{ fontSize: '12px', color: '#64748b' }} />
                          <Line type="monotone" dataKey="cameras" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 4 }} name="Cameras Online" />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                  {/* Overall Vehicle Traffic */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Overall Vehicle Traffic</CardTitle>
                      <CardDescription>Last 24 hours</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={[
                          { hour: '12 AM', vehicles: 50 },
                          { hour: '4 AM', vehicles: 30 },
                          { hour: '8 AM', vehicles: 120 },
                          { hour: '12 PM', vehicles: 234 },
                          { hour: '4 PM', vehicles: 198 },
                          { hour: '8 PM', vehicles: 90 }
                        ]}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="hour" stroke="#64748b" tick={{ fontSize: 12, fill: '#64748b' }} />
                          <YAxis stroke="#64748b" tick={{ fontSize: 12, fill: '#64748b' }} label={{ value: 'Vehicles', angle: -90, position: 'insideLeft', style: { fontSize: 12, fill: '#64748b' } }} />
                          <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '12px', color: '#0f172a' }} />
                          <Legend wrapperStyle={{ fontSize: '12px', color: '#64748b' }} />
                          <Bar dataKey="vehicles" fill="#10b981" name="Vehicles Detected" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Temperature Chart */}
                  <Card className="lg:col-span-2">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>Temperature Fluctuations</CardTitle>
                          <CardDescription className="mt-1">
                            {selectedDeviceData?.name} - {selectedDeviceData?.location}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Select value={selectedDevice} onValueChange={setSelectedDevice}>
                            <SelectTrigger className="w-[200px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {devices.map(device => (
                                <SelectItem key={device.id} value={device.id}>
                                  {device.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select value={timeRange} onValueChange={setTimeRange}>
                            <SelectTrigger className="w-[100px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="24h">24 Hours</SelectItem>
                              <SelectItem value="7d">7 Days</SelectItem>
                              <SelectItem value="30d">30 Days</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <TemperatureChart data={historicalData} />
                    </CardContent>
                  </Card>

                  {/* Current Status */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Current Status</CardTitle>
                      <CardDescription>Real-time device readings</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-600">Current Temperature</span>
                          <span className={`${selectedDeviceData?.status === 'critical' ? 'text-red-600' :
                            selectedDeviceData?.status === 'warning' ? 'text-amber-600' :
                              'text-green-600'
                            }`}>
                            {selectedDeviceData?.currentTemp}°F
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-600">Status</span>
                          <Badge variant={
                            selectedDeviceData?.status === 'critical' ? 'destructive' :
                              selectedDeviceData?.status === 'warning' ? 'default' :
                                'outline'
                          }>
                            {selectedDeviceData?.status}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-600">Last Update</span>
                          <span className="text-sm">{selectedDeviceData?.lastUpdate}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-600">Device ID</span>
                          <span className="text-sm font-mono">{selectedDeviceData?.id}</span>
                        </div>
                      </div>

                      <div className="pt-4 border-t">
                        <h4 className="text-sm mb-3">Temperature Ranges</h4>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-600">Safe Range</span>
                            <span className="text-green-600">65°F - 80°F</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-600">Warning Range</span>
                            <span className="text-amber-600">80°F - 90°F</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-600">Critical Range</span>
                            <span className="text-red-600">&gt; 90°F</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 border-t">
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                          <div className="text-sm text-slate-600">
                            {selectedDeviceData?.location}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {activeView === 'devices' && (
              <DeviceGrid devices={devices} />
            )}

            {activeView === 'alerts' && (
              <AlertsPanel devices={devices} />
            )}

            {activeView === 'detections' && (
              <DetectionViewer alertsEnabled={alertsEnabled} />
            )}

            {activeView === 'plates' && (
              <LicensePlateStatesPanel />
            )}

            {activeView === 'search' && (
              <LazyDataGrid />
            )}

            {activeView === 'inventory' && (
              <Inventory />
            )}

            {activeView === 'live' && (
              <WebcamStream isActive={activeView === 'live'} />
            )}

            {activeView === 'upload' && (
              <ImageUpload />
            )}
          </div>
        </div>

        {/* AI Chat Button */}
        <AIChatButton />
      </div>
      {/* Toast notifications */}
      <Toaster />
    </div>
  );
}
