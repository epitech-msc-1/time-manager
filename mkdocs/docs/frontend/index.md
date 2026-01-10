# Frontend Guide

The frontend is a **Single Page Application (SPA)** built with **React 19**, **Vite**, and **TypeScript**. It utilizes **Apollo Client** for GraphQL state management and **TailwindCSS** + **Radix UI** for styling.

## :material-folder-multiple: Project Structure

The project follows a feature-based structure for pages (`app/`) and a shared structure for utilities.

```bash
frontend/src/
├── app/                # Page components (features)
│   ├── dashboard/      # Dashboard feature
│   ├── login/          # Auth feature
│   └── users-dashboard/# Admin features
├── components/         # Shared UI components
│   ├── ui/             # Radix/Shadcn primitives
│   └── ...             # Business components (DataTable, etc.)
├── contexts/           # React Contexts (AuthContext)
├── graphql/            # GraphQL Definitions
│   ├── queries.ts      # Query operations
│   └── mutations.ts    # Mutation operations
├── lib/                # Utilities & Configuration
│   ├── apollo-client.ts # GraphQL Client setup
│   └── utils.ts        # Helper functions
├── routes.tsx          # Router configuration
├── App.tsx             # Root layout
└── main.tsx            # Entry point
```

## :material-tools: Development

### Installation

Install dependencies using your preferred package manager:

=== "npm"
    ```bash
    npm install
    ```
=== "pnpm"
    ```bash
    pnpm install
    ```
=== "yarn"
    ```bash
    yarn install
    ```
=== "bun"
    ```bash
    bun install
    ```

### Development Server

Start the local dev server at `http://localhost:5173`:

=== "npm"
    ```bash
    npm run dev
    ```
=== "pnpm"
    ```bash
    pnpm dev
    ```
=== "yarn"
    ```bash
    yarn dev
    ```
=== "bun"
    ```bash
    bun dev
    ```

### Build for Production

=== "npm"
    ```bash
    npm run build
    ```
=== "pnpm"
    ```bash
    pnpm build
    ```
=== "yarn"
    ```bash
    yarn build
    ```
=== "bun"
    ```bash
    bun build
    ```

## :material-access-point-network: Data Fetching (GraphQL)

We use **Apollo Client** with a centralized configuration in `src/lib/apollo-client.ts`.

### Client Configuration
The client handles **automatic token refreshing** on `Signature has expired` errors via an `onError` link.

```typescript title="src/lib/apollo-client.ts"
// ... imports

const errorLink = onError(({ graphQLErrors, operation, forward }) => {
    const hasExpiredToken = graphQLErrors?.some(
        (err) => err.message === "Signature has expired"
    );

    if (hasExpiredToken) {
        console.log("Access token expired. Attempting to refresh...");
        // Logic to refresh token and retry request
        return new Observable(observer => { /* ... */ });
    }
});

export const client = new ApolloClient({
    link: ApolloLink.from([errorLink, httpLink]),
    cache: new InMemoryCache(),
});
```

### Usage in Components

Components use standard Apollo hooks like `useQuery`. Queries are defined in `src/graphql/queries.ts`.

```typescript title="src/app/dashboard/dashboard.tsx"
import { useQuery } from "@apollo/client/react";
import { GET_KPI_CLOCK } from "@/graphql/queries";

export default function Dashboard() {
    const { user } = useAuth();
    
    const { data, loading, error } = useQuery(GET_KPI_CLOCK, {
        variables: {
            period: 7,
            userId: user?.id,
        },
        skip: !user, // Skip query if user not loaded
        fetchPolicy: "cache-and-network",
    });

    if (loading) return <div>Loading...</div>;
    
    // ... render UI
}
```

## :material-routes: Routing

Routing is managed via `react-router` in `src/routes.tsx`. It supports protected routes based on authentication and roles.

```typescript title="src/routes.tsx"
const routes: RouteObject[] = [
    {
        path: "/",
        element: <App />,
        children: [
            {
                path: "dashboard",
                element: (
                    <ProtectedRoute>
                        <Dashboard />
                    </ProtectedRoute>
                ),
            },
            {
                path: "users-dashboard",
                element: (
                    <ProtectedRoute requireAdmin>
                        <UsersDashboard />
                    </ProtectedRoute>
                ),
            },
            // ...
        ],
    },
];
```

## :material-palette: Styling & UI

-   **TailwindCSS**: Used for utility-first styling.
-   **Radix UI**: Accessible UI primitives (modals, dropdowns, etc.) located in `src/components/ui`.
-   **Icons**: `lucide-react` for standard icons.
