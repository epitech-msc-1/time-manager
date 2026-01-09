# Architecture & Design

**Time Manager** follows a modern, decoupled architecture separating the frontend user interface from the backend API services.

## :material-server-network: System Overview

The system is composed of containerized services orchestrated by **Docker Swarm**.

```mermaid
graph TB
    subgraph "Client Layer"
        Browser[User Browser]
        Mobile[Mobile Device]
    end

    subgraph "Infrastructure Layer"
        RP[Traefik Reverse Proxy]
    end

    subgraph "Application Layer"
        FE[Frontend App<br/>React 19 + Vite]
        BE[Backend API<br/>Django + Graphene]
    end

    subgraph "Data Layer"
        DB[(PostgreSQL)]
    end

    Browser -->|HTTPS| RP
    Mobile -->|HTTPS| RP
    RP -->|Routing| FE
    RP -->|Routing| BE
    FE -->|GraphQL/REST| BE
    BE -->|SQL| DB
```

## :material-database: Database Schema

The core data model uses a customized User model and relational structures for Teams and Time Tracking.

```mermaid
erDiagram
    CustomUser ||--o{ TimeClock : "logs time"
    CustomUser ||--o{ RequestModifyTimeClock : "requests changes"
    Team ||--|{ CustomUser : "has members"
    CustomUser ||--|| Team : "manages (optional)"

    CustomUser {
        string email UK
        string phone_number UK
        string first_name
        string last_name
        boolean is_admin
        int hour_contract
    }

    Team {
        int id PK
        string description
    }

    TimeClock {
        int id PK
        date day
        time clock_in
        time clock_out
    }

    RequestModifyTimeClock {
        int id PK
        date day
        datetime current_date
        time new_clock_in
        time new_clock_out
        string description
    }
```

## :material-tools: Technology Stack

### Backend

-   **Language**: Python 3.12
-   **Framework**: Django 5.2
-   **API**: GraphQL (Graphene-Django) & REST
-   **Database**: PostgreSQL
-   **Auth**: JWT (JSON Web Tokens)
-   **Package Manager**: `uv`

### Frontend

-   **Framework**: React 19
-   **Build Tool**: Vite (Rolldown)
-   **Styling**: TailwindCSS 4
-   **Components**: Radix UI
-   **State/Data**: Apollo Client (GraphQL)
-   **Linting/Formatter**: Biome

### DevOps

-   **Containerization**: Docker
-   **Orchestration**: Docker Swarm
-   **Reverse Proxy**: Traefik
-   **CI/CD**: GitHub Actions
-   **Quality**: SonarQube
