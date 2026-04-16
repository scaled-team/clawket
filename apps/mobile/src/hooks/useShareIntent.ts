import { useEffect, useRef, useState } from 'react';
import { PendingImage } from '../types/chat';

type SharedPayload = { contentType?: string; contentUri?: string; contentMimeType?: string; value?: string };

type ShareHandler = {
  setInput: (text: string) => void;
  setPendingImages: (fn: (prev: PendingImage[]) => PendingImage[]) => void;
};

/**
 * Safe wrapper around expo-sharing's useIncomingShare.
 * Returns empty state when the native module isn't available (Expo Go).
 */
function useSafeIncomingShare(): {
  resolvedSharedPayloads: SharedPayload[];
  isResolving: boolean;
  clearSharedPayloads: () => void;
} {
  const [available] = useState(() => {
    try {
      // Probe whether the native module works — this runs once at mount.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require('expo-sharing');
      // Call the sync native function to check it doesn't throw
      mod.getSharedPayloads?.();
      return true;
    } catch {
      return false;
    }
  });

  if (available) {
    // Safe to call the real hook — native module is present
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useIncomingShare } = require('expo-sharing');
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useIncomingShare();
  }

  // Expo Go fallback — return static empty values
  return { resolvedSharedPayloads: [], isResolving: false, clearSharedPayloads: () => {} };
}

/**
 * Listens for incoming share intents and populates chat composer.
 * Text/URLs → input field, images → pending attachments.
 */
export function useShareIntent(handler: ShareHandler | null) {
  const { resolvedSharedPayloads, isResolving, clearSharedPayloads } = useSafeIncomingShare();
  const handledRef = useRef(false);

  useEffect(() => {
    if (isResolving || !handler || resolvedSharedPayloads.length === 0 || handledRef.current) return;

    handledRef.current = true;
    const texts: string[] = [];
    const images: PendingImage[] = [];

    for (const payload of resolvedSharedPayloads) {
      if (payload.contentType === 'text' || payload.contentType === 'website') {
        // Text or URL
        const value = payload.value;
        if (value) texts.push(value);
        if (payload.contentUri) texts.push(payload.contentUri);
      } else if (payload.contentType === 'image' && payload.contentUri) {
        images.push({
          uri: payload.contentUri,
          base64: '', // Will be read on send if needed
          mimeType: payload.contentMimeType ?? 'image/jpeg',
        });
      } else if (payload.contentUri) {
        // File/video/audio — add as text reference for now
        texts.push(payload.contentUri);
      }
    }

    if (texts.length > 0) {
      handler.setInput(texts.join('\n'));
    }
    if (images.length > 0) {
      handler.setPendingImages((prev) => [...prev, ...images]);
    }

    // Clear after handling
    clearSharedPayloads();
  }, [resolvedSharedPayloads, isResolving, handler, clearSharedPayloads]);

  // Reset handled flag when payloads are cleared
  useEffect(() => {
    if (resolvedSharedPayloads.length === 0) {
      handledRef.current = false;
    }
  }, [resolvedSharedPayloads.length]);
}
