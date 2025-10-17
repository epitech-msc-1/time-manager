import { Navigate, Route, Routes } from "react-router-dom";
import DashboardPage from "@/pages/dashboard/DashboardPage";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import LoginPageWithAuth from "@/pages/LoginPageWithAuth";

export default function App() {
    return (
        <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/login1" element={<LoginPageWithAuth />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
        </Routes>
    );
}
