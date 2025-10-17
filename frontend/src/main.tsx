import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { ThemeProvider } from "next-themes";
import { BrowserRouter } from "react-router-dom";
import { ApolloProvider } from "@apollo/client/react";
import { Toaster } from "@/components/ui/sonner";
import App from "./App";
import client from "./lib/apolloClient";

const root = document.getElementById("root");

if (!root) {
    throw Error("No root component!");
}

createRoot(root).render(
    <StrictMode>
        <ApolloProvider client={client}>
            <ThemeProvider attribute="class">
                <BrowserRouter>
                    <App />
                    <Toaster position="top-right" />
                </BrowserRouter>
            </ThemeProvider>
        </ApolloProvider>
    </StrictMode>
);
