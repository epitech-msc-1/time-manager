# Backend Guide

The backend is a robust **Django** application serving a **GraphQL API** (via Graphene). It uses a modular architecture to separate concerns (Auth, KPIs, Time Management).

## :material-folder-multiple: Project Structure

```bash
backend/
├── PrimeBank/              # Project Configuration (settings, urls)
│   ├── PrimeBankApp/       # Main Application Scope
│   │   ├── migrations/     # Database migrations
│   │   ├── models.py       # Data Models (CustomUser, Team, TimeClock)
│   │   ├── schema_*.py     # Modular GraphQL Schemas
│   │   ├── views.py        # REST Views (if any)
│   │   └── admin.py        # Django Admin config
│   ├── settings.py         # Global Settings
│   └── urls.py             # Main Route definitions
│
├── manage.py               # Django CLI
├── pyproject.toml          # Dependencies (managed by uv)
└── Dockerfile              # Container definition
```

## :material-tools: Development

### Setting up Virtual Environment

We recommend using `uv` or standard `venv`.

=== "uv"
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

### Database Migrations

=== "uv"
    ```bash
    uv run manage.py makemigrations
    uv run manage.py migrate
    ```
=== "python"
    ```bash
    python manage.py makemigrations
    python manage.py migrate
    ```
=== "python3"
    ```bash
    python3 manage.py makemigrations
    python3 manage.py migrate
    ```

### Running the Server

Start the development server at `http://localhost:8000`:

=== "uv"
    ```bash
    uv run manage.py runserver
    ```
=== "python"
    ```bash
    python manage.py runserver
    ```
=== "python3"
    ```bash
    python3 manage.py runserver
    ```

## :material-database: Data Models

We use a `CustomUser` model to handle specific business requirements (Teams, Roles).

```python title="PrimeBankApp/models.py"
class CustomUser(AbstractUser):
    email = models.EmailField(unique=True)
    team = models.ForeignKey(
        Team,
        on_delete=models.SET_NULL,
        related_name="members",
        null=True,
    )
    is_admin = models.BooleanField(default=False)
    # ...
    USERNAME_FIELD = "email"
```

## :material-graphql: GraphQL Architecture

The schema is split into multiple modules for better maintainability.

-   `schema.py`: Main entry point aggregation
-   `schema_auth.py`: Authentication mutations
-   `schema_time_clock.py`: Clock-in/out logic
-   `schema_kpi.py`: Performance metrics

### Example: Mutation Definition

Mutations are defined as Graphene classes and utilize Django Object Types.

```python title="PrimeBankApp/schema_time_clock.py"
class ClockIn(graphene.Mutation):
    class Arguments:
        user_id = graphene.ID(required=True)

    time_clock = graphene.Field(TimeClockType)

    @classmethod
    def mutate(cls, root, info, user_id):
        # Business logic validation
        if TimeClock.objects.filter(user_id=user_id, day=day).exists():
             raise GraphQLError("This user already clocked in today.")
        
        # ... logic to create TimeClock
```

## :material-test-tube: Testing

Run the test suite using `pytest`.

=== "uv"
    ```bash hl_lines="2"
    uv run pytest --cov=PrimeBankApp
    ```
=== "python"
    ```bash
    python manage.py test
    pytest
    ```

## :material-key: Authentication

The API uses **JWT** (JSON Web Tokens) via `django-graphql-jwt`.

-   **Mutation**: `tokenAuth` (Login)
-   **Mutation**: `refreshToken` (Keep session alive)
-   **Header**: `Authorization: JWT <token>`
