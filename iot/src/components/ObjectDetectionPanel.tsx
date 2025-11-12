import {useEffect, useState} from 'react';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from './ui/card';
import {Badge} from './ui/badge';
import {Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import {Camera, Car, Loader2, Package, TrendingUp, Truck, Users} from 'lucide-react';
import {
    getHourlyDetections,
    getObjectDetectionData,
    getRecentDetections,
    HourlyDetection,
    ObjectDetection,
    RecentDetection
} from '../services/objectDetectionService';

export function ObjectDetectionPanel() {
    const [objectDetectionData, setObjectDetectionData] = useState<ObjectDetection[]>([]);
    const [hourlyDetections, setHourlyDetections] = useState<HourlyDetection[]>([]);
    const [recentDetections, setRecentDetections] = useState<RecentDetection[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [detectionData, hourlyData, recentData] = await Promise.all([
                    getObjectDetectionData(),
                    getHourlyDetections(),
                    getRecentDetections(),
                ]);
                setObjectDetectionData(detectionData);
                setHourlyDetections(hourlyData);
                setRecentDetections(recentData);
            } catch (error) {
                console.error('Failed to fetch object detection data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Map icon names to components
    const iconMap: Record<string, any> = {
        Car,
        Users,
        Truck,
        Package,
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-slate-400"/>
                    <p className="text-slate-600">Loading object detection data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Detection Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {objectDetectionData.map((item) => {
                    const Icon = iconMap[item.icon] ?? Package;
                    const isPositive = item.trend.startsWith('+');

                    return (
                        <Card key={item.object}>
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                                         style={{backgroundColor: `${item.color}20`}}>
                                        <Icon className="w-5 h-5" style={{color: item.color}}/>
                                    </div>
                                    <Badge variant={isPositive ? 'default' : 'outline'} className="gap-1">
                                        <TrendingUp className={`w-3 h-3 ${isPositive ? '' : 'rotate-180'}`}/>
                                        {item.trend}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <CardTitle className="text-slate-900">{item.count.toLocaleString()}</CardTitle>
                                <CardDescription className="mt-1">{item.object} detected (24h)</CardDescription>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Hourly Detection Chart */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Hourly Detection Activity</CardTitle>
                        <CardDescription>Object detections over the last 24 hours</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={hourlyDetections}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0"/>
                                <XAxis
                                    dataKey="hour"
                                    stroke="#64748b"
                                    tick={{fontSize: 12}}
                                />
                                <YAxis
                                    stroke="#64748b"
                                    tick={{fontSize: 12}}
                                    label={{
                                        value: 'Detections',
                                        angle: -90,
                                        position: 'insideLeft',
                                        style: {fontSize: 12}
                                    }}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'white',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '6px',
                                        fontSize: '12px'
                                    }}
                                />
                                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                    {hourlyDetections.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill="#dc2626"/>
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Recent Detections */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Camera className="w-5 h-5"/>
                            Recent Detections
                        </CardTitle>
                        <CardDescription>Live detection feed</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {recentDetections.map((detection) => (
                                <div key={detection.id} className="p-3 rounded-lg border bg-slate-50 border-slate-200">
                                    <div className="flex items-start justify-between mb-1">
                                        <span className="text-slate-900">{detection.type}</span>
                                        <span className="text-xs text-slate-500">{detection.time}</span>
                                    </div>
                                    <p className="text-sm mb-2 text-slate-600">{detection.location}</p>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 rounded-full h-1.5 bg-slate-200">
                                            <div
                                                className="bg-green-600 h-1.5 rounded-full"
                                                style={{width: `${detection.confidence}%`}}
                                            />
                                        </div>
                                        <span className="text-xs text-slate-600">{detection.confidence}%</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
