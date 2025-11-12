# Sorting Feature - Testing Guide

## Quick Test Checklist

Follow these steps to verify the header sorting functionality is working correctly:

### ✅ Test 1: Visual Indicators

1. **Navigate** to the Data Search page
2. **Run a search**: Try "show me all temperature devices"
3. **Observe** the helper message:
   ```
   💡 Tip: Click any column header to sort the results
   ```
4. **Hover** over any column header
   - ✅ Cursor should change to pointer
   - ✅ Header background should highlight (light gray)

### ✅ Test 2: Ascending Sort

1. **Click** on the "Temperature" column header
2. **Verify**:
   - ✅ Helper tip disappears
   - ✅ "Sorting..." badge appears briefly with spinner
   - ✅ Blue badge appears: "Sorted by: Temperature (↑)"
   - ✅ Temperature column header shows blue color
   - ✅ Up arrow (↑) appears next to column name
3. **Check console** for logs:
   ```
   [LazyDataGrid] Sort event triggered: [...]
   [LazyDataGrid] Sorting by: temperature asc
   [searchService] Applying server-side sort: temperature asc
   ```
4. **Verify data**: Lowest temperature should be at the top

### ✅ Test 3: Descending Sort

1. **Click** the same column header again
2. **Verify**:
   - ✅ "Sorting..." badge appears briefly
   - ✅ Badge updates to: "Sorted by: Temperature (↓)"
   - ✅ Down arrow (↓) appears next to column name
3. **Check console**:
   ```
   [LazyDataGrid] Sorting by: temperature desc
   ```
4. **Verify data**: Highest temperature should be at the top

### ✅ Test 4: Clear Sort

1. **Click** the same column header a third time
2. **Verify**:
   - ✅ Sort badge disappears
   - ✅ Column returns to normal color
   - ✅ Helper tip reappears
   - ✅ Data returns to original order
3. **Check console**:
   ```
   [LazyDataGrid] Clearing sort
   ```

### ✅ Test 5: Multiple Columns

1. **Sort** by "Temperature" (ascending)
2. **Click** on "Device ID" column
3. **Verify**:
   - ✅ Badge updates to: "Sorted by: Device Id (↑)"
   - ✅ Temperature column loses blue highlight
   - ✅ Device ID column gains blue highlight
   - ✅ Data re-sorts by Device ID
4. **Try** other columns:
   - Location (text sort)
   - Humidity (numeric sort)
   - Timestamp (date sort)
   - Status (alphabetical sort)

### ✅ Test 6: Pagination + Sort

1. **Sort** by any column
2. **Scroll down** to load more pages
3. **Verify**:
   - ✅ All pages maintain sort order
   - ✅ No duplicate records
   - ✅ Sort order consistent across pages
4. **Check console** for each page load:
   ```
   [LazyDataGrid] Fetching page data with sort: { sortColumn: '...', sortDirection: '...' }
   ```

### ✅ Test 7: New Search + Sort

1. **Perform** a search
2. **Sort** by a column
3. **Perform** a different search
4. **Verify**:
   - ✅ Sort is cleared on new search
   - ✅ Helper tip reappears
   - ✅ Old sort badge removed

### ✅ Test 8: Hot Reload (Dev Only)

1. **Sort** by a column
2. **Edit** and save `LazyDataGrid.tsx`
3. **Wait** for hot reload
4. **Verify**:
   - ✅ No console errors
   - ✅ Grid still works
   - ✅ Sorting still works
   - ✅ No "already been used with this registry" errors

## Expected Console Output

### Successful Sort Operation

```
[LazyDataGrid] Sort event triggered: [{path: 'temperature', direction: 'asc'}]
[LazyDataGrid] Sorting by: temperature asc
[LazyDataGrid] Sort state updated, cache cleared
[LazyDataGrid] Loading data with sort: { sortColumn: 'temperature', sortDirection: 'asc', newQuery: true }
[searchService] Applying server-side sort: temperature asc
[searchService] Sort complete. First 3 values: [15.2, 18.5, 22.1]
```

### Clear Sort Operation

```
[LazyDataGrid] Sort event triggered: []
[LazyDataGrid] Clearing sort
[LazyDataGrid] Loading data with sort: { sortColumn: undefined, sortDirection: 'asc', newQuery: true }
```

## Visual States

### Default State (No Sort)
```
┌─────────────────────────────────────────────┐
│ 💡 Tip: Click any column header to sort    │
└─────────────────────────────────────────────┘

┌───┬────────┬──────────┬─────────┐
│ # │ Device │ Location │ Temp    │  ← Hover shows pointer cursor
├───┼────────┼──────────┼─────────┤
│ 1 │ RT-001 │ Atlanta  │ 72.5°F  │
│ 2 │ RT-002 │ Houston  │ 85.1°F  │
```

### Sorting State (Brief)
```
┌─────────────────────────────────────────────┐
│ ⏳ Sorting...                               │
└─────────────────────────────────────────────┘
```

### Sorted State
```
┌─────────────────────────────────────────────┐
│ Sorted by: Temperature (↑)                  │
└─────────────────────────────────────────────┘

┌───┬────────┬──────────┬─────────┐
│ # │ Device │ Location │ Temp ↑  │  ← Blue header with arrow
├───┼────────┼──────────┼─────────┤
│ 1 │ RT-005 │ Seattle  │ 15.2°F  │
│ 2 │ RT-012 │ Chicago  │ 18.5°F  │
```

## Common Issues & Solutions

### Issue: Header doesn't look clickable

**Solution**: Check CSS in LazyDataGrid.tsx:
```css
vaadin-grid::part(header-cell) {
  cursor: pointer;  /* Must be present */
  user-select: none;
}
```

### Issue: Sort not triggering

**Possible Causes**:
1. Vaadin Grid not loaded (check `gridReady` state)
2. Event listener not attached
3. Column not using `vaadin-grid-sort-column`

**Check Console For**:
- `[VaadinGridLoader] Successfully loaded Vaadin Grid`
- No registration errors

### Issue: Sort works but data doesn't change

**Possible Causes**:
1. Backend not receiving sort parameters
2. Mock data generator not applying sort
3. Cache not being cleared

**Verify**:
```javascript
// Should see in console:
[searchService] Applying server-side sort: temperature asc
[searchService] Sort complete. First 3 values: [...]
```

### Issue: Multiple sorts active at once

**Expected Behavior**: Only one column should be sorted at a time. If multiple columns show sort indicators, there's a bug.

**Check**: `sorters.length` should always be 0 or 1 in `handleSortChanged`

## Performance Metrics

Expected timing for sort operations:

- **Initial Sort**: < 200ms (includes cache clear + data fetch)
- **Toggle Sort**: < 150ms (cached columns)
- **Page Load**: < 100ms per page (with sort)
- **Clear Sort**: < 100ms

Monitor in console:
```
[searchService] Response time: 45ms
```

## Browser Compatibility

Test in multiple browsers:

- ✅ **Chrome 90+**: Full support
- ✅ **Firefox 88+**: Full support
- ✅ **Safari 14+**: Full support
- ✅ **Edge 90+**: Full support

## Mobile Testing (Optional)

If testing on mobile/tablet:

1. Tap column header
2. Should see sort change
3. Touch feedback should be visible
4. Headers should be easily tappable (adequate size)

## API Verification (Production)

When testing with real backend:

### Request Verification
```bash
# Check network tab
GET /api/search?q=temperature&sort_column=temperature&sort_direction=desc
```

### Response Verification
```json
{
  "columns": ["device_id", "temperature"],
  "data": [
    {"device_id": "RT-001", "temperature": 95.2},
    {"device_id": "RT-002", "temperature": 92.5}
  ],
  "total": 500
}
```

Data should be pre-sorted by backend, not browser.

## Success Criteria

All tests pass if:

- ✅ Headers are visually clickable (cursor, hover effect)
- ✅ Clicking cycles through: asc → desc → none
- ✅ Visual indicators appear (badge, arrow, color)
- ✅ Console logs show server-side sorting
- ✅ Data order changes correctly
- ✅ Sorting persists across pagination
- ✅ No errors during hot reload
- ✅ Performance is acceptable (< 200ms)

## Automated Testing (Future)

Suggested E2E test cases:

```typescript
test('should sort column on header click', async () => {
  await page.click('[path="temperature"]');
  await expect(page.locator('.badge')).toContainText('Sorted by: Temperature');
  const firstValue = await page.locator('vaadin-grid-cell-content').first().textContent();
  // Assert first value is lowest
});

test('should toggle sort direction', async () => {
  await page.click('[path="temperature"]'); // asc
  await page.click('[path="temperature"]'); // desc
  await expect(page.locator('.badge')).toContainText('(↓)');
});

test('should clear sort on third click', async () => {
  await page.click('[path="temperature"]'); // asc
  await page.click('[path="temperature"]'); // desc
  await page.click('[path="temperature"]'); // clear
  await expect(page.locator('.badge')).toBeHidden();
});
```

## Support

If you encounter issues not covered here:

1. Check `/docs/SORTING_README.md` for architecture details
2. Check `/docs/VAADIN_GRID_FIX.md` for component loading issues
3. Review console logs for error messages
4. Verify Vaadin Grid version is compatible
5. Check OpenAPI spec for backend API contract

---

**Last Updated**: 2025-10-29  
**Component**: LazyDataGrid.tsx  
**Feature Version**: 2.0
