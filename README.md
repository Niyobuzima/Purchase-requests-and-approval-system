# Procure-to-Pay (P2P) System

A comprehensive purchase request and approval management system built with Django REST Framework and React.

## Overview

This system streamlines the procurement process from purchase request creation through approval workflows to purchase order generation and receipt validation. It features AI-powered document processing, multi-level approvals, and comprehensive finance dashboards.

## Key Features

- **Role-Based Access Control**: Staff, Level 1/2 Approvers, Finance
- **Purchase Request Management**: Create, track, and manage purchase requests
- **AI Document Processing**: Automated invoice/receipt data extraction using GPT-4
- **Multi-Level Approval Workflow**: Secure, concurrency-safe approval process
- **Automated PO Generation**: Purchase orders auto-generated on final approval
- **Receipt Validation**: AI-powered receipt comparison against POs
- **Finance Dashboard**: Analytics, reports, and export functionality
- **Real-time Notifications**: Status updates for all stakeholders
- **Search & Filtering**: Advanced search, filtering, and pagination

## Tech Stack

### Backend
- **Django 4.2** - Web framework
- **Django REST Framework** - API development
- **PostgreSQL** - Database
- **JWT** - Authentication (djangorestframework-simplejwt)
- **Cloudinary** - File storage
- **OpenAI GPT-4** - Document processing
- **Docker** - Containerization

### Frontend
- **React 18** - UI framework
- **React Router v6** - Routing
- **Axios** - HTTP client
- **Tailwind CSS** - Styling
- **Vite** - Build tool

## Project Structure

```
purchase-requests-and-approval-system/
├── backend/
│   ├── apps/
│   │   ├── users/           # Authentication & user management
│   │   ├── requests/        # Purchase requests
│   │   ├── approvals/       # Approval workflow
│   │   ├── purchase_orders/ # PO generation
│   │   ├── receipts/        # Receipt validation
│   │   ├── notifications/   # User notifications
│   │   └── analytics/       # Finance dashboards
│   ├── utils/               # AI processing, PDF generation
│   ├── backend/             # Django settings
│   └── manage.py
├── frontend/
│   └── src/
│       ├── features/        # Page components by role
│       ├── components/      # Reusable components
│       ├── api/             # API services
│       ├── context/         # React context
│       └── routes/          # Route configuration
├── docs/
│   └── implementation-plan/ # Detailed implementation guides
├── docker-compose.yml
└── README.md
```

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for local frontend development)
- Python 3.11+ (for local backend development)
- Cloudinary account
- OpenAI API key

### Environment Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd purchase-requests-and-approval-system
   ```

2. **Create environment files**

   Backend (`.env`):
   ```bash
   cp backend/.env.example backend/.env
   ```

   Edit `backend/.env`:
   ```env
   DEBUG=True
   SECRET_KEY=your-secret-key-here
   DB_NAME=p2p_db
   DB_USER=postgres
   DB_PASSWORD=postgres
   DB_HOST=db
   DB_PORT=5432
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret
   OPENAI_API_KEY=sk-your-openai-key
   OPENAI_MODEL=gpt-4-turbo-preview
   CORS_ALLOWED_ORIGINS=http://localhost:5173
   ```

   Frontend (`.env.local`):
   ```bash
   cp frontend/.env.example frontend/.env.local
   ```

   Edit `frontend/.env.local`:
   ```env
   VITE_API_BASE_URL=http://localhost:8000/api
   ```

3. **Start the application**

   ```bash
   docker-compose up -d --build
   ```

4. **Run database migrations**

   ```bash
   docker-compose exec backend python manage.py migrate
   ```

5. **Create a superuser**

   ```bash
   docker-compose exec backend python manage.py createsuperuser
   ```

6. **Access the application**

   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000/api
   - Admin Panel: http://localhost:8000/admin

### Create Demo Users

```bash
docker-compose exec backend python manage.py shell
```

```python
from django.contrib.auth import get_user_model
User = get_user_model()

# Staff user
User.objects.create_user(
    username='staff',
    email='staff@demo.com',
    password='Demo1234!',
    role='STAFF',
    first_name='John',
    last_name='Staff'
)

# Level 1 Approver
User.objects.create_user(
    username='approver1',
    email='approver1@demo.com',
    password='Demo1234!',
    role='APPROVER_L1',
    first_name='Jane',
    last_name='Approver'
)

# Level 2 Approver
User.objects.create_user(
    username='approver2',
    email='approver2@demo.com',
    password='Demo1234!',
    role='APPROVER_L2',
    first_name='Bob',
    last_name='Senior'
)

# Finance user
User.objects.create_user(
    username='finance',
    email='finance@demo.com',
    password='Demo1234!',
    role='FINANCE',
    first_name='Alice',
    last_name='Finance'
)
```

## Usage Guide

### For Staff Users

1. **Create Purchase Request**
   - Navigate to "Create Request"
   - Fill in title, description, vendor
   - Add line items (description, quantity, price)
   - Optional: Upload invoice PDF (AI will extract data)
   - Submit request

2. **Track Requests**
   - View "My Requests"
   - See approval status
   - View linked purchase orders
   - Download POs when generated

### For Approvers

1. **Review Pending Approvals**
   - View requests requiring your approval
   - Review request details and items
   - Approve or reject with comments

2. **Level-Based Access**
   - Level 1: Initial approval
   - Level 2: Final approval (triggers PO generation)

### For Finance Users

1. **Dashboard**
   - View summary statistics
   - Monitor spending trends
   - Review pending receipts

2. **Receipt Validation**
   - Review uploaded receipts
   - See AI-generated discrepancy reports
   - Approve or reject receipts

3. **Reports**
   - Export data to CSV
   - Filter by date range
   - View spending analytics

## API Documentation

### Authentication

```bash
# Register
POST /api/auth/register/
{
  "username": "john",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "password2": "SecurePass123!",
  "role": "STAFF"
}

# Login
POST /api/auth/login/
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}

# Response
{
  "user": { ... },
  "tokens": {
    "access": "eyJ0eXAi...",
    "refresh": "eyJ0eXAi..."
  }
}

# Refresh Token
POST /api/auth/refresh/
{
  "refresh": "eyJ0eXAi..."
}
```

### Purchase Requests

```bash
# Create Request
POST /api/requests/
Authorization: Bearer <access_token>
{
  "title": "Office Supplies",
  "vendor_name": "Staples",
  "items": [
    {
      "description": "Printer Paper",
      "quantity": 10,
      "unit_price": "25.00"
    }
  ]
}

# List My Requests
GET /api/requests/
Authorization: Bearer <access_token>

# Get Request Details
GET /api/requests/{id}/
Authorization: Bearer <access_token>

# Upload Document
POST /api/requests/{id}/upload_document/
Authorization: Bearer <access_token>
Content-Type: multipart/form-data

document: <file>
```

### Approvals

```bash
# List Pending Approvals
GET /api/approvals/pending/
Authorization: Bearer <access_token>

# Approve Request
POST /api/approvals/{id}/approve/
Authorization: Bearer <access_token>
{
  "comments": "Approved for business needs"
}

# Reject Request
POST /api/approvals/{id}/reject/
Authorization: Bearer <access_token>
{
  "comments": "Insufficient justification"
}
```

### Purchase Orders

```bash
# List Purchase Orders
GET /api/purchase-orders/
Authorization: Bearer <access_token>

# Get PO Details
GET /api/purchase-orders/{id}/
Authorization: Bearer <access_token>

# Download PO PDF
GET /api/purchase-orders/{id}/download/
Authorization: Bearer <access_token>
```

For complete API documentation, see [docs/implementation-plan/](docs/implementation-plan/)

## Testing

### Backend Tests

```bash
# Run all tests
docker-compose exec backend pytest

# With coverage
docker-compose exec backend pytest --cov=apps --cov-report=html

# Run specific test
docker-compose exec backend pytest apps/requests/tests/test_models.py
```

### Frontend Tests

```bash
cd frontend
npm test

# With coverage
npm test -- --coverage
```

## Deployment

See [docs/implementation-plan/10-DEPLOYMENT-GUIDE.md](docs/implementation-plan/10-DEPLOYMENT-GUIDE.md) for detailed deployment instructions.

### Quick Deploy to Render.com

1. Push code to GitHub
2. Create Render account
3. Create PostgreSQL database
4. Create Web Service (backend)
5. Create Static Site (frontend)
6. Configure environment variables
7. Deploy!

Production URL: https://your-app.onrender.com

## Development Guide

### Backend Development

```bash
# Install dependencies
cd backend
pip install -r requirements.txt

# Create new app
python manage.py startapp app_name

# Make migrations
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Run development server
python manage.py runserver

# Django shell
python manage.py shell
```

### Frontend Development

```bash
# Install dependencies
cd frontend
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Database Management

```bash
# Access database
docker-compose exec db psql -U postgres -d p2p_db

# Backup database
docker-compose exec db pg_dump -U postgres p2p_db > backup.sql

# Restore database
docker-compose exec -T db psql -U postgres p2p_db < backup.sql

# Reset database
docker-compose down -v
docker-compose up -d
docker-compose exec backend python manage.py migrate
```

## Implementation Timeline

| Day | Focus | Deliverables |
|-----|-------|--------------|
| 1 | Setup + Auth | Project structure, JWT auth, Docker |
| 2 | Purchase Requests | CRUD operations, file upload, AI processing |
| 3 | Approval Workflow | Multi-level approvals, concurrency safety |
| 4 | PO Generation | Auto-generation, PDF creation |
| 5 | Receipt Validation | Upload, AI comparison, discrepancies |
| 6 | Finance Dashboard | Analytics, reports, exports |
| 7-8 | Search & Polish | Filters, pagination, UI improvements |
| 9 | Testing | Unit tests, integration tests, E2E |
| 10 | Deployment | Production deploy, documentation |

For detailed implementation steps, see [docs/implementation-plan/01-SPRINT-PLAN.md](docs/implementation-plan/01-SPRINT-PLAN.md)

## Documentation

All implementation documentation is available in the `docs/implementation-plan/` directory:

1. [01-SPRINT-PLAN.md](docs/implementation-plan/01-SPRINT-PLAN.md) - Day-by-day implementation guide
2. [02-MONOREPO-STRUCTURE.md](docs/implementation-plan/02-MONOREPO-STRUCTURE.md) - Project structure
3. [03-DJANGO-MODELS.md](docs/implementation-plan/03-DJANGO-MODELS.md) - Database models
4. [04-DJANGO-SERIALIZERS.md](docs/implementation-plan/04-DJANGO-SERIALIZERS.md) - API serializers
5. [05-DJANGO-VIEWS.md](docs/implementation-plan/05-DJANGO-VIEWS.md) - API endpoints
6. [06-DOCKER-CONFIG.md](docs/implementation-plan/06-DOCKER-CONFIG.md) - Docker setup
7. [07-FRONTEND-IMPLEMENTATION.md](docs/implementation-plan/07-FRONTEND-IMPLEMENTATION.md) - React components
8. [08-FEATURE-BY-FEATURE.md](docs/implementation-plan/08-FEATURE-BY-FEATURE.md) - Feature implementation
9. [09-TESTING-STRATEGY.md](docs/implementation-plan/09-TESTING-STRATEGY.md) - Testing guide
10. [10-DEPLOYMENT-GUIDE.md](docs/implementation-plan/10-DEPLOYMENT-GUIDE.md) - Production deployment

## Troubleshooting

### Common Issues

**Database Connection Error**
```bash
# Restart database
docker-compose restart db

# Check database logs
docker-compose logs db
```

**Frontend Can't Connect to Backend**
- Verify `VITE_API_BASE_URL` in `.env.local`
- Check CORS settings in backend
- Ensure backend is running

**File Upload Fails**
- Verify Cloudinary credentials
- Check file size (max 10MB)
- Ensure PDF format

**Tests Failing**
```bash
# Reset test database
docker-compose exec backend pytest --create-db

# Run with verbose output
docker-compose exec backend pytest -v
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Security

- JWT tokens with automatic refresh
- Role-based access control on all endpoints
- File upload validation (type, size)
- Concurrency protection on approvals
- HTTPS enforced in production
- Environment variables for secrets

## License

This project is licensed under the MIT License.

## Support

For issues and questions:
- Create an issue in the repository
- Check documentation in `docs/implementation-plan/`
- Review API documentation

## Acknowledgments

- Django REST Framework team
- React team
- OpenAI for GPT-4 API
- Cloudinary for file storage

---

**Built with ❤️ for IST Africa**
