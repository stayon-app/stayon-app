// Custom hooks for data fetching and state management

import { useState, useEffect, useCallback } from 'react';
import { API, Property, Experience, BlogPost } from '../services/api';

// ============================================
// EXPLORE DATA HOOK
// ============================================

export interface ExploreSection {
  id: string;
  title: string;
  type: string;
  items: Property[] | Experience[] | BlogPost[];
  loading: boolean;
  error: string | null;
}

export function useExploreData(
  location: string,
  tab: 'stays' | 'experiences' | 'blogs'
) {
  const [sections, setSections] = useState<ExploreSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      let result: any;

      if (tab === 'stays') {
        result = await API.getExploreSections(location);
      } else if (tab === 'experiences') {
        result = await API.getExperienceSections(location);
      } else {
        result = await API.getBlogSections(location);
      }

      if (result && result.sections) {
        const mappedSections = result.sections.map((section: any) => ({
          id: section.id,
          title: section.title,
          type: section.type,
          items: section.properties || section.experiences || section.blogs || [],
          loading: false,
          error: null,
        }));

        setSections(mappedSections);

        // If no sections returned, it means no data for this location
        if (mappedSections.length === 0) {
          setError(`No ${tab} available in ${location}`);
        }
      } else {
        setError(`Unable to load ${tab} for ${location}`);
      }
    } catch (err: any) {
      console.error('Fetch error:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [location, tab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refresh = useCallback(() => {
    fetchData(true);
  }, [fetchData]);

  return {
    sections,
    loading,
    error,
    refreshing,
    refresh,
  };
}

// ============================================
// LOCATION DETECTION HOOK
// ============================================

export function useLocationDetection() {
  const [location, setLocation] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [coordinates, setCoordinates] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  useEffect(() => {
    async function detectLocation() {
      setLoading(true);
      try {
        const locationData = await API.detectUserLocation();
        if (locationData) {
          setLocation(locationData.city);
          setCoordinates({
            latitude: locationData.latitude,
            longitude: locationData.longitude,
          });
        }
      } catch (error) {
        console.error('Location detection error:', error);
        // Fallback to default
        setLocation('Dubai');
      } finally {
        setLoading(false);
      }
    }

    detectLocation();
  }, []);

  return {
    location,
    coordinates,
    loading,
    setLocation,
  };
}

// ============================================
// SEARCH HOOK
// ============================================

export function useSearch() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (
    type: 'properties' | 'experiences' | 'blogs',
    params: any
  ) => {
    setLoading(true);
    setError(null);

    try {
      let result: any;

      if (type === 'properties') {
        result = await API.searchProperties(params);
        setResults(result.properties || []);
      } else if (type === 'experiences') {
        result = await API.searchExperiences(params);
        setResults(result.experiences || []);
      } else {
        result = await API.searchBlogs(params);
        setResults(result.blogs || []);
      }

      if (result.total === 0) {
        setError('No results found');
      }
    } catch (err: any) {
      setError(err.message || 'Search failed');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    results,
    loading,
    error,
    search,
  };
}

// ============================================
// FAVORITES HOOK
// ============================================

export function useFavorites(userId?: string) {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    async function loadFavorites() {
      try {
        const favoriteIds = await API.getFavorites(userId as string);
        setFavorites(favoriteIds);
      } catch (error) {
        console.error('Failed to load favorites:', error);
      } finally {
        setLoading(false);
      }
    }

    loadFavorites();
  }, [userId]);

  const toggleFavorite = useCallback(
    async (contentId: string, contentType: 'property' | 'experience' | 'blog') => {
      if (!userId) return;

      // Optimistic update
      setFavorites(prev =>
        prev.includes(contentId)
          ? prev.filter(id => id !== contentId)
          : [...prev, contentId]
      );

      try {
        const isFavorite = await API.toggleFavorite(userId, contentId, contentType);
        
        // Sync with server response
        setFavorites(prev =>
          isFavorite && !prev.includes(contentId)
            ? [...prev, contentId]
            : !isFavorite
            ? prev.filter(id => id !== contentId)
            : prev
        );
      } catch (error) {
        console.error('Failed to toggle favorite:', error);
        // Revert on error
        setFavorites(prev =>
          prev.includes(contentId)
            ? prev.filter(id => id !== contentId)
            : [...prev, contentId]
        );
      }
    },
    [userId]
  );

  return {
    favorites,
    loading,
    toggleFavorite,
    isFavorite: (id: string) => favorites.includes(id),
  };
}
