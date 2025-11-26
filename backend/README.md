# P2P Backend - Django REST Framework

Backend API for the Procure-to-Pay (P2P) system built with Django and Django REST Framework.

## Tech Stack

- **Python**: 3.11+
- **Package Manager**: [uv](https://github.com/astral-sh/uv) (faster alternative to pip)
- **Framework**: Django 4.2
- **API**: Django REST Framework 3.14
- **Database**: PostgreSQL 15
- **Authentication**: JWT (djangorestframework-simplejwt)
- **File Storage**: Cloudinary
- **AI Processing**: OpenAI GPT-4
- **Testing**: pytest

---

## Quick Start with uv

### 1. Install uv

```bash
# macOS/Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# Windows
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"

# Or via pip
pip install uv
```

### 2. Setup Virtual Environment

```bash
cd backend

# Create virtual environment
uv venv

# Activate virtual environment
# On Windows:
.venv\Scripts\activate
# On macOS/Linux:
source .venv/bin/activate
```

### 3. Install Dependencies

```bash
# Install all dependencies (including dev dependencies)
uv pip install -e ".[dev]"

# Or production dependencies only
uv pip install -e .
```

### 4. Environment Configuration

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your configuration
```

### 5. Database Setup

```bash
# Run migrations
uv run python manage.py migrate

# Create superuser
uv run python manage.py createsuperuser
```

### 6. Run Development Server

The development server can be run using Django's built-in server or Uvicorn for an ASGI-compatible setup.

**Using Django's `runserver`:**
```bash
uv run python manage.py runserver
```

**Using `Uvicorn` (for ASGI):**

This is recommended for development to better match the production environment.
```bash
uv run uvicorn backend.asgi:application --reload --port 8000
```

API will be available at: http://localhost:8000/api

---

## Common Development Commands

All `manage.py` commands should be executed via `uv run`.

- **Create a new app:**
  ```bash
  uv run python manage.py startapp <app_name>
  ```

- **Create new migrations:**
  ```bash
  uv run python manage.py makemigrations
  ```

- **Apply migrations:**
  ```bash
  uv run python manage.py migrate
  ```

- **Open Django shell:**
  ```bash
  uv run python manage.py shell
  ```

- **Run tests:**
  ```bash
  uv run pytest
  ```

---

## Using uv Commands

### Install Dependencies

```bash
# Install from pyproject.toml
uv pip install -e ".[dev]"

# Install specific package
uv pip install django-extensions

# Install from requirements.txt (legacy)
uv pip install -r requirements.txt
```

### Update Dependencies

```bash
# Update all packages
uv pip install --upgrade -e ".[dev]"

# Update specific package
uv pip install --upgrade django
```

### Sync Dependencies

```bash
# Ensure environment matches pyproject.toml exactly
uv pip sync pyproject.toml
```

### List Installed Packages

```bash
uv pip list
```

### Generate requirements.txt (if needed)

```bash
uv pip freeze > requirements.txt
```

---

## Project Structure

```
backend/
├── apps/
│   ├── users/              # User authentication & management
│   │   ├── models.py       # Custom User model with roles
│   │   ├── serializers.py  # API serializers
│   │   ├── views.py        # API views
│   │   ├── permissions.py  # Role-based permissions
│   │   └── tests/          # Unit tests
│   ├── requests/           # Purchase requests (Day 2)
│   ├── approvals/          # Approval workflow (Day 3)
│   ├── purchase_orders/    # PO generation (Day 4)
│   ├── receipts/           # Receipt validation (Day 5)
│   └── analytics/          # Finance dashboards (Day 6)
├── backend/
│   ├── settings.py         # Django settings
│   ├── urls.py             # URL routing
│   └── wsgi.py             # WSGI config
├── pyproject.toml          # uv dependencies & project config
├── .python-version         # Python version for uv
├── pytest.ini              # pytest configuration (deprecated - moved to pyproject.toml)
├── manage.py               # Django management
└── Dockerfile              # Docker configuration with uv
```

---

## Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=apps --cov-report=html

# Run specific test file
pytest apps/users/tests/test_models.py

# Run specific test
pytest apps/users/tests/test_views.py::TestLoginView::test_login_success -v
```

Coverage report will be in `htmlcov/index.html`

---

## API Endpoints

### Authentication

- `POST /api/auth/register/` - User registration
- `POST /api/auth/login/` - User login (returns JWT tokens)
- `POST /api/auth/refresh/` - Refresh access token
- `GET /api/auth/me/` - Get current user profile
- `PATCH /api/auth/me/` - Update user profile
- `POST /api/auth/change-password/` - Change password

### Admin

- `/admin/` - Django admin panel

---

## Environment Variables

Required environment variables (see `.env.example`):

```env
# Django
DEBUG=True
SECRET_KEY=your-secret-key
ALLOWED_HOSTS=localhost,127.0.0.1

# Database
DB_NAME=p2p_db
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=5432

# Cloudinary (for file storage)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# OpenAI (for document processing)
OPENAI_API_KEY=sk-your-openai-key
OPENAI_MODEL=gpt-5

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

---

## Docker Usage

```bash
# Build and run with Docker Compose
docker-compose up -d --build

# Run migrations in container
docker-compose exec backend python manage.py migrate

# Create superuser in container
docker-compose exec backend python manage.py createsuperuser

# Run tests in container
docker-compose exec backend pytest

# View logs
docker-compose logs -f backend
```

---

## Development Workflow

### 1. Create New Django App

```bash
python manage.py startapp app_name apps/app_name
```

### 2. Make Migrations

```bash
python manage.py makemigrations
python manage.py migrate
```

### 3. Create Migration

```bash
python manage.py makemigrations app_name
```

### 4. Run Shell

```bash
python manage.py shell
```

### 5. Create Admin User

```bash
python manage.py createsuperuser
```

---

## Database Management

### PostgreSQL Commands

```bash
# Connect to database
docker-compose exec db psql -U postgres -d p2p_db

# List tables
\dt

# Describe table
\d users_user

# Exit
\q
```

### Backup Database

```bash
# Backup
docker-compose exec db pg_dump -U postgres p2p_db > backup.sql

# Restore
docker-compose exec -T db psql -U postgres p2p_db < backup.sql
```

---

## Code Quality

### Linting with Ruff

```bash
# Install ruff (included in dev dependencies)
uv pip install ruff

# Lint code
ruff check .

# Fix auto-fixable issues
ruff check --fix .

# Format code
ruff format .
```

Configuration is in `pyproject.toml` under `[tool.ruff]`

---

## Performance

### Why uv?

uv is 10-100x faster than pip:

| Operation | pip | uv | Speedup |
|-----------|-----|-----|---------|
| Install from cache | ~5s | ~0.1s | **50x** |
| Fresh install | ~30s | ~3s | **10x** |
| Resolve dependencies | ~10s | ~0.5s | **20x** |

### Benchmarks

```bash
# Benchmark installation
time uv pip install -e ".[dev]"
# vs
time pip install -e ".[dev]"
```

---

## Troubleshooting

### uv not found

```bash
# Add uv to PATH
export PATH="$HOME/.cargo/bin:$PATH"

# Or reinstall
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### Dependencies not installing

```bash
# Clear uv cache
uv cache clean

# Reinstall
uv pip install -e ".[dev]"
```

### Database connection error

```bash
# Check PostgreSQL is running
docker-compose ps

# Restart database
docker-compose restart db

# Check connection
docker-compose exec db psql -U postgres -d p2p_db -c "SELECT 1"
```

---

## Resources

- [uv Documentation](https://github.com/astral-sh/uv)
- [Django Documentation](https://docs.djangoproject.com/en/4.2/)
- [Django REST Framework](https://www.django-rest-framework.org/)
- [pytest-django](https://pytest-django.readthedocs.io/)

---

## Next Steps

After Day 1 setup, continue with:
- **Day 2**: Purchase Request Creation
- **Day 3**: Approval Workflow
- **Day 4**: PO Generation
- **Day 5**: Receipt Validation
- **Day 6**: Finance Dashboard

See `docs/implementation-plan/01-SPRINT-PLAN.md` for details.
