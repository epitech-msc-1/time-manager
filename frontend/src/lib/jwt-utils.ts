import type { User } from "@/contexts/AuthContext";

/**
 * Décode le payload JWT pour extraire les informations utilisateur
 */
export function decodeJWTPayload(payload: Record<string, unknown>): User {
    const teamManagedRaw =
        payload.team_managed_id ?? payload.teamManagedId ?? payload.teamManaged ?? null;
    const teamIdRaw = payload.team_id ?? payload.teamId ?? null;
    const hourContractRaw = payload.hour_contract ?? payload.hourContract ?? null;

    return {
        id: String(payload.user_id || payload.userId || ""),
        email: String(payload.email || ""),
        firstName: String(payload.first_name || payload.firstName || ""),
        lastName: String(payload.last_name || payload.lastName || ""),
        isAdmin: Boolean(payload.is_admin || payload.isAdmin || false),
        isManager: Boolean(payload.is_manager || payload.isManager || teamManagedRaw),
        phoneNumber: payload.phone_number ? String(payload.phone_number) : undefined,
        teamId: teamIdRaw ? String(teamIdRaw) : undefined,
        teamManagedId: teamManagedRaw ? String(teamManagedRaw) : undefined,
        hourContract: hourContractRaw ? Number(hourContractRaw) : undefined,
    };
}

/**
 * Décode manuellement un token JWT (sans vérification)
 * Utile pour extraire les informations du payload côté client
 */
export function parseJWT(token: string): Record<string, unknown> | null {
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
        console.error("Erreur lors du décodage du JWT:", error);
        return null;
    }
}
