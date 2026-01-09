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

| Component | Technology | Description |
|:----------|:-----------|:------------|
| **Language** | Python 3.12 | Core programming language |
| **Framework** | Django 5.2 | Web framework |
| **API** | GraphQL & REST | Graphene-Django for GraphQL |
| **Database** | PostgreSQL | Relational database |
| **Auth** | JWT | JSON Web Tokens |
| **Package Manager** | uv | Fast Python package installer |

### Frontend

| Component | Technology | Description |
|:----------|:-----------|:------------|
| **Framework** | React 19 | UI library |
| **Build Tool** | Vite (Rolldown) | Next-gen bundler |
| **Styling** | TailwindCSS 4 | Utility-first CSS |
| **Components** | Radix UI | Headless component library |
| **State/Data** | Apollo Client | GraphQL client |
| **Linting/Formatter** | Biome | Fast code quality tool |

### DevOps

| Component | Technology | Description |
|:----------|:-----------|:------------|
| **Containerization** | Docker | Application containers |
| **Orchestration** | Docker Swarm | Container orchestration |
| **Reverse Proxy** | Traefik | HTTP reverse proxy |
| **CI/CD** | GitHub Actions | Automated workflows |
| **Quality** | SonarQube | Code quality analysis |
