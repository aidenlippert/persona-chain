/**
 * React 18 Concurrent Features Hook
 * Implements startTransition, useDeferredValue, and concurrent rendering optimizations
 */

import { useState, useTransition, useDeferredValue, useCallback, useMemo } from 'react';

export interface ConcurrentState<T> {
  data: T;
  isPending: boolean;
  error: Error | null;
}

export interface ConcurrentActions<T> {
  updateData: (newData: T | ((prev: T) => T)) => void;
  startTransition: (callback: () => void) => void;
  deferredData: T;
  resetError: () => void;
}

/**
 * Enhanced hook that combines React 18 concurrent features
 */
export function useConcurrentFeatures<T>(
  initialData: T,
  options: {
    enableDeferred?: boolean;
    optimistic?: boolean;
    errorRecovery?: boolean;
  } = {}
): [ConcurrentState<T>, ConcurrentActions<T>] {
  const { enableDeferred = true, optimistic = false, errorRecovery = true } = options;

  const [data, setData] = useState<T>(initialData);
  const [error, setError] = useState<Error | null>(null);
  const [isPending, startTransition] = useTransition();

  // Deferred value for less urgent updates
  const deferredData = enableDeferred ? useDeferredValue(data) : data;

  // Optimistic updates for better UX
  const updateData = useCallback((newData: T | ((prev: T) => T)) => {
    try {
      if (optimistic) {
        // Immediate optimistic update
        setData(newData);
        setError(null);
      } else {
        // Use transition for non-urgent updates
        startTransition(() => {
          setData(newData);
          setError(null);
        });
      }
    } catch (err) {
      if (errorRecovery) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
        // Revert to previous state on error
        setData(initialData);
      } else {
        throw err;
      }
    }
  }, [optimistic, errorRecovery, initialData, startTransition]);

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  const wrappedStartTransition = useCallback((callback: () => void) => {
    startTransition(callback);
  }, [startTransition]);

  const state = useMemo((): ConcurrentState<T> => ({
    data,
    isPending,
    error,
  }), [data, isPending, error]);

  const actions = useMemo((): ConcurrentActions<T> => ({
    updateData,
    startTransition: wrappedStartTransition,
    deferredData,
    resetError,
  }), [updateData, wrappedStartTransition, deferredData, resetError]);

  return [state, actions];
}

/**
 * Hook for managing concurrent list operations
 */
export function useConcurrentList<T>(
  initialItems: T[] = [],
  keyExtractor: (item: T) => string | number = (_, index) => index
) {
  const [{ data: items, isPending, error }, { updateData, startTransition }] = 
    useConcurrentFeatures<T[]>(initialItems, { enableDeferred: true });

  const addItem = useCallback((item: T) => {
    startTransition(() => {
      updateData(prev => [...prev, item]);
    });
  }, [updateData, startTransition]);

  const removeItem = useCallback((key: string | number) => {
    startTransition(() => {
      updateData(prev => prev.filter(item => keyExtractor(item) !== key));
    });
  }, [updateData, startTransition, keyExtractor]);

  const updateItem = useCallback((key: string | number, updater: (item: T) => T) => {
    startTransition(() => {
      updateData(prev => prev.map(item => 
        keyExtractor(item) === key ? updater(item) : item
      ));
    });
  }, [updateData, startTransition, keyExtractor]);

  const clearItems = useCallback(() => {
    startTransition(() => {
      updateData([]);
    });
  }, [updateData, startTransition]);

  const moveItem = useCallback((fromIndex: number, toIndex: number) => {
    startTransition(() => {
      updateData(prev => {
        const newItems = [...prev];
        const [movedItem] = newItems.splice(fromIndex, 1);
        newItems.splice(toIndex, 0, movedItem);
        return newItems;
      });
    });
  }, [updateData, startTransition]);

  return {
    items,
    isPending,
    error,
    addItem,
    removeItem,
    updateItem,
    clearItems,
    moveItem,
  };
}

/**
 * Hook for managing concurrent form state
 */
export function useConcurrentForm<T extends Record<string, any>>(
  initialFormData: T,
  options: {
    validateOnChange?: boolean;
    optimisticUpdates?: boolean;
  } = {}
) {
  const { validateOnChange = false, optimisticUpdates = true } = options;
  
  const [{ data: formData, isPending, error }, { updateData, startTransition }] = 
    useConcurrentFeatures<T>(initialFormData, { 
      optimistic: optimisticUpdates,
      errorRecovery: true 
    });

  const [validationErrors, setValidationErrors] = useState<Partial<Record<keyof T, string>>>({});

  const updateField = useCallback(<K extends keyof T>(
    field: K, 
    value: T[K],
    validator?: (value: T[K]) => string | null
  ) => {
    if (optimisticUpdates) {
      // Immediate update for better UX
      updateData(prev => ({ ...prev, [field]: value }));
      
      // Validate in transition
      if (validateOnChange && validator) {
        startTransition(() => {
          const error = validator(value);
          setValidationErrors(prev => ({
            ...prev,
            [field]: error || undefined
          }));
        });
      }
    } else {
      startTransition(() => {
        updateData(prev => ({ ...prev, [field]: value }));
        
        if (validateOnChange && validator) {
          const error = validator(value);
          setValidationErrors(prev => ({
            ...prev,
            [field]: error || undefined
          }));
        }
      });
    }
  }, [updateData, startTransition, validateOnChange, optimisticUpdates]);

  const resetForm = useCallback(() => {
    startTransition(() => {
      updateData(initialFormData);
      setValidationErrors({});
    });
  }, [updateData, startTransition, initialFormData]);

  const validateForm = useCallback((validators: Partial<Record<keyof T, (value: T[keyof T]) => string | null>>) => {
    startTransition(() => {
      const errors: Partial<Record<keyof T, string>> = {};
      
      Object.entries(validators).forEach(([field, validator]) => {
        if (validator && typeof validator === 'function') {
          const error = validator(formData[field as keyof T]);
          if (error) {
            errors[field as keyof T] = error;
          }
        }
      });
      
      setValidationErrors(errors);
    });
    
    return Object.keys(validationErrors).length === 0;
  }, [formData, validationErrors, startTransition]);

  return {
    formData,
    isPending,
    error,
    validationErrors,
    updateField,
    resetForm,
    validateForm,
    isValid: Object.keys(validationErrors).length === 0,
  };
}

/**
 * Hook for managing concurrent search/filter operations
 */
export function useConcurrentSearch<T>(
  items: T[],
  searchFn: (item: T, query: string) => boolean,
  options: {
    debounceMs?: number;
    maxResults?: number;
  } = {}
) {
  const { debounceMs = 300, maxResults = 100 } = options;
  
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<T[]>(items);
  const [isPending, startTransition] = useTransition();
  
  const deferredQuery = useDeferredValue(query);

  // Perform search in a transition
  const performSearch = useCallback(() => {
    startTransition(() => {
      if (!deferredQuery.trim()) {
        setResults(items.slice(0, maxResults));
        return;
      }

      const filtered = items
        .filter(item => searchFn(item, deferredQuery))
        .slice(0, maxResults);
      
      setResults(filtered);
    });
  }, [items, deferredQuery, searchFn, maxResults, startTransition]);

  // Debounced search trigger
  useState(() => {
    const timer = setTimeout(performSearch, debounceMs);
    return () => clearTimeout(timer);
  });

  const updateQuery = useCallback((newQuery: string) => {
    setQuery(newQuery);
  }, []);

  const clearQuery = useCallback(() => {
    setQuery('');
    startTransition(() => {
      setResults(items.slice(0, maxResults));
    });
  }, [items, maxResults, startTransition]);

  return {
    query,
    results,
    isPending,
    updateQuery,
    clearQuery,
    hasResults: results.length > 0,
    resultCount: results.length,
  };
}

export default useConcurrentFeatures;