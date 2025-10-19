import { useMutation } from "@apollo/client/react";
import { useCallback, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { REFRESH_TOKEN } from "@/graphql/mutations";
import { decodeJWTPayload } from "@/lib/jwt-utils";

/**
 * Hook pour rafraîchir automatiquement le token JWT avant expiration
 * S'appuie sur les cookies httpOnly exposés par le backend pour renouveler le token
 */
export function useTokenRefresh() {
    const { user, tokenExpiry, login, logout, isLoading, hasAttemptedRefresh, markRefreshAttempt } =
        useAuth();

    const refreshingRef = useRef(false);

    const [executeRefresh] = useMutation<{
        refreshToken: {
            token: string;
            payload: Record<string, unknown>;
            refreshToken?: string | null;
        };
    }>(REFRESH_TOKEN, {
        fetchPolicy: "no-cache",
        onCompleted: (data) => {
            const result = data.refreshToken;

            if (!result) {
                return;
            }

            const { token: newToken, payload, refreshToken: rotatedRefreshToken } = result;

            if (newToken && payload) {
                const refreshedUser = decodeJWTPayload(payload);
                login(newToken, refreshedUser, payload, rotatedRefreshToken ?? null);
                console.log("Token refresh succeeded");
            }
        },
        onError: (error) => {
            console.error("Token refresh failure:", error);
            void logout({ revoke: false });
        },
    });

    const triggerRefresh = useCallback(async () => {
        if (refreshingRef.current) {
            return;
        }

        refreshingRef.current = true;
        try {
            await executeRefresh();
        } catch (error) {
            console.error("Unhandled error during refresh attempt:", error);
        } finally {
            refreshingRef.current = false;
            markRefreshAttempt();
        }
    }, [executeRefresh, markRefreshAttempt]);

    useEffect(() => {
        if (isLoading || refreshingRef.current) {
            return;
        }

        if (!user && !hasAttemptedRefresh) {
            void triggerRefresh();
            return;
        }

        if (user && !hasAttemptedRefresh) {
            markRefreshAttempt();
        }
    }, [isLoading, user, hasAttemptedRefresh, triggerRefresh, markRefreshAttempt]);

    useEffect(() => {
        if (!user) {
            return;
        }

        const REFRESH_THRESHOLD_MS = 5 * 60 * 1000;
        const FALLBACK_REFRESH_MS = 10 * 60 * 1000;

        if (!tokenExpiry) {
            if (!hasAttemptedRefresh) {
                return;
            }

            const fallbackTimeout = window.setTimeout(() => {
                void triggerRefresh();
            }, FALLBACK_REFRESH_MS);

            return () => window.clearTimeout(fallbackTimeout);
        }

        const refreshAt = tokenExpiry - REFRESH_THRESHOLD_MS;
        const delay = refreshAt - Date.now();

        if (delay <= 0) {
            void triggerRefresh();
            return;
        }

        const timeoutId = window.setTimeout(() => {
            void triggerRefresh();
        }, delay);

        return () => window.clearTimeout(timeoutId);
    }, [user, tokenExpiry, hasAttemptedRefresh, triggerRefresh]);
}

/**
 * Composant wrapper pour activer le rafraîchissement automatique du token
 * Placez ce composant dans votre App ou Layout principal
 */
export function TokenRefreshProvider({ children }: { children: React.ReactNode }) {
    useTokenRefresh();
    return <>{children}</>;
}
