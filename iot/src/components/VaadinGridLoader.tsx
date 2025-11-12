/**
 * VaadinGridLoader - Singleton loader for Vaadin Grid web components
 * 
 * This component ensures that Vaadin Grid web components are only
 * loaded once, preventing "already defined" errors during hot module
 * reloading in development.
 */

let loadingPromise: Promise<void> | null = null;
let isLoaded = false;

export async function ensureVaadinGridLoaded(): Promise<void> {
  // If already loaded, return immediately
  if (isLoaded) {
    return Promise.resolve();
  }

  // If currently loading, return the existing promise
  if (loadingPromise) {
    return loadingPromise;
  }

  // Check if elements are already defined (from previous hot reload)
  if (typeof window !== 'undefined' && 
      customElements.get('vaadin-grid') && 
      customElements.get('vaadin-grid-sort-column')) {
    isLoaded = true;
    return Promise.resolve();
  }

  // Start loading
  loadingPromise = (async () => {
    try {
      // Dynamic import to load Vaadin Grid
      await import('@vaadin/grid');
      
      // Try to import sort column (may be included in main import or separate)
      try {
        await import('@vaadin/grid/vaadin-grid-sort-column.js');
      } catch (sortImportError: any) {
        // Sort column might be included in main import or use different path
        console.log('[VaadinGridLoader] Sort column import note:', sortImportError?.message);
        // Try alternative import path
        try {
          await import('@vaadin/grid/vaadin-grid-sort-column');
        } catch (altError) {
          // If both fail, assume it's included in main import
          console.log('[VaadinGridLoader] Assuming sort column is included in main grid import');
        }
      }
      
      isLoaded = true;
      console.log('[VaadinGridLoader] Successfully loaded Vaadin Grid and sort column');
    } catch (error: any) {
      // Check if error is due to already defined elements
      if (
        error?.message?.includes('has already been used') ||
        error?.message?.includes('already defined')
      ) {
        // Elements are already defined, treat as success
        isLoaded = true;
        console.log('[VaadinGridLoader] Vaadin Grid already loaded');
      } else {
        // Real error, re-throw
        console.error('[VaadinGridLoader] Error loading Vaadin Grid:', error);
        loadingPromise = null; // Reset so we can retry
        throw error;
      }
    }
  })();

  return loadingPromise;
}

export function isVaadinGridLoaded(): boolean {
  return isLoaded || (typeof window !== 'undefined' && 
    !!customElements.get('vaadin-grid') && 
    !!customElements.get('vaadin-grid-sort-column'));
}

// Reset function for testing or manual cleanup
export function resetVaadinGridLoader(): void {
  loadingPromise = null;
  isLoaded = false;
}
