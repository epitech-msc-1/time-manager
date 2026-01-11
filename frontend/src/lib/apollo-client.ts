import {
    ApolloClient,
    ApolloLink,
    type FetchResult,
    gql,
    HttpLink,
    InMemoryCache,
    type Operation,
} from "@apollo/client";
import { onError } from "@apollo/client/link/error";
import { Observable } from "@apollo/client/utilities";
import { type GraphQLError, print } from "graphql";

// Default GraphQL endpoint; override with Vite env var `VITE_API_URL` if provided.
const DEFAULT_API_URL = "/api/graphql";
let apiUrl = (import.meta.env.VITE_API_URL as string) ?? DEFAULT_API_URL;

export const setApiUrl = (newUrl: string) => {
    apiUrl = newUrl;
};

const httpLink = new HttpLink({
    // use a function so the current `apiUrl` value is read on each request
    uri: () => apiUrl,
    credentials: "include",
});

const REFRESH_TOKEN_MUTATION = gql`
    mutation RefreshToken($refreshToken: String) {
        refreshToken(refreshToken: $refreshToken) {
            token
            payload
        }
    }
`;

const refreshAccessToken = async (): Promise<boolean> => {
    try {
        const storedRefreshToken = sessionStorage.getItem("refreshToken");
        const variables = storedRefreshToken ? { refreshToken: storedRefreshToken } : {};

        const response = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                query: print(REFRESH_TOKEN_MUTATION),
                variables,
            }),
            credentials: "include",
        });

        const result = await response.json();

        if (result.data?.refreshToken?.token) {
            console.log("Token refreshed successfully.");
            return true;
        }

        console.error("Failed to refresh token.");
        return false;
    } catch (error) {
        console.error("Error during token refresh:", error);
        return false;
    }
};

const errorLink = onError(
    ({
        graphQLErrors,
        operation,
        forward,
    }: {
        graphQLErrors?: ReadonlyArray<GraphQLError>;
        operation: Operation;
        forward: (operation: Operation) => Observable<FetchResult>;
    }) => {
        const hasExpiredToken = !!graphQLErrors?.some(
            (graphError: GraphQLError) =>
                graphError.message === "Signature has expired" ||
                graphError.message.includes("User AnonymousUser not authenticated") ||
                graphError.message.includes("not authenticated"),
        );

        if (hasExpiredToken) {
            console.log("Access token expired. Attempting to refresh...");

            return new Observable<ApolloLink.Result>((observer) => {
                let subscription: { unsubscribe: () => void } | undefined;

                refreshAccessToken()
                    .then((isRefreshed) => {
                        if (!isRefreshed) {
                            observer.error(new Error("Failed to refresh token."));
                            window.dispatchEvent(new Event("auth:logout"));
                            return;
                        }

                        subscription = forward(operation).subscribe({
                            next: (value: ApolloLink.Result) => observer.next?.(value),
                            error: (subscriptionError: unknown) =>
                                observer.error?.(subscriptionError),
                            complete: () => observer.complete?.(),
                        });
                    })
                    .catch((refreshError) => {
                        observer.error?.(refreshError);
                    });

                return () => {
                    subscription?.unsubscribe();
                };
            });
        }

        console.error(
            `[GraphQL error]: ${graphQLErrors?.map((e: GraphQLError) => e.message).join(", ")}`,
        );
        return;
    },
);

const link = ApolloLink.from([errorLink, httpLink]);

export const client = new ApolloClient({
    link: link,
    cache: new InMemoryCache(),
});
