/**
 * Push-notification deduplication hook for the Delegate backend.
 *
 * Maintains an in-memory Set<string> with a 60-second sliding expiry window
 * so that duplicate push payloads arriving close together are silently dropped.
 *
 * The last MAX_PERSIST_KEYS keys are persisted to AsyncStorage so that
 * dedup state survives a background-to-foreground cold rehydration within
 * the same short session window.
 *
 * Usage:
 *   const { isDuplicate, markSeen } = useDelegatePushDedup();
 *   if (!isDuplicate(key)) { markSeen(key); handleNotification(key); }
 */

import { useCallback, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const WINDOW_MS = 60_000;       // 60-second sliding expiry
const MAX_PERSIST_KEYS = 50;    // max keys written to AsyncStorage
const STORAGE_KEY = 'push:dedup';

type Entry = { expiresAt: number };

export type DelegatePushDedupResult = {
  isDuplicate: (key: string) => boolean;
  markSeen: (key: string) => void;
};

export function useDelegatePushDedup(): DelegatePushDedupResult {
  // in-memory store: key → { expiresAt }
  const mapRef = useRef<Map<string, Entry>>(new Map());

  // Rehydrate persisted keys on mount (best-effort — ignores errors)
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        const saved: { key: string; expiresAt: number }[] = JSON.parse(raw);
        const now = Date.now();
        for (const { key, expiresAt } of saved) {
          if (expiresAt > now) {
            mapRef.current.set(key, { expiresAt });
          }
        }
      })
      .catch(() => {
        // ignore AsyncStorage read errors — dedup degrades gracefully
      });
  }, []);

  const persist = useCallback(() => {
    const now = Date.now();
    const active = Array.from(mapRef.current.entries())
      .filter(([, entry]) => entry.expiresAt > now)
      .map(([key, entry]) => ({ key, expiresAt: entry.expiresAt }))
      // keep only the most-recent MAX_PERSIST_KEYS by descending expiresAt
      .sort((a, b) => b.expiresAt - a.expiresAt)
      .slice(0, MAX_PERSIST_KEYS);

    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(active)).catch(() => {
      // ignore write errors
    });
  }, []);

  const isDuplicate = useCallback((key: string): boolean => {
    const entry = mapRef.current.get(key);
    if (!entry) return false;
    if (Date.now() >= entry.expiresAt) {
      mapRef.current.delete(key);
      return false;
    }
    return true;
  }, []);

  const markSeen = useCallback(
    (key: string): void => {
      mapRef.current.set(key, { expiresAt: Date.now() + WINDOW_MS });
      persist();
    },
    [persist],
  );

  return { isDuplicate, markSeen };
}
