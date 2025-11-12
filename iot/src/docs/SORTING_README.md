# Server-Side Sorting in Vaadin Grid

This document explains how server-side sorting is implemented in the RaceTrac IoT Dashboard's Data Search feature.

## Overview

The Data Search page uses **Vaadin Grid** with **server-side sorting**, meaning all sorting operations are performed by the backend API, not in the browser. This ensures efficient handling of large datasets.

### Implementation Details

- **Grid Component**: `<vaadin-grid>` from `@vaadin/grid` package
- **Sortable Columns**: `<vaadin-grid-column sortable>` attribute
- **Auto-Created Sorter**: Vaadin automatically creates `<vaadin-grid-sorter>` elements
- **Event-Driven**: Sort changes trigger `sorter-changed` events
- **No Additional Imports**: All sorting functionality included in base `@vaadin/grid`

## How It Works

### 1. User Interaction
- User clicks on any column header in the grid
- **First click**: Sort **ascending** (↑)
- **Second click**: Sort **descending** (↓)  
- **Third click**: Remove sorting (return to default)

**Visual Cues:**
- Cursor changes to pointer on hover over headers
- Header background highlights on hover
- Sort direction indicator (↑/↓) appears next to column name
- Active sorted column shown in blue
- Helpful tip shown when no sorting is active

### 2. Frontend Flow

#### a. Sort Event Capture
When a user clicks a column header, the Vaadin Grid fires a `sorter-changed` event:

```typescript
grid.addEventListener('sorter-changed', handleSortChanged);
```

#### b. State Management
The event handler updates React state with the sort column and direction:

```typescript
setSortColumn(sorter.path);        // e.g., "temperature"
setSortDirection(sorter.direction); // "asc" or "desc"
```

#### c. Cache Invalidation
The data cache is cleared to force fresh data from the server:

```typescript
dataCache.current.clear();
setData([]);
```

#### d. Server Request
The grid's data provider makes a new request with sort parameters:

```typescript
const response = await searchData({
  query: searchQuery,
  limit: 50,
  offset: 0,
  sortColumn: "temperature",
  sortDirection: "desc"
});
```

### 3. Backend API Call

The search service sends sort parameters to the backend:

**API Endpoint:** `GET /api/search`

**Query Parameters:**
```
q=show me all temperature devices
limit=50
offset=0
sort_column=temperature
sort_direction=desc
```

### 4. Backend Processing (Mock Implementation)

In development mode, the mock data generator:

1. Generates all records
2. Applies sorting based on `sort_column` and `sort_direction`
3. Returns the requested page of sorted data

```typescript
// Sort the data
if (sortColumn && columns.includes(sortColumn)) {
  allData.sort((a, b) => {
    const aVal = a[sortColumn];
    const bVal = b[sortColumn];
    
    let comparison = 0;
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      comparison = aVal - bVal;
    } else {
      comparison = String(aVal).localeCompare(String(bVal));
    }
    
    return sortDirection === 'desc' ? -comparison : comparison;
  });
}

// Return paginated results
const data = allData.slice(offset, offset + limit);
```

### 5. Production Implementation

For production, your backend should:

1. **Receive sort parameters** via query string:
   - `sort_column`: The column name to sort by
   - `sort_direction`: Either `asc` or `desc`

2. **Apply sorting in SQL query**:
   ```sql
   SELECT * FROM devices 
   WHERE [conditions]
   ORDER BY temperature DESC
   LIMIT 50 OFFSET 0
   ```

3. **Return paginated results** in the same format

## Visual Indicators

### Active Sort Badge
When a sort is active, a blue badge appears showing:
- Sort column name
- Sort direction (↑ for ascending, ↓ for descending)

Example: `Sorted by: Temperature (↓)`

### Interactive Headers
Column headers provide visual feedback:
- **Cursor**: Changes to pointer on hover
- **Background**: Light gray highlight on hover
- **Sorted Column**: Appears in blue (#2563eb)
- **Sort Icon**: Arrow indicator shows direction
- **Tooltip**: "Click to sort" hint on hover

### Helper Message
When no sorting is active, a helpful tip is displayed:
```
💡 Tip: Click any column header to sort the results
```

This disappears once user starts sorting.

### Console Logging
The following logs help verify server-side sorting:

```
[LazyDataGrid] Loading data with sort: { sortColumn: 'temperature', sortDirection: 'desc', newQuery: true }
[searchService] Applying server-side sort: temperature desc
[searchService] Sort complete. First 3 values: [95.2, 94.8, 92.1]
```

## Key Features

✅ **Efficient**: Only sorted data for the current page is transferred  
✅ **Scalable**: Works with millions of records  
✅ **Lazy Loading**: Data loads on-demand as you scroll  
✅ **Virtual Scrolling**: Only visible rows are rendered  
✅ **Automatic Caching**: Previously loaded pages are cached  
✅ **Cache Invalidation**: Cache clears when sort changes  

## API Specification

### Request Format
```http
GET /api/search?q={query}&limit={limit}&offset={offset}&sort_column={column}&sort_direction={direction}
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| q | string | Yes | Natural language search query |
| limit | integer | Yes | Number of records to return (1-1000) |
| offset | integer | Yes | Number of records to skip |
| sort_column | string | No | Column name to sort by |
| sort_direction | enum | No | Sort direction: `asc` or `desc` |

### Response Format
```json
{
  "columns": ["device_id", "location", "temperature", "status"],
  "data": [
    {
      "device_id": "RT-001",
      "location": "Atlanta, GA",
      "temperature": 95.2,
      "status": "critical"
    }
  ],
  "total": 500,
  "offset": 0,
  "limit": 50,
  "hasMore": true
}
```

## Testing Sorting

1. Navigate to the **Data Search** page
2. Run a search (e.g., "show me all temperature devices")
3. Click on any column header to sort
4. Open browser console to see sort logs
5. Verify the blue "Sorted by" badge appears
6. Scroll through the data to verify sorting is maintained
7. Click the column again to reverse sort direction
8. Click a third time to clear sorting

## Supported Column Types

- **Numeric**: Temperature, humidity, amounts (numeric comparison)
- **Text**: Device IDs, locations, names (alphabetical)
- **Dates**: Timestamps (chronological)
- **Status**: Normal, warning, critical (alphabetical)

## Performance Considerations

- **Server-side sorting** is essential for large datasets (>1000 records)
- **Database indexes** should be created on frequently sorted columns
- **Sorting numeric columns** is faster than text columns
- **Combined with pagination** to limit data transfer
- **Cache invalidation** ensures fresh data on sort changes

## File Locations

- **Grid Component**: `/components/LazyDataGrid.tsx`
- **Search Service**: `/services/searchService.ts`
- **API Specification**: `/openapi.yaml` (lines 547-571)
- **Configuration**: `/services/config.ts`

## Troubleshooting

### Sort not working?
1. Check console logs for sort parameters
2. Verify `sortColumn` matches a column in the dataset
3. Ensure backend supports `sort_column` and `sort_direction` parameters

### Data not updating after sort?
1. Verify cache is being cleared
2. Check that `sortColumn` and `sortDirection` are in the dependency array
3. Ensure grid's `clearCache()` is being called

### Wrong sort order?
1. Check if column contains numeric or text data
2. Verify `sortDirection` is correctly set (`asc` vs `desc`)
3. Review backend sorting logic

## Future Enhancements

- [ ] Multi-column sorting
- [ ] Save sort preferences
- [ ] Custom sort orders for status fields
- [ ] Sort by calculated/aggregated columns
- [ ] Sort indicators in column headers
