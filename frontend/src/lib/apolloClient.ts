import { ApolloClient, InMemoryCache, createHttpLink } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";

const httpLink = createHttpLink({
	uri: "http://localhost:8000/graphql",
	credentials: "include", // Important : Envoyer les cookies avec les requêtes
});

// Middleware pour ajouter le token d'authentification aux requêtes
// Note : Avec JWT_COOKIE activé, le token est dans un cookie HTTP-only
// et est envoyé automatiquement. On garde ce middleware pour compatibilité
// avec d'autres headers si nécessaire.
const authLink = setContext((_, { headers }) => {
	return {
		headers: {
			...headers,
			// Pas besoin d'ajouter Authorization car le cookie est envoyé automatiquement
		},
	};
});

const client = new ApolloClient({
	link: authLink.concat(httpLink),
	cache: new InMemoryCache(),
	defaultOptions: {
		watchQuery: {
			fetchPolicy: "cache-and-network",
		},
	},
});

export default client;
