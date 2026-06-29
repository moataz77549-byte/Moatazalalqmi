# Moataz AI — API Summary
## Version: v1

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/auth/register | User registration with email verification |
| POST | /api/v1/auth/login | Login with rate limiting (10/15min) |
| POST | /api/v1/auth/logout | Session revocation |
| POST | /api/v1/auth/refresh | Token refresh with rotation |
| POST | /api/v1/auth/verify-email | Email verification |
| POST | /api/v1/auth/forgot-password | Password reset request |
| POST | /api/v1/auth/reset-password | Password reset confirmation |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/users | List users (paginated, auth required) |
| GET | /api/v1/users/[id] | Get user by ID |
| PATCH | /api/v1/users/[id] | Update user profile |

### Organizations
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/organizations | List user's organizations |
| POST | /api/v1/organizations | Create organization |
| GET | /api/v1/organizations/[orgId] | Get organization |
| PATCH | /api/v1/organizations/[orgId] | Update organization |
| GET | /api/v1/organizations/[orgId]/teams | List teams |
| POST | /api/v1/organizations/[orgId]/teams | Create team |
| GET | /api/v1/organizations/[orgId]/projects | List projects |
| POST | /api/v1/organizations/[orgId]/projects | Create project |

### API Keys
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/api-keys | List API keys (masked) |
| POST | /api/v1/api-keys | Create API key |

### System
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/health | Health check with database connectivity |

### Standard Response Format
```json
{
  "success": true,
  "data": {},
  "message": "Operation completed",
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```
