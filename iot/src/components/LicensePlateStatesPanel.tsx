import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { MapPin, TrendingUp, Clock, Loader2 } from 'lucide-react';
import { getStateDistribution, getTopStates, getRecentPlates, getStateStats, StateDistribution, RecentPlate, StateStats } from '../services/licensePlateService';

export function LicensePlateStatesPanel() {
  const [stateDistribution, setStateDistribution] = useState<StateDistribution[]>([]);
  const [recentPlates, setRecentPlates] = useState<RecentPlate[]>([]);
  const [stateStats, setStateStats] = useState<StateStats>({ totalDetected: 0, uniqueStates: 0, averagePerHour: 0, trend: '+0%' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [distributionData, recentData, statsData] = await Promise.all([
          getStateDistribution(),
          getRecentPlates(),
          getStateStats(),
        ]);
        setStateDistribution(distributionData);
        setRecentPlates(recentData);
        setStateStats(statsData);
      } catch (error) {
        console.error('Failed to fetch license plate data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const topStates = getTopStates(stateDistribution);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          <p className="text-slate-600">Loading license plate data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Plates Detected</CardDescription>
            <CardTitle className="text-slate-900">{stateStats.totalDetected.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Clock className="w-4 h-4" />
              Last 24 hours
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Unique States</CardDescription>
            <CardTitle className="text-slate-900">{stateStats.uniqueStates}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <MapPin className="w-4 h-4" />
              Across all locations
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Average Per Hour</CardDescription>
            <CardTitle className="text-slate-900">{stateStats.averagePerHour}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <span className="text-green-600">{stateStats.trend} from last week</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Top State</CardDescription>
            <CardTitle className="text-slate-900">{topStates[0].state}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Badge variant="outline">{topStates[0].percentage}%</Badge>
              {topStates[0].name}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* State Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>State Distribution</CardTitle>
            <CardDescription>License plate states detected (24h)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stateDistribution}
                  dataKey="count"
                  nameKey="state"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={(entry) => `${entry.state} ${entry.percentage}%`}
                  labelLine={{ stroke: '#64748b', strokeWidth: 1 }}
                >
                  {stateDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '12px'
                  }}
                  formatter={(value: number, name: string, props: any) => [
                    `${value} plates (${props.payload.percentage}%)`,
                    props.payload.name
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top States Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Top States</CardTitle>
            <CardDescription>Most frequent license plate states</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topStates} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" stroke="#64748b" tick={{ fontSize: 12 }} />
                <YAxis 
                  type="category" 
                  dataKey="state" 
                  stroke="#64748b" 
                  tick={{ fontSize: 12 }}
                  width={40}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '12px'
                  }}
                  formatter={(value: number, name: string, props: any) => [
                    `${value} plates (${props.payload.percentage}%)`,
                    props.payload.name
                  ]}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {topStates.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent Detections */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Detections</CardTitle>
            <CardDescription>Live license plate feed</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentPlates.map((plate) => (
                <div key={plate.id} className="p-3 rounded-lg border bg-slate-50 border-slate-200">
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono">
                        {plate.state}
                      </Badge>
                      <span className="text-sm font-mono text-slate-900">{plate.plateNumber}</span>
                    </div>
                    <span className="text-xs text-slate-500">{plate.time}</span>
                  </div>
                  <p className="text-sm mb-2 text-slate-600">{plate.location}</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 rounded-full h-1.5 bg-slate-200">
                      <div 
                        className="bg-green-600 h-1.5 rounded-full" 
                        style={{ width: `${plate.confidence}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-600">{plate.confidence}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* State Details Table */}
      <Card>
        <CardHeader>
          <CardTitle>All States Breakdown</CardTitle>
          <CardDescription>Detailed view of all detected license plate states</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {stateDistribution.map((state) => (
              <div 
                key={state.state} 
                className="p-4 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
                style={{ borderLeftWidth: '4px', borderLeftColor: state.color }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono">{state.state}</span>
                    <Badge variant="outline" className="text-xs">{state.percentage}%</Badge>
                  </div>
                  <MapPin className="w-4 h-4 text-slate-400" />
                </div>
                <p className="text-sm mb-1 text-slate-600">{state.name}</p>
                <p className="text-slate-900">{state.count} plates</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
