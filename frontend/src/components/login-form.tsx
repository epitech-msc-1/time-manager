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

    // Apollo Mutation for login
    const [loginMutation, { loading }] = useMutation<{
        tokenAuth: {
            token: string;
            payload: Record<string, unknown>;
            refreshToken: string;
        };
    }>(LOGIN_MUTATION, {
        onCompleted: (data) => {
            // Extract token and payload from the response
            // The refreshToken is automatically stored in an httpOnly cookie by Django
            const { token, payload, refreshToken } = data.tokenAuth || {};

            if (token && payload) {
                // Decode the payload to extract user info
                const user = decodeJWTPayload(payload);

                // Save the user (JWT token is already in an httpOnly cookie)
                // We pass the token just for the signature, it is not used
                login(token, user, payload, refreshToken ?? null);

                // Note: refreshToken is also placed in an httpOnly cookie, we keep it client-side
                // only to trigger revocation upon voluntary logout

                // Show success message
                toast.success(`Welcome ${user.firstName} ${user.lastName}!`);

                // Redirect to dashboard
                navigate("/dashboard");
            }
        },
        onError: (error) => {
            console.error("Connection error:", error);
            toast.error("Connection error. Please check your credentials.");
        },
    });
    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!email || !password) {
            toast.error("Please fill in all fields");
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
            // The error is already handled in onError
            console.error(error);
        }
    };

    return (
        <div className={cn("flex flex-col gap-6", className)} {...props}>
            <Card>
                <CardHeader>
                    <CardTitle>Sign in to your account</CardTitle>
                    <CardDescription>Enter your email and password to sign in</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit}>
                        <FieldGroup>
                            <Field>
                                <FieldLabel htmlFor={emailId}>Email</FieldLabel>
                                <Input
                                    id={emailId}
                                    type="email"
                                    placeholder="your@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    disabled={loading}
                                />
                            </Field>
                            <Field>
                                <FieldLabel htmlFor={passwordId}>Password</FieldLabel>
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
                                    {loading ? "Signing in..." : "Sign in"}
                                </Button>
                            </Field>
                        </FieldGroup>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
