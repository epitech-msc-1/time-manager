import { gql } from "@apollo/client";

export const LOGIN_MUTATION = gql`
    mutation TokenAuth($email: String!, $password: String!) {
        tokenAuth(email: $email, password: $password) {
            token
            payload
            refreshToken
        }
    }
`;

export const REFRESH_TOKEN = gql`
    mutation RefreshToken {
        refreshToken {
            token
            payload
            refreshToken
        }
    }
`;

export const REVOKE_TOKEN = gql`
    mutation RevokeToken($refreshToken: String!) {
        revokeToken(refreshToken: $refreshToken) {
            revoked
        }
    }
`;

export const DELETE_TOKEN_COOKIE = gql`
    mutation DeleteTokenCookie {
        deleteTokenCookie {
            deleted
        }
    }
`;

export const DELETE_REFRESH_TOKEN_COOKIE = gql`
    mutation DeleteRefreshTokenCookie {
        deleteRefreshTokenCookie {
            deleted
        }
    }
`;

export const VERIFY_TOKEN = gql`
    mutation VerifyToken($token: String!) {
        verifyToken(token: $token) {
            payload
        }
    }
`;

export const CLOCK_IN_MUTATION = gql`
    mutation ClockIn($userId: ID!) {
        clockIn(userId: $userId) {
            timeClock {
                id
                day
                clockIn
                clockOut
            }
        }
    }
`;

export const CLOCK_OUT_MUTATION = gql`
    mutation ClockOut($userId: ID!) {
        clockOut(userId: $userId) {
            timeClock {
                id
                day
                clockIn
                clockOut
            }
        }
    }
`;

export const ADD_USER_TO_TEAM = gql`
    mutation AddUserToTeam($userId: ID!, $teamId: ID!) {
        addUserToTeam(userId: $userId, teamId: $teamId) {
            team {
                id
                description
            }
        }
    }
`;

export const CREATE_TEAM = gql`
    mutation CreateTeam($description: String) {
        createTeam(description: $description) {
            team {
                id
                description
                nrMembers
            }
        }
    }
`;

export const UPDATE_TEAM = gql`
    mutation UpdateTeam($id: ID!, $description: String) {
        updateTeam(id: $id, description: $description) {
            team {
                id
                description
                nrMembers
            }
        }
    }
`;

export const DELETE_TEAM = gql`
    mutation DeleteTeam($id: ID!) {
        deleteTeam(id: $id) {
            ok
        }
    }
`;

export const CREATE_USER = gql`
    mutation CreateUser(
        $email: String!
        $password: String!
        $phoneNumber: String!
        $firstName: String!
        $lastName: String!
        $hourContract: Int
        $teamId: ID
        $teamManagedId: ID
        $isAdmin: Boolean
    ) {
        createUser(
            email: $email
            password: $password
            phoneNumber: $phoneNumber
            firstName: $firstName
            lastName: $lastName
            hourContract: $hourContract
            teamId: $teamId
            teamManagedId: $teamManagedId
            isAdmin: $isAdmin
        ) {
            user {
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
    }
`;

export const UPDATE_USER = gql`
    mutation UpdateUser(
        $id: ID!
        $email: String
        $password: String
        $phoneNumber: String
        $firstName: String
        $lastName: String
        $hourContract: Int
        $teamId: ID
        $teamManagedId: ID
        $isAdmin: Boolean
    ) {
        updateUser(
            id: $id
            email: $email
            password: $password
            phoneNumber: $phoneNumber
            firstName: $firstName
            lastName: $lastName
            hourContract: $hourContract
            teamId: $teamId
            teamManagedId: $teamManagedId
            isAdmin: $isAdmin
        ) {
            user {
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
    }
`;

export const DELETE_USER = gql`
    mutation DeleteUser($id: ID!) {
        deleteUser(id: $id) {
            ok
        }
    }
`;
