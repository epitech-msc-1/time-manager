# Getting Started

This guide will help you set up the **Time Manager** project on your local machine for development.

## :material-clipboard-list: Prerequisites

Ensure you have the following tools installed on your system:

- **Docker Engine** & **Docker Compose**
- **Node.js** (v18+ recommended) & **npm** (or `pnpm`/`yarn`)
- **Python** (v3.12+ recommended)
- **Git**

## :material-rocket-launch: Installation

### 1. Clone the Repository

```bash
git clone https://github.com/epitech-msc-1/time-manager.git
cd time-manager
```

### 2. Environment Configuration

Create the necessary `.env` file from the example.

```bash
cp .env.example .env
```

!!! warning "Configuration"
    Edit `.env` and fill in any missing secrets, such as database credentials or API keys, before proceeding.

### 3. Start with Docker Compose (Recommended)

The easiest way to run the full stack (Frontend, Backend, Database) is using Docker Compose.

```bash
docker compose up -d --build
```

This will start:

- **Backend API** at `http://localhost:8000`
- **Frontend App** at `http://localhost:5173` (or configured port)
- **PostgreSQL Database**

### 4. Verify Installation

Check the status of your containers:

```bash
docker compose ps
```

You should see all services `Up` and healthy.

## :material-run: Running Locally (Manual Setup)

If you prefer to run services individually without Docker:

### Backend (Django)

Navigate to the backend directory:

```bash
cd backend
```

**Create a virtual environment and install dependencies:**

=== "uv (Recommended)"
    ```bash
    uv sync
    source .venv/bin/activate
    ```

=== "python"
    ```bash
    python -m venv .venv
    source .venv/bin/activate
    pip install -r requirements.txt
    ```

=== "python3"
    ```bash
    python3 -m venv .venv
    source .venv/bin/activate
    pip install -r requirements.txt
    ```

**Run migrations and start server:**

=== "uv"
    ```bash
    uv run manage.py migrate
    uv run manage.py runserver
    ```

=== "python"
    ```bash
    python manage.py migrate
    python manage.py runserver
    ```

=== "python3"
    ```bash
    python3 manage.py migrate
    python3 manage.py runserver
    ```

### Frontend (React)

Navigate to the frontend directory:

```bash
cd frontend
```

**Install dependencies and start dev server:**

=== "npm"
    ```bash
    npm install
    npm run dev
    ```

=== "pnpm"
    ```bash
    pnpm install
    pnpm dev
    ```

=== "yarn"
    ```bash
    yarn install
    yarn dev
    ```

=== "bun"
    ```bash
    bun install
    bun dev
    ```

## :material-bug: Troubleshooting

??? question "Database Connection Error?"
    Ensure the `POSTGRES_HOST`, `POSTGRES_USER`, and `POSTGRES_PASSWORD` in your `.env` match your Docker configuration or local Postgres instance.

??? question "Frontend cannot reach API?"
    Check the `VITE_API_URL` environment variable in the frontend configuration. It should point to `http://localhost:8000` (or your backend URL).
