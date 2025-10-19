import { useApolloClient } from "@apollo/client/react";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from "react";
import {
    DELETE_REFRESH_TOKEN_COOKIE,
    DELETE_TOKEN_COOKIE,
    REVOKE_TOKEN,
} from "@/graphql/mutations";
import { parseJWT } from "@/lib/jwt-utils";

export interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    isAdmin: boolean;
    isManager: boolean;
    phoneNumber?: string;
    teamId?: string;
    teamManagedId?: string;
    hourContract?: number;
}

type StoredUserShape = Omit<User, "isManager"> & { isManager?: boolean };

interface AuthContextType {
    user: User | null;
    token: string | null;
    tokenExpiry: number | null;
    refreshToken: string | null;
    hasAttemptedRefresh: boolean;
    markRefreshAttempt: () => void;
    login: (
        token: string | null,
        user: User,
        payload?: Record<string, unknown>,
        refreshToken?: string | null,
    ) => void;
    logout: (options?: { revoke?: boolean }) => Promise<void>;
    isAuthenticated: boolean;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [tokenExpiry, setTokenExpiry] = useState<number | null>(null);
    const [refreshToken, setRefreshToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [hasAttemptedRefresh, setHasAttemptedRefresh] = useState(false);
    const client = useApolloClient();

    const persistTokenExpiry = (value: number | null) => {
        if (value !== null) {
            sessionStorage.setItem("tokenExpiry", String(value));
        } else {
            sessionStorage.removeItem("tokenExpiry");
        }
    };

    const persistRefreshToken = (value: string | null) => {
        if (value) {
            sessionStorage.setItem("refreshToken", value);
        } else {
            sessionStorage.removeItem("refreshToken");
        }
    };

    const resolveTokenExpiration = (
        rawToken: string | null,
        payload?: Record<string, unknown>,
    ): number | null => {
        const normalizeExp = (input: unknown): number | null => {
            if (typeof input !== "number" && typeof input !== "string") {
                return null;
            }

            const parsed = Number(input);

            if (!Number.isFinite(parsed)) {
                return null;
            }

            // Les valeurs inférieures à 1e12 sont considérées comme des timestamps en secondes
            return parsed > 1_000_000_000_000 ? Math.floor(parsed) : Math.floor(parsed * 1000);
        };

        const expFromPayload =
            payload && typeof payload === "object" && "exp" in payload
                ? normalizeExp((payload as { exp?: unknown }).exp)
                : null;
        if (expFromPayload !== null) {
            return expFromPayload;
        }

        if (!rawToken) {
            return null;
        }

        const decoded = parseJWT(rawToken);
        if (!decoded) {
            return null;
        }

        return normalizeExp(decoded.exp);
    };

    useEffect(() => {
        const storedUser = sessionStorage.getItem("user");
        const storedExpiry = sessionStorage.getItem("tokenExpiry");
        const storedRefreshToken = sessionStorage.getItem("refreshToken");

        if (storedUser) {
            try {
                const parsed = JSON.parse(storedUser) as StoredUserShape;
                const normalized: User = {
                    ...parsed,
                    isManager: Boolean(parsed.isManager ?? parsed.teamManagedId),
                };
                setUser(normalized);
                setToken("cookie-based");
                if (storedRefreshToken) {
                    setRefreshToken(storedRefreshToken);
                }
                if (storedExpiry) {
                    const parsedExpiry = Number(storedExpiry);
                    if (Number.isFinite(parsedExpiry)) {
                        setTokenExpiry(parsedExpiry);
                    }
                }
                setHasAttemptedRefresh(true);
            } catch (error) {
                console.error("Erreur lors du chargement de l'utilisateur:", error);
                sessionStorage.removeItem("user");
                sessionStorage.removeItem("tokenExpiry");
            }
        } else {
            if (storedExpiry) {
                sessionStorage.removeItem("tokenExpiry");
            }
            if (storedRefreshToken) {
                sessionStorage.removeItem("refreshToken");
            }
        }

        setIsLoading(false);
    }, []);

    const login = (
        rawToken: string | null,
        newUser: User,
        payload?: Record<string, unknown>,
        newRefreshToken?: string | null,
    ) => {
        const normalizedUser: User = {
            ...newUser,
            isManager: Boolean(newUser.isManager ?? newUser.teamManagedId),
        };
        setToken("cookie-based");
        setUser(normalizedUser);
        sessionStorage.setItem("user", JSON.stringify(normalizedUser));

        const expiration = resolveTokenExpiration(rawToken, payload);
        setTokenExpiry(expiration);
        persistTokenExpiry(expiration);

        if (typeof newRefreshToken !== "undefined") {
            if (newRefreshToken) {
                setRefreshToken(newRefreshToken);
                persistRefreshToken(newRefreshToken);
            } else {
                setRefreshToken(null);
                persistRefreshToken(null);
            }
        }
        setHasAttemptedRefresh(true);
    };

    const clearSession = () => {
        setToken(null);
        setUser(null);
        setRefreshToken(null);
        sessionStorage.removeItem("user");
        persistRefreshToken(null);
        setTokenExpiry(null);
        persistTokenExpiry(null);
    };

    const logout = async ({ revoke = false }: { revoke?: boolean } = {}) => {
        const activeRefreshToken = refreshToken ?? sessionStorage.getItem("refreshToken");

        if (revoke && activeRefreshToken) {
            try {
                await client.mutate({
                    mutation: REVOKE_TOKEN,
                    variables: { refreshToken: activeRefreshToken },
                    fetchPolicy: "no-cache",
                });
            } catch (error) {
                console.error("Failed to revoke refresh token:", error);
            }
        }

        try {
            await Promise.all([
                client.mutate({ mutation: DELETE_TOKEN_COOKIE, fetchPolicy: "no-cache" }),
                client.mutate({ mutation: DELETE_REFRESH_TOKEN_COOKIE, fetchPolicy: "no-cache" }),
            ]);
        } catch (error) {
            console.error("Failed to delete auth cookies:", error);
        }

        try {
            await client.clearStore();
        } catch (error) {
            console.error("Failed to clear Apollo cache:", error);
        }

        clearSession();
        setHasAttemptedRefresh(true);
    };

    const markRefreshAttempt = useCallback(() => {
        setHasAttemptedRefresh(true);
    }, []);

    const value: AuthContextType = {
        user,
        token,
        tokenExpiry,
        refreshToken,
        hasAttemptedRefresh,
        markRefreshAttempt,
        login,
        logout,
        isAuthenticated: !!user,
        isLoading,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);

    if (context === undefined) {
        throw new Error("useAuth doit être utilisé à l'intérieur d'un AuthProvider");
    }

    return context;
}
