import { useMutation } from "@apollo/client/react";
import { toast } from "sonner";
import { CLOCK_IN_MUTATION, CLOCK_OUT_MUTATION } from "@/graphql/mutations";
import { SessionService, type ClockInResponse, type ClockOutResponse } from "@/lib/session";

export function useClockIn() {
    const [clockInMutation, { loading: clockInLoading }] = useMutation<ClockInResponse>(
        CLOCK_IN_MUTATION,
        {
            onCompleted: (data) => {
                const timeClock = data.clockIn.timeClock;
                console.log("Clock In completed, timeClock:", timeClock);
                SessionService.setLastClockIn(timeClock);
                toast.success("Clock In réussi !", {
                    description: `Vous avez pointé à ${new Date(timeClock.clockIn).toLocaleTimeString("fr-FR")}`,
                });
            },
            onError: (error) => {
                toast.error("Erreur Clock In", {
                    description: error.message || "Impossible de pointer l'entrée",
                });
            },
        },
    );

    const clockIn = async (userId: string) => {
        try {
            await clockInMutation({ variables: { userId } });
        } catch (error) {
            console.error("Clock in error:", error);
            throw error;
        }
    };

    return { clockIn, loading: clockInLoading };
}

export function useClockOut() {
    const [clockOutMutation, { loading: clockOutLoading }] = useMutation<ClockOutResponse>(
        CLOCK_OUT_MUTATION,
        {
            onCompleted: (data) => {
                const timeClock = data.clockOut.timeClock;

                // Mettre à jour le localStorage avec les données complètes (incluant clockOut)
                localStorage.setItem("lastClockIn", JSON.stringify(timeClock));

                // Effacer le clock in actuel dans sessionStorage
                SessionService.clearCurrentClockIn();

                const clockOutTime = timeClock.clockOut
                    ? new Date(timeClock.clockOut).toLocaleTimeString("fr-FR")
                    : "maintenant";
                toast.success("Clock Out réussi !", {
                    description: `Vous avez pointé la sortie à ${clockOutTime}`,
                });
            },
            onError: (error) => {
                toast.error("Erreur Clock Out", {
                    description: error.message || "Impossible de pointer la sortie",
                });
            },
        },
    );

    const clockOut = async (userId: string) => {
        try {
            await clockOutMutation({ variables: { userId } });
        } catch (error) {
            console.error("Clock out error:", error);
            throw error;
        }
    };

    return { clockOut, loading: clockOutLoading };
}
