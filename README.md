# Blob Upload Site - FastAPI File Manager Example

A basic file manager demonstrating FastAPI, Azure SDK for Python integration, authentication with Microsoft Entra ID (Azure AD), JWT token verification, and PostgreSQL-based permissions management.
## Login screen
<p align="center">
<img width=50% height=50% alt="image" src="https://github.com/user-attachments/assets/d49e5485-5686-49f5-8157-d660a72a80af" />
</p>
## After Authentication
<p align="center">
<img width=50% height=50% alt="image" src="https://github.com/user-attachments/assets/c24b4c44-0562-4832-8d8a-d6582aafae03" />
</p>

## Features

- **FastAPI** backend for high-performance API.
- **Azure SDK for Python** handles file storage in Azure Blob Storage.
- **Entra ID (Azure AD)** login and JWT token validation (using `@azure/msal-react` on frontend, JWT validation in backend).
- **PostgreSQL** is used for storing users, containers, and ACL (permissions).
- **Frontend** built with React and MSAL for SPA authentication.

## Permission requirements
- Storage Account Blob Data Contributor for function app for generating download urls
- User Access Administrator for service principal of terraform to add permissions for function app
- at least Contributor for service principal on the "dev" resource group level for provisioning resources

## Azure Function App
- Uses 3.12 Python runtime with v2 version of the Function app
- Consume Plan for the app service
## Env variables
- ISSUER="https://login.microsoftonline.com/{tenant-id}/v2.0" **BACKEND**
- tenantUrl="https://login.microsoftonline.com/{tenant-id}/discovery/v2.0/keys" **BACKEND**
- audience=api://{api-id} for who is entra id issuing a token **BACKEND**
- "DB" connection string to postgres - **BACKEND**
- aUrl=storageAccountURL**BACKEND**
- storageAccountName **BACKEND**
## Frontend
- On app registration you need to specify the redirection path for your api
- as this project is not yet set up for htpps encryption you can use http://localhost:8000 like in code
  or change it for your own

## Authentication & Authorization

- **Frontend**: Uses Microsoft Entra ID (Azure AD) for user login via MSAL.
- **Backend**: Validates JWT tokens from Entra ID; also supports form-based login for test users.
- **Authorization**: Permissions stored in the ACL table in PostgreSQL. Each user gets permissions per container (`read`, `write`, `owner`).

## API Overview

- `POST /auth/token` — Get JWT token for test users.
- `POST /container/create/{containerName}` — Create new storage container (requires auth).
- `GET /containers` — List accessible containers for user.
- `POST /upload/{dstContainer}` — Upload file to container (requires permission).
- `POST /download/{dstContainer}/{filename}` — Get a file download url (requires permission).
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
   - You can use init.db file in the backend folder for quick setup
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
