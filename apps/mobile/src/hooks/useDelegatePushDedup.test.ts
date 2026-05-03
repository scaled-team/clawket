import { renderHook, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDelegatePushDedup } from './useDelegatePushDedup';

const mockGetItem = AsyncStorage.getItem as jest.MockedFunction<typeof AsyncStorage.getItem>;
const mockSetItem = AsyncStorage.setItem as jest.MockedFunction<typeof AsyncStorage.setItem>;

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  mockGetItem.mockResolvedValue(null);
  mockSetItem.mockResolvedValue();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useDelegatePushDedup', () => {
  it('returns false for an unseen key and true after markSeen', () => {
    const { result } = renderHook(() => useDelegatePushDedup());

    expect(result.current.isDuplicate('key-abc')).toBe(false);

    act(() => {
      result.current.markSeen('key-abc');
    });

    expect(result.current.isDuplicate('key-abc')).toBe(true);
  });

  it('returns false again after the 60-second window expires', () => {
    const { result } = renderHook(() => useDelegatePushDedup());

    act(() => {
      result.current.markSeen('key-ttl');
    });

    expect(result.current.isDuplicate('key-ttl')).toBe(true);

    // Advance past the 60-second window
    act(() => {
      jest.advanceTimersByTime(60_001);
    });

    expect(result.current.isDuplicate('key-ttl')).toBe(false);
  });

  it('persists seen keys to AsyncStorage on markSeen', async () => {
    const { result } = renderHook(() => useDelegatePushDedup());

    await act(async () => {
      result.current.markSeen('key-persist');
      // flush microtasks so the async setItem resolves
      await Promise.resolve();
    });

    expect(mockSetItem).toHaveBeenCalledWith(
      'push:dedup',
      expect.stringContaining('key-persist'),
    );
  });

  it('rehydrates persisted keys from AsyncStorage on mount', async () => {
    const futureExpiry = Date.now() + 30_000;
    mockGetItem.mockResolvedValue(
      JSON.stringify([{ key: 'key-hydrate', expiresAt: futureExpiry }]),
    );

    const { result } = renderHook(() => useDelegatePushDedup());

    // Wait for the useEffect to run and AsyncStorage.getItem to resolve
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.isDuplicate('key-hydrate')).toBe(true);
  });
});
