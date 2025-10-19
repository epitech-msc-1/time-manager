import type { RouteObject } from "react-router";
import { Navigate } from "react-router";
import Dashboard from "@/app/dashboard/dashboard";
import Page from "@/app/login/login";
import TeamDashboard from "@/app/team-dashboard/team-dashboard";
import UsersDashboard from "@/app/users-dashboard/users-dashboard";
import App from "./App";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { useAuth } from "./contexts/AuthContext";

const NotFoundPage = () => <div>Page non trouvée</div>;

const DefaultRoute = () => {
    const { hasAttemptedRefresh, isAuthenticated, isLoading } = useAuth();

    if (isLoading || !hasAttemptedRefresh) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto" />
                    <p className="mt-4 text-gray-600">Chargement...</p>
                </div>
            </div>
        );
    }

    if (isAuthenticated) {
        return <Navigate to="/dashboard" replace />;
    }

    return <Navigate to="/login" replace />;
};

const routes: RouteObject[] = [
    {
        path: "/",
        element: <App />,
        children: [
            {
                index: true,
                element: <DefaultRoute />,
            },
            {
                path: "login",
                element: <Page />,
            },
            // Routes protégées
            {
                path: "dashboard",
                element: (
                    <ProtectedRoute>
                        <Dashboard />
                    </ProtectedRoute>
                ),
            },
            {
                path: "team-dashboard",
                element: (
                    <ProtectedRoute requireAdmin>
                        <TeamDashboard />
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
            {
                path: "*",
                element: <NotFoundPage />,
            },
        ],
    },
];

export default routes;
