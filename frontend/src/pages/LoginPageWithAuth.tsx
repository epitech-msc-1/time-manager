import type React from "react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@apollo/client/react";
import { AuthCard } from "@/components/auth-card";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LOGIN_MUTATION } from "@/graphql/mutations";
import { SessionService } from "@/lib/session";
import { toast } from "sonner";

interface LoginResponse {
	tokenAuth: {
		token: string;
		refreshToken: string;
	};
}

// Fonction pour décoder le JWT (sans vérifier la signature - juste pour lire le payload)
function decodeJWT(token: string): { email?: string; exp?: number } {
	try {
		const base64Url = token.split(".")[1];
		const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
		const jsonPayload = decodeURIComponent(
			atob(base64)
				.split("")
				.map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
				.join(""),
		);
		return JSON.parse(jsonPayload);
	} catch (error) {
		console.error("Erreur décodage JWT:", error);
		return {};
	}
}

export default function LoginPageWithAuth() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const navigate = useNavigate();

	const [loginMutation, { loading }] = useMutation<LoginResponse>(
		LOGIN_MUTATION,
		{
			onCompleted: (data) => {
				const { token } = data.tokenAuth;

				// Décoder le JWT pour extraire l'email
				const payload = decodeJWT(token);

				// Note : Le token est déjà stocké dans un cookie HTTP-only par le backend
				// On ne le stocke PAS dans localStorage pour des raisons de sécurité
				// SessionService.setToken(token); // ❌ Ne pas stocker en double

				// Créer un objet utilisateur avec l'email du payload
				SessionService.setUser({
					id: "", // Sera mis à jour après une query utilisateur
					email: payload.email || email, // Fallback sur l'email du formulaire
					firstName: "",
					lastName: "",
				});

				toast.success("Connexion réussie !", {
					description: `Bienvenue ${payload.email || email}`,
				});

				navigate("/dashboard");
			},
			onError: (error) => {
				console.error("Login error:", error);
				toast.error("Erreur de connexion", {
					description: error.message || "Email ou mot de passe incorrect",
				});
			},
		},
	);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!email || !password) {
			toast.warning("Champs requis", {
				description: "Veuillez remplir tous les champs !",
			});
			return;
		}

		try {
			await loginMutation({
				variables: { email, password },
			});
		} catch (error) {
			console.error("Login error:", error);
		}
	};

	const handleDevLogin = () => {
		SessionService.setUser({
			id: "16",
			email: "test@primebank.com",
			firstName: "Test",
			lastName: "User",
		});
		SessionService.setToken("dev-token-123");

		toast.success("Mode développement", {
			description: "Utilisateur dev connecté !",
		});

		navigate("/dashboard");
	};

	const handleGoogleLogin = () => {
		toast.info("Connexion Google", {
			description: "En cours de développement !",
		});
	};

	const handleGithubLogin = () => {
		toast.info("Connexion GitHub", {
			description: "En cours de développement !",
		});
	};

	return (
		<>
			<div className="absolute top-4 right-4">
				<ThemeToggle />
			</div>

			<AuthCard title="Connexion" description="Connectez-vous à votre compte">
				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="email">Email</Label>
						<Input
							id="email"
							type="email"
							placeholder="nom@exemple.com"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							required
							disabled={loading}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="password">Mot de passe</Label>
						<Input
							id="password"
							type="password"
							placeholder="••••••••"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							required
							disabled={loading}
						/>
					</div>

					<Button type="submit" className="w-full" disabled={loading}>
						{loading ? "Connexion..." : "Se connecter"}
					</Button>
				</form>

				{/* Bouton de développement - À RETIRER EN PRODUCTION */}
				<Button
					variant="outline"
					className="w-full mt-2"
					onClick={handleDevLogin}
					type="button"
				>
					🔧 Dev: Connexion rapide
				</Button>

				<div className="relative my-4">
					<div className="absolute inset-0 flex items-center">
						<span className="w-full border-t" />
					</div>
					<div className="relative flex justify-center text-xs uppercase">
						<span className="bg-card px-2 text-muted-foreground">
							Ou continuer avec
						</span>
					</div>
				</div>
				<div className="grid grid-cols-2 gap-4">
					<Button variant="outline" type="button" onClick={handleGoogleLogin}>
						<svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
							<path
								d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
								fill="#4285F4"
							/>
							<path
								d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
								fill="#34A853"
							/>
							<path
								d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
								fill="#FBBC05"
							/>
							<path
								d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
								fill="#EA4335"
							/>
						</svg>
						Google
					</Button>

					<Button variant="outline" type="button" onClick={handleGithubLogin}>
						<svg
							className="mr-2 h-4 w-4"
							fill="currentColor"
							viewBox="0 0 24 24"
						>
							<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
						</svg>
						GitHub
					</Button>
				</div>

				<div className="mt-4 text-center text-sm">
					<span className="text-muted-foreground">Pas encore de compte ? </span>
					<Link
						to="/register"
						className="underline underline-offset-4 hover:text-primary"
					>
						Créer un compte
					</Link>
				</div>
			</AuthCard>
		</>
	);
}
