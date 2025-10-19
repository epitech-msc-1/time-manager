import { useMutation } from "@apollo/client/react";
import { type FormEvent, useId, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { LOGIN_MUTATION } from "@/graphql/mutations";
import { decodeJWTPayload } from "@/lib/jwt-utils";
import { cn } from "@/lib/utils";

export function LoginForm({ className, ...props }: React.ComponentProps<"div">) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const { login } = useAuth();
    const navigate = useNavigate();
    const emailId = useId();
    const passwordId = useId();

    // Mutation Apollo pour le login
    const [loginMutation, { loading }] = useMutation<{
        tokenAuth: {
            token: string;
            payload: Record<string, unknown>;
            refreshToken: string;
        };
    }>(LOGIN_MUTATION, {
        onCompleted: (data) => {
            // Extraire token et payload de la réponse
            // Le refreshToken est automatiquement stocké dans un cookie httpOnly par Django
            const { token, payload, refreshToken } = data.tokenAuth || {};

            if (token && payload) {
                // Décoder le payload pour extraire les infos utilisateur
                const user = decodeJWTPayload(payload);

                // Sauvegarder l'utilisateur (le token JWT est déjà dans un cookie httpOnly)
                // On passe le token juste pour la signature, il n'est pas utilisé
                login(token, user, payload, refreshToken ?? null);

                // Note : refreshToken est aussi placé en cookie httpOnly, on le conserve côté client
                // uniquement pour déclencher la révocation lors d'une déconnexion volontaire

                // Afficher un message de succès
                toast.success(`Bienvenue ${user.firstName} ${user.lastName}!`);

                // Rediriger vers le dashboard
                navigate("/dashboard");
            }
        },
        onError: (error) => {
            console.error("Erreur de connexion:", error);
            toast.error("Erreur de connexion. Vérifiez vos identifiants.");
        },
    });
    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!email || !password) {
            toast.error("Veuillez remplir tous les champs");
            return;
        }

        try {
            await loginMutation({
                variables: {
                    email,
                    password,
                },
            });
        } catch (error) {
            // L'erreur est déjà gérée dans onError
            console.error(error);
        }
    };

    return (
        <div className={cn("flex flex-col gap-6", className)} {...props}>
            <Card>
                <CardHeader>
                    <CardTitle>Connexion à votre compte</CardTitle>
                    <CardDescription>
                        Entrez votre email et mot de passe pour vous connecter
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit}>
                        <FieldGroup>
                            <Field>
                                <FieldLabel htmlFor={emailId}>Email</FieldLabel>
                                <Input
                                    id={emailId}
                                    type="email"
                                    placeholder="votre@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    disabled={loading}
                                />
                            </Field>
                            <Field>
                                <FieldLabel htmlFor={passwordId}>Mot de passe</FieldLabel>
                                <Input
                                    id={passwordId}
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    disabled={loading}
                                />
                            </Field>
                            <Field>
                                <Button type="submit" disabled={loading}>
                                    {loading ? "Connexion..." : "Se connecter"}
                                </Button>
                            </Field>
                        </FieldGroup>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
