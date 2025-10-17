import { useMutation } from "@apollo/client/react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { LOGIN_MUTATION } from "@/graphql/mutations";
import { SessionService } from "@/lib/session";
import type { User } from "@/lib/session";

interface TokenAuthResponse {
    tokenAuth: {
        token: string;
        refreshToken: string;
        payload: {
            email: string;
            exp: number;
            origIat: number;
        };
        refreshExpiresIn: number;
    };
}

export function useLogin() {
    const navigate = useNavigate();

    const [loginMutation, { loading, error }] = useMutation<TokenAuthResponse>(
        LOGIN_MUTATION,
        {
            onCompleted: (data) => {
                const { token, payload } = data.tokenAuth;

                // Stocker le token
                SessionService.setToken(token);

                // Créer un objet utilisateur à partir du payload
                // Note: Le payload JWT contient l'email mais pas les autres infos
                // Il faudra faire une query pour récupérer les infos complètes
                const user: User = {
                    id: "", // Sera récupéré via une query
                    email: payload.email,
                    firstName: "",
                    lastName: "",
                };

                SessionService.setUser(user);

                toast.success("Connexion réussie !", {
                    description: `Bienvenue ${payload.email}`,
                });

                navigate("/dashboard");
            },
            onError: (error) => {
                console.error("Login error:", error);
                toast.error("Erreur de connexion", {
                    description: error.message || "Email ou mot de passe incorrect",
                });
            },
        }
    );

    const login = async (email: string, password: string) => {
        try {
            await loginMutation({
                variables: { email, password },
            });
        } catch (err) {
            console.error("Login error:", err);
        }
    };

    return { login, loading, error };
}
