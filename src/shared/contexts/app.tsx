'use client';

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { getAuthClient } from '@/core/auth/client';
import { envConfigs } from '@/config';
import { Subscription } from '@/shared/models/subscription';
import { User } from '@/shared/models/user';

interface FetchCurrentSubscriptionOptions {
  force?: boolean;
}

interface FetchCurrentSubscriptionResult {
  ok: boolean;
  subscription: Subscription | null;
  hasPaidEntitlement: boolean;
}

export interface ContextValue {
  user: User | null;
  setUser: (user: User | null) => void;
  isCheckSign: boolean;
  setIsCheckSign: (isCheckSign: boolean) => void;
  isShowSignModal: boolean;
  setIsShowSignModal: (show: boolean) => void;
  isShowPaymentModal: boolean;
  setIsShowPaymentModal: (show: boolean) => void;
  configs: Record<string, string>;
  hasFetchedConfigs: boolean;
  fetchConfigs: () => Promise<void>;
  fetchUserCredits: () => Promise<void>;
  fetchUserInfo: () => Promise<void>;
  currentSubscription: Subscription | null;
  hasPaidEntitlement: boolean;
  hasFetchedCurrentSubscription: boolean;
  isFetchingCurrentSubscription: boolean;
  fetchCurrentSubscription: (
    options?: FetchCurrentSubscriptionOptions
  ) => Promise<FetchCurrentSubscriptionResult>;
  showOneTap: (configs: Record<string, string>) => Promise<void>;
}

const AppContext = createContext({} as ContextValue);

export const useAppContext = () => useContext(AppContext);

const CONFIG_FETCH_TTL_MS = 5 * 60 * 1000;
const EMPTY_CONFIGS: Record<string, string> = {};

function normalizeCurrentSubscriptionPayload(data: any): {
  subscription: Subscription | null;
  hasPaidEntitlement: boolean;
} {
  if (
    data &&
    typeof data === 'object' &&
    !Array.isArray(data) &&
    ('subscription' in data || 'hasPaidEntitlement' in data)
  ) {
    const subscription = (data.subscription || null) as Subscription | null;

    return {
      subscription,
      hasPaidEntitlement: Boolean(data.hasPaidEntitlement || subscription),
    };
  }

  const subscription = Array.isArray(data)
    ? null
    : ((data || null) as Subscription | null);

  return {
    subscription,
    hasPaidEntitlement: Boolean(subscription),
  };
}

export const AppContextProvider = ({
  children,
  initialConfigs = EMPTY_CONFIGS,
}: {
  children: ReactNode;
  initialConfigs?: Record<string, string>;
}) => {
  const hasInitialConfigs = Object.keys(initialConfigs).length > 0;
  const [configs, setConfigs] =
    useState<Record<string, string>>(initialConfigs);
  const [hasFetchedConfigs, setHasFetchedConfigs] = useState(hasInitialConfigs);
  const configFetchPromiseRef = useRef<Promise<void> | null>(null);
  const lastConfigFetchAtRef = useRef(hasInitialConfigs ? Date.now() : 0);

  useEffect(() => {
    setConfigs(initialConfigs);
    setHasFetchedConfigs(hasInitialConfigs);
    lastConfigFetchAtRef.current = hasInitialConfigs ? Date.now() : 0;
  }, [hasInitialConfigs, initialConfigs]);

  // sign user
  const [user, setUser] = useState<User | null>(null);
  const userRef = useRef<User | null>(null);
  const [currentSubscription, setCurrentSubscription] =
    useState<Subscription | null>(null);
  const [hasPaidEntitlement, setHasPaidEntitlement] = useState(false);
  const [hasFetchedCurrentSubscription, setHasFetchedCurrentSubscription] =
    useState(false);
  const [isFetchingCurrentSubscription, setIsFetchingCurrentSubscription] =
    useState(false);
  const [
    hasCurrentSubscriptionFetchError,
    setHasCurrentSubscriptionFetchError,
  ] = useState(false);
  const currentSubscriptionRef = useRef<Subscription | null>(null);
  const hasPaidEntitlementRef = useRef(false);
  const subscriptionFetchPromiseRef =
    useRef<Promise<FetchCurrentSubscriptionResult> | null>(null);
  const subscriptionUserIdRef = useRef<string | null>(null);

  // is check sign (true during SSR and initial render to avoid hydration mismatch when auth is enabled)
  const [isCheckSign, setIsCheckSign] = useState(!!envConfigs.auth_secret);

  // show sign modal
  const [isShowSignModal, setIsShowSignModal] = useState(false);

  // show payment modal
  const [isShowPaymentModal, setIsShowPaymentModal] = useState(false);

  const fetchConfigs = useCallback(async () => {
    const now = Date.now();
    const isFresh =
      hasFetchedConfigs &&
      now - lastConfigFetchAtRef.current < CONFIG_FETCH_TTL_MS;

    if (isFresh) {
      return;
    }

    if (configFetchPromiseRef.current) {
      return configFetchPromiseRef.current;
    }

    const request = (async () => {
      try {
        const resp = await fetch('/api/config/get-configs', {
          method: 'POST',
        });
        if (!resp.ok) {
          throw new Error(`fetch failed with status: ${resp.status}`);
        }
        const { code, message, data } = await resp.json();
        if (code !== 0) {
          throw new Error(message);
        }

        setConfigs(data);
        lastConfigFetchAtRef.current = Date.now();
      } catch (e) {
        if (process.env.NODE_ENV !== 'production') {
          console.log('fetch configs failed:', e);
        }
      } finally {
        setHasFetchedConfigs(true);
        configFetchPromiseRef.current = null;
      }
    })();

    configFetchPromiseRef.current = request;
    return request;
  }, [hasFetchedConfigs]);

  const fetchUserCredits = useCallback(async () => {
    try {
      if (!userRef.current) {
        return;
      }

      const resp = await fetch('/api/user/get-user-credits', {
        method: 'POST',
      });
      if (!resp.ok) {
        throw new Error(`fetch failed with status: ${resp.status}`);
      }
      const { code, message, data } = await resp.json();
      if (code !== 0) {
        throw new Error(message);
      }

      setUser((prev) => (prev ? { ...prev, credits: data } : prev));
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('fetch user credits failed:', e);
      }
    }
  }, []);

  const fetchUserInfo = useCallback(async () => {
    try {
      const resp = await fetch('/api/user/get-user-info', {
        method: 'POST',
      });
      if (!resp.ok) {
        throw new Error(`fetch failed with status: ${resp.status}`);
      }
      const { code, message, data } = await resp.json();
      if (code !== 0) {
        throw new Error(message);
      }

      setUser(data);
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('fetch user info failed:', e);
      }
    }
  }, []);

  useEffect(() => {
    currentSubscriptionRef.current = currentSubscription;
  }, [currentSubscription]);

  useEffect(() => {
    hasPaidEntitlementRef.current = hasPaidEntitlement;
  }, [hasPaidEntitlement]);

  const fetchCurrentSubscription = useCallback(
    async (options?: FetchCurrentSubscriptionOptions) => {
      const force = options?.force ?? false;
      const currentUserId = userRef.current?.id || null;

      if (!currentUserId) {
        setCurrentSubscription(null);
        setHasPaidEntitlement(false);
        setHasFetchedCurrentSubscription(true);
        setHasCurrentSubscriptionFetchError(false);
        setIsFetchingCurrentSubscription(false);
        subscriptionFetchPromiseRef.current = null;
        return {
          ok: true,
          subscription: null,
          hasPaidEntitlement: false,
        } satisfies FetchCurrentSubscriptionResult;
      }

      if (
        !force &&
        hasFetchedCurrentSubscription &&
        subscriptionUserIdRef.current === currentUserId
      ) {
        return {
          ok: true,
          subscription: currentSubscriptionRef.current,
          hasPaidEntitlement: hasPaidEntitlementRef.current,
        } satisfies FetchCurrentSubscriptionResult;
      }

      if (subscriptionFetchPromiseRef.current) {
        return subscriptionFetchPromiseRef.current;
      }

      setIsFetchingCurrentSubscription(true);
      setHasCurrentSubscriptionFetchError(false);

      const request = (async () => {
        try {
          const resp = await fetch('/api/subscription/current', {
            method: 'POST',
          });
          if (!resp.ok) {
            throw new Error(`fetch failed with status: ${resp.status}`);
          }

          const { code, message, data } = await resp.json();
          if (code !== 0) {
            throw new Error(message);
          }

          const {
            subscription: nextSubscription,
            hasPaidEntitlement: nextHasPaidEntitlement,
          } = normalizeCurrentSubscriptionPayload(data);
          setCurrentSubscription(nextSubscription);
          setHasPaidEntitlement(nextHasPaidEntitlement);
          setHasFetchedCurrentSubscription(true);

          return {
            ok: true,
            subscription: nextSubscription,
            hasPaidEntitlement: nextHasPaidEntitlement,
          } satisfies FetchCurrentSubscriptionResult;
        } catch (e) {
          if (process.env.NODE_ENV !== 'production') {
            console.log('fetch current subscription failed:', e);
          }

          const fallbackSubscription = currentSubscriptionRef.current;
          const fallbackHasPaidEntitlement =
            hasPaidEntitlementRef.current || Boolean(fallbackSubscription);
          setHasFetchedCurrentSubscription(fallbackHasPaidEntitlement);
          setHasCurrentSubscriptionFetchError(true);

          return {
            ok: fallbackHasPaidEntitlement,
            subscription: fallbackSubscription,
            hasPaidEntitlement: fallbackHasPaidEntitlement,
          } satisfies FetchCurrentSubscriptionResult;
        } finally {
          setIsFetchingCurrentSubscription(false);
          subscriptionFetchPromiseRef.current = null;
        }
      })();

      subscriptionFetchPromiseRef.current = request;
      return request;
    },
    [hasFetchedCurrentSubscription]
  );

  const showOneTap = useCallback(async (configs: Record<string, string>) => {
    try {
      const authClient = getAuthClient(configs);
      await authClient.oneTap({
        callbackURL: '/',
        onPromptNotification: (notification: any) => {
          // Handle prompt dismissal silently
          // This callback is triggered when the prompt is dismissed or skipped
          if (process.env.NODE_ENV !== 'production') {
            console.log('One Tap prompt notification:', notification);
          }
        },
        // fetchOptions: {
        //   onSuccess: () => {
        //     router.push('/');
        //   },
        // },
      });
    } catch (error) {
      // Silently handle One Tap cancellation errors
      // These errors occur when users close the prompt or decline to sign in
      // Common errors: FedCM NetworkError, AbortError, etc.
    }
  }, []);

  useEffect(() => {
    if (!hasFetchedConfigs) {
      void fetchConfigs();
    }
  }, [fetchConfigs, hasFetchedConfigs]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    const currentUserId = user?.id || null;

    if (currentUserId === subscriptionUserIdRef.current) {
      return;
    }

    subscriptionUserIdRef.current = currentUserId;
    setCurrentSubscription(null);
    setHasPaidEntitlement(false);
    setHasFetchedCurrentSubscription(!currentUserId);
    setIsFetchingCurrentSubscription(false);
    setHasCurrentSubscriptionFetchError(false);
    subscriptionFetchPromiseRef.current = null;
  }, [user?.id]);

  useEffect(() => {
    if (
      !user?.id ||
      hasFetchedCurrentSubscription ||
      isFetchingCurrentSubscription ||
      hasCurrentSubscriptionFetchError
    ) {
      return;
    }

    void fetchCurrentSubscription();
  }, [
    fetchCurrentSubscription,
    hasCurrentSubscriptionFetchError,
    hasFetchedCurrentSubscription,
    isFetchingCurrentSubscription,
    user?.id,
  ]);

  const value = useMemo(
    () => ({
      user,
      setUser,
      isCheckSign,
      setIsCheckSign,
      isShowSignModal,
      setIsShowSignModal,
      isShowPaymentModal,
      setIsShowPaymentModal,
      configs,
      hasFetchedConfigs,
      fetchConfigs,
      fetchUserCredits,
      fetchUserInfo,
      currentSubscription,
      hasPaidEntitlement,
      hasFetchedCurrentSubscription,
      isFetchingCurrentSubscription,
      fetchCurrentSubscription,
      showOneTap,
    }),
    [
      user,
      isCheckSign,
      isShowSignModal,
      isShowPaymentModal,
      configs,
      hasFetchedConfigs,
      fetchConfigs,
      fetchUserCredits,
      fetchUserInfo,
      currentSubscription,
      hasPaidEntitlement,
      hasFetchedCurrentSubscription,
      isFetchingCurrentSubscription,
      fetchCurrentSubscription,
      showOneTap,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
