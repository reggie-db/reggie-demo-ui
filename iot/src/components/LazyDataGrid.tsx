import { AlertCircle, ChevronDown, ChevronUp, Code2, Database, Info, Loader2, Search } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { format } from 'sql-formatter';
import { searchData, SearchResponse } from '../services/searchService';
import { formatTimestampValue, isTimestamp } from '../utils/dateUtils';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Skeleton } from './ui/skeleton';
import { ensureVaadinGridLoaded } from './VaadinGridLoader';

interface Grid extends HTMLElement {
  size: number;
  pageSize: number;
  dataProvider: any;
  clearCache?: () => void;
  isConnected: boolean;
  sorters?: any[];
  addEventListener: (event: string, handler: any) => void;
  removeEventListener: (event: string, handler: any) => void;
}

const PAGE_SIZE = 50;

// Extend JSX to include vaadin-grid
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'vaadin-grid': any;
      'vaadin-grid-column': any;
      'vaadin-grid-sort-column': any;
    }
  }
}

export function LazyDataGrid() {
  const [query, setQuery] = useState('List timestamp, store, and detection label newest to oldest');
  const [searchQuery, setSearchQuery] = useState('List timestamp, store, and detection label newest to oldest');
  const [data, setData] = useState<Record<string, any>[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [initialLoading, setInitialLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gridReady, setGridReady] = useState(false);
  const [sqlQuery, setSqlQuery] = useState<string | undefined>();
  const [showSql, setShowSql] = useState(false);
  const [description, setDescription] = useState<string | undefined>();
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

  const gridRef = useRef<Grid | null>(null);
  const loadingRef = useRef(false);
  const dataCache = useRef<Map<number, any>>(new Map());

  // Load Vaadin Grid on mount
  useEffect(() => {
    const initGrid = async () => {
      try {
        await ensureVaadinGridLoaded();
        setGridReady(true);
      } catch (error) {
        console.error('Failed to initialize Vaadin Grid:', error);
        setError('Failed to load data grid component');
      }
    };

    initGrid();
  }, []);

  // Load data function
  const loadData = useCallback(async (newQuery: boolean = false) => {
    if (loadingRef.current || !searchQuery) return;

    loadingRef.current = true;

    try {
      if (newQuery) {
        setInitialLoading(true);
      }
      setError(null);

      const response: SearchResponse = await searchData({
        query: searchQuery,
        limit: PAGE_SIZE,
        offset: 0,
      });

      if (newQuery) {
        // New search - replace data
        setData(response.data);
        setColumns(response.columns);
        setSqlQuery(response.sql);
        setDescription(response.description);
        setDescriptionExpanded(response.total === 0); // Auto-expand if no results
        dataCache.current.clear();
        // Populate cache with initial data
        response.data.forEach((item, index) => {
          dataCache.current.set(index, item);
        });
      }

      setTotal(response.total);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data. Please try again.');
    } finally {
      setInitialLoading(false);
      loadingRef.current = false;
    }
  }, [searchQuery]);

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setSearchQuery(query);
    setData([]);
    setColumns([]);
    dataCache.current.clear();
    setError(null);
  };

  // Load initial data (only when search query changes, not when sort changes)
  // Sort changes are handled by the data provider
  useEffect(() => {
    if (searchQuery) {
      loadData(true);
    }
  }, [searchQuery, loadData]);

  // Setup Vaadin Grid data provider
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid || columns.length === 0 || !gridReady) return;

    if (!grid.isConnected) {
      console.warn('[LazyDataGrid] Grid element not connected to DOM');
      return;
    }

    grid.size = total;
    grid.pageSize = PAGE_SIZE;

    // Simple data provider that uses Vaadin's built-in sort params
    grid.dataProvider = async (params: any, callback: any) => {
      const startIndex = params.page * params.pageSize;
      const endIndex = startIndex + params.pageSize;

      // Extract sort from params (Vaadin provides this automatically)
      let sortColumn: string | undefined = undefined;
      let sortDirection: 'asc' | 'desc' | undefined = undefined;

      if (params.sortOrders && params.sortOrders.length > 0) {
        const sortOrder = params.sortOrders[0];
        sortColumn = sortOrder.path || sortOrder.column?.path;
        if (sortOrder.direction === 'asc' || sortOrder.direction === 'desc') {
          sortDirection = sortOrder.direction;
        } else if (sortOrder.direction === 1 || sortOrder.direction === 'ascending') {
          sortDirection = 'asc';
        } else if (sortOrder.direction === -1 || sortOrder.direction === 'descending') {
          sortDirection = 'desc';
        }
      }

      // Clear cache if sort changed
      const cacheKey = `${sortColumn || 'none'}-${sortDirection || 'none'}`;
      const lastCacheKey = (dataCache.current as any).lastSortKey;
      if (cacheKey !== lastCacheKey) {
        dataCache.current.clear();
        (dataCache.current as any).lastSortKey = cacheKey;
      }

      // Check if we need to load data
      const needsData = [];
      for (let i = startIndex; i < endIndex && i < total; i++) {
        if (!dataCache.current.has(i)) {
          needsData.push(i);
        }
      }

      // Load missing data
      if (needsData.length > 0) {
        try {
          const response = await searchData({
            query: searchQuery,
            limit: params.pageSize,
            offset: startIndex,
            sortColumn,
            sortDirection,
          });

          // Update SQL query if it changed (e.g., due to sorting)
          if (response.sql && response.sql !== sqlQuery) {
            setSqlQuery(response.sql);
          }

          response.data.forEach((item, index) => {
            dataCache.current.set(startIndex + index, item);
          });
        } catch (err) {
          console.error('Error loading page data:', err);
        }
      }

      // Get data from cache
      const pageData = [];
      for (let i = startIndex; i < endIndex && i < total; i++) {
        const item = dataCache.current.get(i);
        if (item) {
          pageData.push(item);
        }
      }

      callback(pageData, total);
    };

    // Cleanup
    return () => {
      try {
        if (grid.isConnected) {
          grid.dataProvider = undefined;
        }
      } catch (error) {
        console.warn('[LazyDataGrid] Error during cleanup:', error);
      }
    };
  }, [columns, total, searchQuery, gridReady]);


  // Format cell value
  const formatCellValue = (value: any): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') return JSON.stringify(value);

    // Check if it's a timestamp and format it
    if (isTimestamp(value)) {
      return formatTimestampValue(value);
    }

    return String(value);
  };

  // Format column header
  const formatColumnHeader = (column: string): string => {
    return column.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  // Renderer for status badges
  const statusRenderer = (root: any, _column: any, model: any) => {
    const value = model.item.status || model.item[_column.path];
    if (!value) {
      root.textContent = '-';
      return;
    }

    const valueLower = String(value).toLowerCase();
    let badgeClass = 'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent';

    if (valueLower === 'normal' || valueLower === 'active' || valueLower === 'completed') {
      badgeClass += ' bg-green-50 text-green-700 border-green-200';
    } else if (valueLower === 'warning' || valueLower === 'pending') {
      badgeClass += ' bg-amber-50 text-amber-700 border-amber-200';
    } else if (valueLower === 'critical' || valueLower === 'error' || valueLower === 'failed') {
      badgeClass += ' bg-red-50 text-red-700 border-red-200';
    } else {
      badgeClass += ' bg-slate-50 text-slate-700 border-slate-200';
    }

    root.innerHTML = `<span class="${badgeClass}">${value}</span>`;
  };

  const exampleQueries = [
    'Detection label counts by week',
    'Most frequent detection per store'
  ];

  const handleExampleQuery = (exampleQuery: string) => {
    setQuery(exampleQuery);
    setSearchQuery(exampleQuery);
    setData([]);
    setColumns([]);
    dataCache.current.clear();
    setError(null);
  };

  return (
    <div className="h-[calc(100vh-180px)] flex flex-col gap-4">
      <Card className="flex-shrink-0">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Data Search</CardTitle>
              <CardDescription>
                Use natural language to search and explore data
              </CardDescription>
            </div>
            <Database className="w-5 h-5 text-slate-400" />
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type="text"
                placeholder="e.g., show me all temperature devices, find sales data, list inventory items..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="submit" disabled={!query.trim() || initialLoading}>
              {initialLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Searching...
                </>
              ) : (
                'Search'
              )}
            </Button>
          </form>

          {/* Example queries */}
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="text-xs text-slate-500">Try:</span>
            {exampleQueries.map((example) => (
              <Button
                key={example}
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => handleExampleQuery(example)}
                disabled={initialLoading}
              >
                {example}
              </Button>
            ))}
          </div>

          {searchQuery && (
            <>
              <div className="mt-4 flex items-center justify-between text-sm text-slate-600 flex-wrap gap-2">
                <span>
                  {initialLoading ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : total > 0 ? (
                    <>
                      Total <span className="font-semibold">{total}</span> results
                    </>
                  ) : null}
                </span>
                <Badge variant="outline">
                  Query: "{searchQuery}"
                </Badge>
              </div>

              {description && !initialLoading && (
                <div className="mt-3 border rounded-lg overflow-hidden bg-slate-50">
                  <button
                    onClick={() => setDescriptionExpanded(!descriptionExpanded)}
                    className="w-full flex items-center justify-between px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Info className="w-4 h-4" />
                      <span>Description</span>
                    </div>
                    {descriptionExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                  {descriptionExpanded && (
                    <div className="px-4 py-3 bg-white border-t">
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{description}</p>
                    </div>
                  )}
                </div>
              )}

              {sqlQuery && !initialLoading && (
                <div className="mt-3 border rounded-lg overflow-hidden bg-slate-50">
                  <button
                    onClick={() => setShowSql(!showSql)}
                    className="w-full flex items-center justify-between px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Code2 className="w-4 h-4" />
                      <span>SQL Query</span>
                    </div>
                    {showSql ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                  {showSql && (
                    <div className="border-t bg-slate-900">
                      <SyntaxHighlighter
                        language="sql"
                        style={vscDarkPlus}
                        customStyle={{
                          margin: 0,
                          padding: '1rem',
                          fontSize: '0.75rem',
                          lineHeight: '1.5',
                        }}
                        showLineNumbers={false}
                      >
                        {format(sqlQuery, {
                          language: 'sql',
                          tabWidth: 2,
                          keywordCase: 'upper',
                          indentStyle: 'standard',
                        })}
                      </SyntaxHighlighter>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive" className="flex-shrink-0">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {initialLoading ? (
        <Card className="flex-1 overflow-hidden">
          <CardContent className="pt-6">
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          </CardContent>
        </Card>
      ) : data.length > 0 && !gridReady ? (
        <Card className="flex-1 overflow-hidden">
          <CardContent className="pt-6">
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          </CardContent>
        </Card>
      ) : data.length > 0 && gridReady && total > 0 ? (
        <Card className="flex-1 overflow-hidden">
          <CardContent className="p-0 h-full">
            <style>{`
              vaadin-grid {
                height: 100%;
                font-family: inherit;
                --lumo-font-family: inherit;
              }
              
              vaadin-grid::part(cell) {
                padding: 0.75rem 1rem;
                font-size: 0.875rem;
                line-height: 1.25rem;
              }
              
              vaadin-grid::part(header-cell) {
                background-color: #ffffff;
                font-weight: 500;
                color: #475569;
                border-bottom: 1px solid #e2e8f0;
                cursor: pointer;
                user-select: none;
                transition: background-color 0.15s ease;
              }
              
              /* Sortable header hover effect */
              vaadin-grid-sorter {
                cursor: pointer;
                width: 100%;
                display: flex;
                align-items: center;
              }
              
              vaadin-grid::part(header-cell):hover {
                background-color: #f8fafc;
              }
              
              /* Sorted column highlight - when actively sorted */
              vaadin-grid-sorter[direction] {
                color: #2563eb;
                font-weight: 600;
              }
              
              /* Sort indicator styling */
              vaadin-grid-sorter::part(indicators) {
                margin-left: 0.5rem;
                color: #2563eb;
              }
              
              vaadin-grid-sorter::part(order) {
                font-size: 0.75rem;
              }
              
              /* Make sort arrows more visible */
              vaadin-grid-sorter[direction]::part(indicators)::before {
                opacity: 1 !important;
              }
              
              vaadin-grid::part(row) {
                border-bottom: 1px solid #f1f5f9;
              }
              
              vaadin-grid::part(row):hover {
                background-color: #f8fafc;
              }
            `}</style>
            <vaadin-grid
              ref={gridRef}
              theme="no-border"
              multi-sort="false"
            >
              <vaadin-grid-column
                path="index"
                header="#"
                width="60px"
                flex-grow="0"
                renderer={(root: any, _column: any, model: any) => {
                  root.textContent = model.index + 1;
                }}
              ></vaadin-grid-column>

              {/* Sortable columns with automatic sort indicators */}
              {columns.map((column) => (
                <vaadin-grid-sort-column
                  key={column}
                  path={column}
                  header={formatColumnHeader(column)}
                  renderer={
                    column === 'status' || column.includes('status')
                      ? statusRenderer
                      : (root: any, _column: any, model: any) => {
                          const value = model.item[column];
                          root.textContent = formatCellValue(value);

                          // Apply styling
                          if (typeof value === 'number' || !isNaN(Number(value))) {
                            root.style.fontFamily = 'monospace';
                          }
                        }
                  }
                />
              ))}
            </vaadin-grid>
          </CardContent>
        </Card>
      ) : searchQuery && !initialLoading && total === 0 ? (
        <Card className="flex-1 flex items-center justify-center">
          <CardContent className="py-12 text-center">
            <Database className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <p className="text-slate-600">No results found for "{searchQuery}"</p>
            {description && (
              <div className="mt-4 max-w-2xl mx-auto">
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{description}</p>
              </div>
            )}
            {!description && (
              <p className="text-sm text-slate-500 mt-2">Try a different search query</p>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
