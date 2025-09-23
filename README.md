# Blob Upload Site - FastAPI File Manager Example

A basic file manager demonstrating FastAPI, Azure SDK for Python integration, authentication with Microsoft Entra ID (Azure AD), JWT token verification, and PostgreSQL-based permissions management.

## Features

- **FastAPI** backend for high-performance API.
- **Azure SDK for Python** handles file storage in Azure Blob Storage.
- **Entra ID (Azure AD)** login and JWT token validation (using `@azure/msal-react` on frontend, JWT validation in backend).
- **PostgreSQL** is used for storing users, containers, and ACL (permissions).
- **Frontend** built with React and MSAL for SPA authentication.

## Project Structure

```
src/
  backend/
    main.py                # FastAPI app entry
    routers/
      auth.py              # Username/password login, token generation when not using entra id
      jwt1.py              # Entra ID JWT validation
    database/
      database.py          # PostgreSQL connection, user/container/ACL logic
      init/
        init.db            # PostgreSQL init.db script for creating tables and relations
    storage/
      blob.py              # Azure Blob Storage operations
  frontend/
    file-manager1/
      src/
        App.jsx            # File manager UI
        authConfig.js      # MSAL/Entra config
terraform/
  environments/
    dev/
      provider.tf          # Azure provider config
```

## Authentication & Authorization

- **Frontend**: Uses Microsoft Entra ID (Azure AD) for user login via MSAL.
- **Backend**: Validates JWT tokens from Entra ID; also supports form-based login for test users.
- **Authorization**: Permissions stored in the ACL table in PostgreSQL. Each user gets permissions per container (`read`, `write`, `owner`).

## API Overview

- `POST /auth/token` — Get JWT token for test users.
- `POST /container/create/{containerName}` — Create new storage container (requires auth).
- `GET /containers` — List accessible containers for user.
- `POST /upload/{dstContainer}` — Upload file to container (requires permission).
- Additional endpoints: manage blobs, containers, permissions.

## Database Schema

### Tables

- **USERS**
  - `ID` (PK)
  - `USERNAME` (unique)

- **CONTAINERS**
  - `ID` (PK)
  - `NAME`
  - `SACCOUNT`

- **ACL**
  - `CONTAINER_ID` (FK to CONTAINERS)
  - `USER_ID` (FK to USERS)
  - `ACL` (`read`, `write`, `owner`)

### Database Diagram


<img src="db.png" width="100%" style="position: relative; top: 0; right: 0;" alt="Project Logo"/>


## Getting Started

1. **Configure Azure**
   - Register apps in Entra ID for SPA and API.
   - Set up Azure Blob Storage and grant required permissions.
2. **Database**
   - Provision PostgreSQL (local or cloud).
   - Create tables: USERS, CONTAINERS, ACL as per schema.
3. **Environment Variables**
   - Set up `.env` with DB, Azure, and Entra settings (`DB`, `SECRET`, `ISSUER`, etc.).
4. **Run Backend**
   ```
   cd src/backend
   uvicorn main:app --reload
   ```
5. **Run Frontend**
   ```
   cd src/frontend/file-manager1
   npm install
   npm run dev
   ```

## Example Usage

- Login via Microsoft
- Create a container
- Upload files (only with appropriate permissions)
- List files in containers

## Technologies

- FastAPI
- Azure SDK for Python
- PostgreSQL
- React + MSAL
- JWT / OAuth2

## License

MIT

---

*This project is designed for learning modern authentication and cloud integration patterns with Python and JavaScript.*
