import { ApolloProvider } from "@apollo/client/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
import { Toaster } from "sonner";
import "./index.css";
import { TokenRefreshProvider } from "@/components/TokenRefreshProvider";
import { ThemeProvider } from "@/components/theme-provider.tsx";
import { AuthProvider } from "@/contexts/AuthContext";
import { client } from "@/lib/apollo-client";
import routes from "./routes.tsx";

const router = createBrowserRouter(routes);

const root = document.getElementById("root");

if (!root) {
    throw Error("Root element not found!");
}

createRoot(root).render(
    <StrictMode>
        <ApolloProvider client={client}>
            <AuthProvider>
                <TokenRefreshProvider>
                    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
                        <RouterProvider router={router} />
                        <Toaster position="top-right" />
                    </ThemeProvider>
                </TokenRefreshProvider>
            </AuthProvider>
        </ApolloProvider>
    </StrictMode>,
);
