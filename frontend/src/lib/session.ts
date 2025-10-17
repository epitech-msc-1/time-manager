export interface User {
	id: string;
	email: string;
	firstName?: string;
	lastName?: string;
}

export interface TimeClock {
	id: string;
	day: string;
	clockIn: string;
	clockOut: string | null;
	user: User;
}

export interface ClockInResponse {
	clockIn: {
		timeClock: TimeClock;
	};
}

export interface ClockOutResponse {
	clockOut: {
		timeClock: TimeClock;
	};
}

export const SessionService = {
	setUser(user: User): void {
		localStorage.setItem("user", JSON.stringify(user));
	},

	getUser(): User | null {
		const userStr = localStorage.getItem("user");
		if (!userStr) return null;
		try {
			return JSON.parse(userStr);
		} catch {
			return null;
		}
	},

	// Note : Le token JWT est maintenant stocké dans un cookie HTTP-only côté serveur
	// Ces méthodes sont conservées pour compatibilité mais ne sont plus utilisées
	setToken(token: string): void {
		// Le token est dans un cookie HTTP-only, pas besoin de le stocker
		// localStorage.setItem("authToken", token);
		console.warn("setToken appelé mais le token est géré par cookie HTTP-only");
	},

	getToken(): string | null {
		// Le token est dans un cookie HTTP-only, on ne peut pas le lire depuis JS
		// return localStorage.getItem("authToken");
		return null; // Le cookie est envoyé automatiquement
	},

	// Vérifier si l'utilisateur est connecté via l'existence des données utilisateur
	isAuthenticated(): boolean {
		// Avant : return !!this.getToken() && !!this.getUser();
		// Maintenant : Le token est dans le cookie, on vérifie juste l'utilisateur
		return !!this.getUser();
	},

	setLastClockIn(timeClock: TimeClock): void {
		localStorage.setItem("lastClockIn", JSON.stringify(timeClock));
		sessionStorage.setItem("currentClockIn", JSON.stringify(timeClock));
	},

	getLastClockIn(): TimeClock | null {
		const clockInStr =
			sessionStorage.getItem("currentClockIn") ||
			localStorage.getItem("lastClockIn");
		if (!clockInStr) return null;
		try {
			return JSON.parse(clockInStr);
		} catch {
			return null;
		}
	},

	clearCurrentClockIn(): void {
		sessionStorage.removeItem("currentClockIn");
	},

	hasActiveClock(): boolean {
		const clockIn = this.getLastClockIn();
		if (!clockIn) {
			console.log("hasActiveClock: No clockIn found");
			return false;
		}

		const today = new Date().toISOString().split("T")[0];
		const isToday = clockIn.day === today;
		const hasNoClockOut =
			!clockIn.clockOut || clockIn.clockOut === null || clockIn.clockOut === "";

		console.log("hasActiveClock debug:", {
			clockIn,
			today,
			isToday,
			hasNoClockOut,
			result: isToday && hasNoClockOut,
		});

		return isToday && hasNoClockOut;
	},

	hasCompletedToday(): boolean {
		const clockIn = this.getLastClockIn();
		if (!clockIn) {
			console.log("hasCompletedToday: No clockIn found");
			return false;
		}

		const today = new Date().toISOString().split("T")[0];
		const isToday = clockIn.day === today;
		const hasClockOut =
			clockIn.clockOut && clockIn.clockOut !== null && clockIn.clockOut !== "";

		console.log("hasCompletedToday debug:", {
			clockIn,
			today,
			isToday,
			hasClockOut,
			result: isToday && hasClockOut,
		});

		return isToday && hasClockOut;
	},

	logout(): void {
		localStorage.removeItem("user");
		localStorage.removeItem("authToken");
		localStorage.removeItem("lastClockIn");
		sessionStorage.removeItem("currentClockIn");
	},
};
