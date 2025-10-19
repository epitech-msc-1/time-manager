import { ApolloClient, ApolloLink, gql, HttpLink, InMemoryCache } from "@apollo/client";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { ErrorLink } from "@apollo/client/link/error";
import { Observable } from "@apollo/client/utilities";
import { print } from "graphql";

const API_URL = "http://localhost:8000/graphql";

const httpLink = new HttpLink({
    uri: API_URL,
    credentials: "include",
});

const REFRESH_TOKEN_MUTATION = gql`
    mutation RefreshToken {
        refreshToken {
            token
            payload
        }
    }
`;

const refreshAccessToken = async (): Promise<boolean> => {
    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: print(REFRESH_TOKEN_MUTATION) }),
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

const errorLink = new ErrorLink(({ error, operation, forward }) => {
    if (CombinedGraphQLErrors.is(error)) {
        const hasExpiredToken = error.errors.some(
            (graphError) => graphError.message === "Signature has expired",
        );

        if (hasExpiredToken) {
            console.log("Access token expired. Attempting to refresh...");

            return new Observable<ApolloLink.Result>((observer) => {
                let subscription: { unsubscribe: () => void } | undefined;

                refreshAccessToken()
                    .then((isRefreshed) => {
                        if (!isRefreshed) {
                            observer.error(new Error("Failed to refresh token."));
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

        console.error(`[GraphQL error]: ${error.message}`);
        return;
    }

    if (error) {
        console.error(`[Network error]: ${error}`);
    }
});

const link = ApolloLink.from([errorLink, httpLink]);

export const client = new ApolloClient({
    link: link,
    cache: new InMemoryCache(),
});
