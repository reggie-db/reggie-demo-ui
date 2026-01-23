// Inventory Component
// Shows truck parking capacity and pizza inventory for stores 1-4

import React, { useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { AlertCircle, Clock, Truck, Pizza } from 'lucide-react';

interface DataPoint {
  time: string;
  value: number;
  upperBound?: number;
  lowerBound?: number;
}

interface PizzaDataPoint {
  time: string;
  percentage: number;
  exhaustionTime?: string;
  startTime?: string;
}

/**
 * Generate mock truck parking capacity data
 */
const generateTruckParkingData = (storeId: number): DataPoint[] => {
  const now = new Date();
  const data: DataPoint[] = [];
  
  // Generate historical data (last 12 hours, every 30 minutes)
  for (let i = 24; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 30 * 60 * 1000);
    const hour = time.getHours();
    
    // Simulate capacity patterns (lower at night, higher during day)
    const baseCapacity = 30 + (storeId * 5); // Base capacity varies by store
    const hourVariation = Math.sin((hour - 6) * Math.PI / 12) * 20; // Peak around noon
    const randomVariation = (Math.random() - 0.5) * 10;
    const capacity = Math.max(0, Math.min(100, baseCapacity + hourVariation + randomVariation));
    
    data.push({
      time: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      value: Math.round(capacity),
    });
  }
  
  // Generate future projection (next 6 hours, every 30 minutes)
  const lastValue = data[data.length - 1].value;
  const trend = (Math.random() - 0.5) * 2; // Random trend
  
  for (let i = 1; i <= 12; i++) {
    const time = new Date(now.getTime() + i * 30 * 60 * 1000);
    const hour = time.getHours();
    
    const hourVariation = Math.sin((hour - 6) * Math.PI / 12) * 20;
    const projectedValue = lastValue + trend * i + hourVariation + (Math.random() - 0.5) * 5;
    const upperBound = projectedValue + 15 + Math.random() * 10;
    const lowerBound = projectedValue - 15 - Math.random() * 10;
    
    data.push({
      time: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      value: Math.max(0, Math.min(100, Math.round(projectedValue))),
      upperBound: Math.max(0, Math.min(100, Math.round(upperBound))),
      lowerBound: Math.max(0, Math.min(100, Math.round(lowerBound))),
    });
  }
  
  return data;
};

/**
 * Generate mock pizza inventory data
 */
const generatePizzaInventoryData = (storeId: number): PizzaDataPoint[] => {
  const now = new Date();
  const data: PizzaDataPoint[] = [];
  
  // Generate data for the day (every 15 minutes)
  const startOfDay = new Date(now);
  startOfDay.setHours(6, 0, 0, 0); // Start at 6 AM
  
  let currentPercentage = 100;
  const baseDeclineRate = 2 + (storeId * 0.5); // Varies by store
  
  for (let i = 0; i < 64; i++) { // 16 hours * 4 (15 min intervals)
    const time = new Date(startOfDay.getTime() + i * 15 * 60 * 1000);
    
    if (time > now) break; // Only show past and current
    
    const hour = time.getHours();
    
    // Simulate consumption patterns
    let declineRate = baseDeclineRate;
    if (hour >= 11 && hour <= 14) { // Lunch rush
      declineRate *= 3;
    } else if (hour >= 17 && hour <= 20) { // Dinner rush
      declineRate *= 4;
    } else if (hour >= 6 && hour <= 10) { // Morning, slower
      declineRate *= 0.5;
    } else if (hour >= 21 || hour < 6) { // Late night, very slow
      declineRate *= 0.2;
    }
    
    // Add some randomness
    declineRate += (Math.random() - 0.5) * declineRate * 0.3;
    
    // Simulate restocking (random times, increases inventory)
    if (Math.random() > 0.95 && currentPercentage < 80) {
      currentPercentage = Math.min(100, currentPercentage + 30 + Math.random() * 20);
    } else {
      currentPercentage = Math.max(0, currentPercentage - declineRate);
    }
    
    const timeStr = time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    
    // Calculate exhaustion time if percentage is low
    let exhaustionTime: string | undefined;
    let startTime: string | undefined;
    
    if (currentPercentage < 20 && currentPercentage > 0) {
      // Estimate when it will hit 0% based on current decline rate
      const minutesToExhaustion = (currentPercentage / declineRate) * 15;
      const exhaustionDate = new Date(time.getTime() + minutesToExhaustion * 60 * 1000);
      exhaustionTime = exhaustionDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      
      // Calculate when to start making pizza (15 minutes before exhaustion)
      const startDate = new Date(exhaustionDate.getTime() - 15 * 60 * 1000);
      startTime = startDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }
    
    data.push({
      time: timeStr,
      percentage: Math.round(currentPercentage * 10) / 10,
      exhaustionTime,
      startTime,
    });
  }
  
  return data;
};

export function Inventory() {
  const [selectedStore, setSelectedStore] = useState<string>('1');
  const storeId = parseInt(selectedStore);
  
  const truckData = useMemo(() => generateTruckParkingData(storeId), [storeId]);
  const pizzaData = useMemo(() => generatePizzaInventoryData(storeId), [storeId]);
  
  // Find the index where historical data ends and projections begin
  const nowIndex = truckData.findIndex(d => d.upperBound !== undefined || d.lowerBound !== undefined);
  const nowTime = nowIndex > 0 ? truckData[nowIndex - 1]?.time : truckData[Math.floor(truckData.length * 0.8)]?.time;
  
  // Find current pizza percentage and warnings
  const currentPizzaData = pizzaData[pizzaData.length - 1];
  const needsAttention = currentPizzaData && currentPizzaData.percentage < 20;
  const critical = currentPizzaData && currentPizzaData.percentage < 10;
  
  // Find the start time marker for pizza
  const startTimeMarker = pizzaData.find(d => d.startTime);
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Inventory Management</h2>
          <p className="text-sm text-slate-600 mt-1">Monitor truck parking capacity and pizza inventory across stores</p>
        </div>
        <Select value={selectedStore} onValueChange={setSelectedStore}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select store" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Store 1</SelectItem>
            <SelectItem value="2">Store 2</SelectItem>
            <SelectItem value="3">Store 3</SelectItem>
            <SelectItem value="4">Store 4</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="truck" className="space-y-4">
        <TabsList>
          <TabsTrigger value="truck">
            <Truck className="w-4 h-4 mr-2" />
            Truck Parking
          </TabsTrigger>
          <TabsTrigger value="pizza">
            <Pizza className="w-4 h-4 mr-2" />
            Pizza Inventory
          </TabsTrigger>
        </TabsList>

        <TabsContent value="truck" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Truck Parking Capacity - Store {storeId}</CardTitle>
              <CardDescription>Percentage capacity over time with future projections</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={truckData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorUpper" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorLower" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="time" 
                    stroke="#64748b"
                    tick={{ fill: '#64748b', fontSize: 12 }}
                  />
                  <YAxis 
                    stroke="#64748b"
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    domain={[0, 100]}
                    label={{ value: 'Capacity %', angle: -90, position: 'insideLeft', fill: '#64748b' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px'
                    }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="upperBound"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#colorUpper)"
                    name="Upper Bound (Projected)"
                    strokeDasharray="5 5"
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fill="url(#colorValue)"
                    name="Current/Projected Capacity"
                  />
                  <Area
                    type="monotone"
                    dataKey="lowerBound"
                    stroke="#ef4444"
                    strokeWidth={2}
                    fill="url(#colorLower)"
                    name="Lower Bound (Projected)"
                    strokeDasharray="5 5"
                  />
                  <ReferenceLine 
                    x={nowTime} 
                    stroke="#94a3b8" 
                    strokeDasharray="3 3"
                    label={{ value: "Now", position: "top", fill: "#64748b" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
              <div className="mt-4 text-sm text-slate-600">
                <p>Projections are based on historical patterns and predictive modeling. Upper and lower bounds represent 95% confidence intervals.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pizza" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Pizza Inventory - Store {storeId}</CardTitle>
                  <CardDescription>Percentage inventory over time with exhaustion estimates</CardDescription>
                </div>
                {needsAttention && (
                  <Badge variant={critical ? "destructive" : "default"} className="gap-2">
                    {critical ? <AlertCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                    {critical ? 'Critical' : 'Low Inventory'}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={pizzaData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="time" 
                    stroke="#64748b"
                    tick={{ fill: '#64748b', fontSize: 12 }}
                  />
                  <YAxis 
                    stroke="#64748b"
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    domain={[0, 100]}
                    label={{ value: 'Inventory %', angle: -90, position: 'insideLeft', fill: '#64748b' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px'
                    }}
                    formatter={(value: number) => [`${value}%`, 'Inventory']}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="percentage"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={false}
                    name="Pizza Inventory %"
                  />
                  {startTimeMarker && (
                    <ReferenceLine 
                      x={startTimeMarker.time} 
                      stroke="#ef4444" 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      label={{ 
                        value: "Start Making Pizza", 
                        position: "top", 
                        fill: "#ef4444",
                        fontSize: 12,
                        fontWeight: 'bold'
                      }}
                    />
                  )}
                  {currentPizzaData?.exhaustionTime && (
                    <ReferenceLine 
                      x={currentPizzaData.exhaustionTime} 
                      stroke="#dc2626" 
                      strokeWidth={2}
                      strokeDasharray="3 3"
                      label={{ 
                        value: `Exhaustion: ${currentPizzaData.exhaustionTime}`, 
                        position: "top", 
                        fill: "#dc2626",
                        fontSize: 12,
                        fontWeight: 'bold'
                      }}
                    />
                  )}
                  <ReferenceLine 
                    y={20} 
                    stroke="#f59e0b" 
                    strokeDasharray="3 3"
                    strokeOpacity={0.5}
                    label={{ value: "Low Threshold (20%)", position: "right", fill: "#f59e0b" }}
                  />
                  <ReferenceLine 
                    y={10} 
                    stroke="#ef4444" 
                    strokeDasharray="3 3"
                    strokeOpacity={0.5}
                    label={{ value: "Critical Threshold (10%)", position: "right", fill: "#ef4444" }}
                  />
                </LineChart>
              </ResponsiveContainer>
              
              {currentPizzaData && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-slate-900">Current Inventory</p>
                      <p className="text-2xl font-bold text-slate-900">{currentPizzaData.percentage}%</p>
                    </div>
                    {currentPizzaData.exhaustionTime && (
                      <div className="text-right">
                        <p className="text-sm text-slate-600">Estimated Exhaustion</p>
                        <p className="text-lg font-semibold text-red-600">{currentPizzaData.exhaustionTime}</p>
                      </div>
                    )}
                    {currentPizzaData.startTime && (
                      <div className="text-right">
                        <p className="text-sm text-slate-600">Start Making Pizza</p>
                        <p className="text-lg font-semibold text-orange-600">{currentPizzaData.startTime}</p>
                        <p className="text-xs text-slate-500">(15 min lead time)</p>
                      </div>
                    )}
                  </div>
                  {needsAttention && (
                    <div className={`p-3 rounded-lg ${critical ? 'bg-red-50 border border-red-200' : 'bg-orange-50 border border-orange-200'}`}>
                      <div className="flex items-start gap-2">
                        {critical ? (
                          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                        ) : (
                          <Clock className="w-5 h-5 text-orange-600 mt-0.5" />
                        )}
                        <div>
                          <p className={`text-sm font-medium ${critical ? 'text-red-900' : 'text-orange-900'}`}>
                            {critical ? 'Critical Inventory Level' : 'Low Inventory Warning'}
                          </p>
                          <p className={`text-sm mt-1 ${critical ? 'text-red-700' : 'text-orange-700'}`}>
                            {currentPizzaData.exhaustionTime 
                              ? `Pizza inventory is expected to be exhausted at ${currentPizzaData.exhaustionTime}. Start making pizza by ${currentPizzaData.startTime} to maintain supply.`
                              : 'Pizza inventory is running low. Monitor closely and prepare to restock.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
