import { gql } from "@apollo/client";

export const GET_TIME_CLOCK_STATUS = gql`
    query TimeClock($userId: ID!) {
        timeClock(userId: $userId) {
            id
            day
            clockIn
            clockOut
        }
    }
`;

export const GET_KPI_CLOCK = gql`
    query KpiClock($period: Int!, $userId: ID) {
        kpiClock(period: $period, userId: $userId) {
            totalSeconds
            totalHours
            averageHoursPerDay
            averageHoursPerWorkday
            presenceRate
            workedDays
            periodDays
            previousTotalSeconds
            previousTotalHours
            previousPresenceRate
            previousAverageHoursPerWorkday
            dailyTotals {
                day
                totalSeconds
                totalHours
            }
        }
    }
`;

export const GET_USER_TEAM_PRESENCE = gql`
    query UserTeamPresence($period: Int) {
        userTeamPresence(period: $period) {
            id
            firstname
            lastname
            status
            presence
            score
        }
    }
`;

export const GET_TEAMS = gql`
    query Teams {
        teams {
            id
            description
            nrMembers
        }
    }
`;

export const GET_USERS = gql`
    query Users {
        users {
            id
            email
            firstName
            lastName
            phoneNumber
            hourContract
            isAdmin
            team {
                id
                description
            }
            teamManaged {
                id
                description
            }
        }
    }
`;

export const GET_USER_BY_EMAIL = gql`
    query UserByEmail($email: String!) {
        userByEmail(email: $email) {
            id
            email
            firstName
            lastName
            isAdmin
            team {
                id
                description
            }
            teamManaged {
                id
                description
            }
        }
    }
`;

export const GET_ME = gql`
    query Me {
        me {
            id
            email
            firstName
            lastName
            isAdmin
            team {
                id
                description
            }
            teamManaged {
                id
                description
            }
        }
    }
`;
