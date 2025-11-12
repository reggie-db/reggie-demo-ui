import { apiCall, logger, USE_MOCK_DATA } from './config';

export interface SearchResponse {
  columns: string[];
  data: Record<string, any>[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
  sql?: string;
  description?: string;
}

export interface SearchParams {
  query: string;
  limit: number;
  offset: number;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
}

/**
 * Search data using natural language query with pagination
 */
export async function searchData(params: SearchParams): Promise<SearchResponse> {
  const startTime = performance.now();

  logger.request('searchService', 'searchData', params);

  try {
    if (USE_MOCK_DATA) {
      // Mock data for demonstration
      const mockData = generateMockSearchResults(params);
      const duration = Math.round(performance.now() - startTime);

      logger.response('searchService', 'searchData', {
        recordCount: mockData.data.length,
        total: mockData.total,
        columns: mockData.columns.length
      }, duration);

      return mockData;
    }

    // Real API call using apiCall which uses serviceUtils for headers
    const queryParams = new URLSearchParams({
      q: params.query,
      limit: params.limit.toString(),
      offset: params.offset.toString(),
    });

    if (params.sortColumn) {
      queryParams.append('sort_column', params.sortColumn);
    }
    if (params.sortDirection) {
      queryParams.append('sort_direction', params.sortDirection);
    }

    const data: SearchResponse = await apiCall<SearchResponse>(`/api/search?${queryParams}`);
    const duration = Math.round(performance.now() - startTime);

    logger.response('searchService', 'searchData', {
      recordCount: data.data.length,
      total: data.total,
      columns: data.columns.length
    }, duration);

    return data;
  } catch (error) {
    const duration = Math.round(performance.now() - startTime);
    logger.error('searchService', 'searchData', error, duration);
    throw error;
  }
}

/**
 * Generate mock search results for demonstration
 */
function generateMockSearchResults(params: SearchParams): SearchResponse {
  const { query, limit, offset, sortColumn, sortDirection } = params;

  // Determine what kind of data to return based on query
  const queryLower = query.toLowerCase();

  let columns: string[];
  let totalRecords: number;
  let dataGenerator: (index: number) => Record<string, any>;

  if (queryLower.includes('temperature') || queryLower.includes('device')) {
    // Temperature/Device data
    columns = ['device_id', 'location', 'temperature', 'humidity', 'timestamp', 'status'];
    totalRecords = 500;
    dataGenerator = (i) => ({
      device_id: `RT-${String.fromCharCode(65 + (i % 26))}${String.fromCharCode(65 + ((i + 1) % 26))}-${String(i).padStart(3, '0')}`,
      location: ['Atlanta, GA', 'Houston, TX', 'Miami, FL', 'Dallas, TX', 'Phoenix, AZ'][i % 5],
      temperature: (65 + Math.random() * 30).toFixed(1),
      humidity: (30 + Math.random() * 40).toFixed(1),
      timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString(),
      status: ['normal', 'warning', 'critical'][Math.floor(Math.random() * 3)],
    });
  } else if (queryLower.includes('sales') || queryLower.includes('revenue')) {
    // Sales data
    columns = ['transaction_id', 'store_id', 'amount', 'items', 'payment_method', 'date'];
    totalRecords = 1000;
    dataGenerator = (i) => ({
      transaction_id: `TXN-${String(Date.now() + i).slice(-8)}`,
      store_id: `RT-${String(1000 + (i % 50)).padStart(4, '0')}`,
      amount: (10 + Math.random() * 200).toFixed(2),
      items: Math.floor(1 + Math.random() * 10),
      payment_method: ['Credit Card', 'Debit Card', 'Cash', 'Mobile Pay'][i % 4],
      date: new Date(Date.now() - Math.random() * 2592000000).toISOString().split('T')[0],
    });
  } else if (queryLower.includes('inventory') || queryLower.includes('stock')) {
    // Inventory data
    columns = ['product_id', 'product_name', 'category', 'quantity', 'unit_price', 'supplier'];
    totalRecords = 750;
    dataGenerator = (i) => ({
      product_id: `PRD-${String(10000 + i).padStart(5, '0')}`,
      product_name: ['Motor Oil 5W-30', 'Windshield Fluid', 'Air Freshener', 'Energy Drink', 'Snack Bar'][i % 5],
      category: ['Automotive', 'Automotive', 'Accessories', 'Beverages', 'Food'][i % 5],
      quantity: Math.floor(10 + Math.random() * 500),
      unit_price: (1.99 + Math.random() * 50).toFixed(2),
      supplier: ['Supplier A', 'Supplier B', 'Supplier C', 'Supplier D'][i % 4],
    });
  } else if (queryLower.includes('customer') || queryLower.includes('user')) {
    // Customer data
    columns = ['customer_id', 'name', 'email', 'loyalty_points', 'visits', 'last_visit'];
    totalRecords = 300;
    dataGenerator = (i) => ({
      customer_id: `CUST-${String(50000 + i).padStart(6, '0')}`,
      name: ['John Smith', 'Jane Doe', 'Michael Johnson', 'Emily Davis', 'David Wilson'][i % 5],
      email: `customer${i}@example.com`,
      loyalty_points: Math.floor(Math.random() * 5000),
      visits: Math.floor(1 + Math.random() * 100),
      last_visit: new Date(Date.now() - Math.random() * 7776000000).toISOString().split('T')[0],
    });
  } else {
    // Generic data
    columns = ['id', 'name', 'value', 'category', 'created_at'];
    totalRecords = 200;
    dataGenerator = (i) => ({
      id: i + 1,
      name: `Item ${i + 1}`,
      value: (Math.random() * 1000).toFixed(2),
      category: ['Category A', 'Category B', 'Category C'][i % 3],
      created_at: new Date(Date.now() - Math.random() * 31536000000).toISOString().split('T')[0],
    });
  }

  // Generate all data first (for sorting)
  const allData: Record<string, any>[] = [];
  for (let i = 0; i < totalRecords; i++) {
    allData.push(dataGenerator(i));
  }

  // Apply sorting if specified
  if (sortColumn && columns.includes(sortColumn)) {
    console.log(`[searchService] Applying server-side sort: ${sortColumn} ${sortDirection}`);

    allData.sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];

      // Handle null/undefined
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return sortDirection === 'asc' ? 1 : -1;
      if (bVal == null) return sortDirection === 'asc' ? -1 : 1;

      // Compare values
      let comparison = 0;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal;
      } else {
        comparison = String(aVal).localeCompare(String(bVal));
      }

      return sortDirection === 'desc' ? -comparison : comparison;
    });

    console.log(`[searchService] Sort complete. First 3 values:`,
      allData.slice(0, 3).map(item => item[sortColumn])
    );
  } else if (sortColumn) {
    console.log(`[searchService] Sort column "${sortColumn}" not found in columns:`, columns);
  }

  // Get page data
  const start = offset;
  const end = Math.min(offset + limit, totalRecords);
  const data = allData.slice(start, end);

  // Generate SQL query based on the search
  let tableName = 'items';
  if (queryLower.includes('temperature') || queryLower.includes('device')) {
    tableName = 'devices';
  } else if (queryLower.includes('sales') || queryLower.includes('revenue')) {
    tableName = 'transactions';
  } else if (queryLower.includes('inventory') || queryLower.includes('stock')) {
    tableName = 'inventory';
  } else if (queryLower.includes('customer') || queryLower.includes('user')) {
    tableName = 'customers';
  } else if (queryLower.includes('timestamp') || queryLower.includes('store') || queryLower.includes('detection') || queryLower.includes('label')) {
    tableName = 'detections';
  }

  // Build SELECT clause with column names
  const selectClause = columns.length > 0 ? columns.join(', ') : '*';
  let sql = `SELECT ${selectClause} FROM ${tableName}`;

  // Add WHERE clause if query has specific conditions
  if (queryLower.includes('temperature') && queryLower.includes('>')) {
    sql += ' WHERE temperature > 70';
  } else if (queryLower.includes('high') || queryLower.includes('above')) {
    sql += ' WHERE value > 50';
  } else if (queryLower.includes('newest') || queryLower.includes('oldest')) {
    // For timestamp queries, add ordering hint in WHERE if needed
    if (queryLower.includes('timestamp')) {
      sql += ' WHERE timestamp IS NOT NULL';
    }
  }

  // Add ORDER BY if sorting
  if (sortColumn && columns.includes(sortColumn)) {
    sql += ` ORDER BY ${sortColumn} ${sortDirection === 'desc' ? 'DESC' : 'ASC'}`;
  } else if (queryLower.includes('newest') && columns.includes('timestamp')) {
    // Default to newest first if query mentions "newest"
    sql += ' ORDER BY timestamp DESC';
  } else if (queryLower.includes('oldest') && columns.includes('timestamp')) {
    sql += ' ORDER BY timestamp ASC';
  }

  sql += ` LIMIT ${limit} OFFSET ${offset}`;

  // Generate description based on query
  let description = `Query results for: ${query}`;
  if (queryLower.includes('detection') && queryLower.includes('count')) {
    description = 'This query shows the count of detection labels grouped by week, providing insights into detection frequency over time.';
  } else if (queryLower.includes('detection') && queryLower.includes('frequent')) {
    description = 'This query identifies the most frequently detected labels per store location, helping to understand detection patterns across different locations.';
  } else if (queryLower.includes('timestamp') || queryLower.includes('store') || queryLower.includes('detection')) {
    description = 'This query displays detection records with timestamps and store information, sorted by the specified criteria.';
  }

  return {
    columns,
    data,
    total: totalRecords,
    offset,
    limit,
    hasMore: end < totalRecords,
    sql,
    description,
  };
}
