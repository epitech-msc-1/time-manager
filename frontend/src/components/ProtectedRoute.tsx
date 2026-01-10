import { Navigate, Outlet } from "react-router";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
    children?: React.ReactNode;
    requireAdmin?: boolean;
    requireManager?: boolean;
}

export function ProtectedRoute({
    children,
    requireAdmin = false,
    requireManager = false,
}: ProtectedRouteProps) {
    const { isAuthenticated, isLoading, hasAttemptedRefresh, user } = useAuth();

    // Pendant le chargement, afficher un loader
    if (isLoading || !hasAttemptedRefresh) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto" />
                    <p className="mt-4 text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    // Si non authentifié, rediriger vers la page de login
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (requireAdmin && !user?.isAdmin) {
        return <Navigate to="/dashboard" replace />;
    }

    if (requireManager && !user?.isManager && !user?.isAdmin) {
        return <Navigate to="/dashboard" replace />;
    }

    // Si authentifié, afficher le contenu
    // biome-ignore lint/complexity/noUselessFragments: <React Router needs the fragment>
    return children ? <>{children}</> : <Outlet />;
}
