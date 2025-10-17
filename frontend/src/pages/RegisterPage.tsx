import type React from "react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { AuthCard } from "@/components/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function RegisterPage() {
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        password: "",
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Logique de création de compte ici
        console.log("Register:", formData);
    };

    return (
        <AuthCard title="Créer un compte" description="Rejoignez-nous dès aujourd'hui">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="firstName">Prénom</Label>
                        <Input
                            id="firstName"
                            name="firstName"
                            type="text"
                            placeholder="Jean"
                            value={formData.firstName}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="lastName">Nom</Label>
                        <Input
                            id="lastName"
                            name="lastName"
                            type="text"
                            placeholder="Dupont"
                            value={formData.lastName}
                            onChange={handleChange}
                            required
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="email">Adresse email</Label>
                    <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="nom@exemple.com"
                        value={formData.email}
                        onChange={handleChange}
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="phone">Numéro de téléphone</Label>
                    <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        placeholder="+33 6 12 34 56 78"
                        value={formData.phone}
                        onChange={handleChange}
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="password">Mot de passe</Label>
                    <Input
                        id="password"
                        name="password"
                        type="password"
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={handleChange}
                        required
                    />
                </div>

                <Button type="submit" className="w-full">
                    Créer mon compte
                </Button>
            </form>

            <div className="mt-4 text-center text-sm">
                <span className="text-muted-foreground">Déjà un compte ? </span>
                <Link to="/login" className="underline underline-offset-4 hover:text-primary">
                    Se connecter
                </Link>
            </div>
        </AuthCard>
    );
}
