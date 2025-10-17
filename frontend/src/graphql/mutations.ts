import { gql } from "@apollo/client";

export const LOGIN_MUTATION = gql`
  mutation TokenAuth($email: String!, $password: String!) {
    tokenAuth(input: { email: $email, password: $password }) {
      token
      refreshToken
    }
  }
`;

export const REGISTER_MUTATION = gql`
  mutation Register(
    $email: String!
    $password: String!
    $firstName: String!
    $lastName: String!
  ) {
    register(
      email: $email
      password: $password
      firstName: $firstName
      lastName: $lastName
    ) {
      token
      user {
        id
        email
        firstName
        lastName
      }
    }
  }
`;

// Mutations Clock In/Out
export const CLOCK_IN_MUTATION = gql`
  mutation ClockIn($userId: ID!) {
    clockIn(userId: $userId) {
      timeClock {
        id
        day
        clockIn
        clockOut
        user {
          id
          email
        }
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
        user {
          id
          email
        }
      }
    }
  }
`;
