# Library Management System — Frontend

The frontend of the Library Management System is built with **React, TypeScript, and Vite**. It provides the user interface for members, librarians, and administrators to interact with the library system.

## Tech Stack

- **React** — Component-based user interface
- **TypeScript** — Static typing and maintainable code
- **Vite** — Development server and build tool
- **React Router** — Client-side navigation (planned)
- **Fetch API** — Communication with the FastAPI backend
- **CSS** — Styling and responsive layouts

## Project Structure

```text
frontend/
├── public/                     # Static public assets
├── src/
│   ├── assets/                 # Images, icons, and other assets
│   │
│   ├── components/             # Reusable UI components
│   │   ├── layout/              # Navbar, sidebar, footer
│   │   ├── books/               # Book cards and search components
│   │   └── common/              # Buttons, loaders, shared UI
│   │
│   ├── pages/                  # Route-level pages
│   │   ├── public/               # Home, login, public book catalogue
│   │   ├── member/               # Member dashboard and personal loans
│   │   ├── librarian/            # Book and borrowing management
│   │   └── admin/                # User management and reports
│   │
│   ├── services/               # Backend API communication
│   │   ├── api.ts                # Shared API configuration
│   │   ├── bookService.ts        # Book-related API requests
│   │   ├── loanService.ts        # Loan-related API requests
│   │   └── userService.ts        # User-related API requests
│   │
│   ├── types/                  # Shared TypeScript types
│   │   ├── book.ts
│   │   └── user.ts
│   │
│   ├── routes/                 # Routing and route protection
│   │   ├── AppRoutes.tsx
│   │   └── ProtectedRoute.tsx
│   │
│   ├── App.tsx                 # Root application component
│   ├── main.tsx                # Application entry point
│   └── index.css               # Global styles
│
├── index.html
├── package.json
├── package-lock.json
├── tsconfig.json
└── vite.config.ts
```

**Note:** This structure describes the intended organization. Some folders and files may be added as the corresponding features are implemented.

## Application Roles

The application supports three top-level roles.

### 1. Member

Members can browse the book catalogue, search for books, submit borrowing requests, view their loans and borrowing history, and manage their own profiles.

Students and teachers are member subtypes rather than separate authorization roles. Their borrowing limits may differ according to library policy.

### 2. Librarian

Librarians manage books and physical copies, maintain availability information, process borrowing requests, issue and return books, and manage borrowing records.

### 3. Admin

Administrators manage user accounts and roles, configure system settings, and access reports and system activity information.

## Folder Responsibilities

| Folder | Responsibility |
|---|---|
| `components/` | Reusable interface elements shared across pages |
| `pages/` | Complete pages associated with application routes |
| `services/` | HTTP requests to the FastAPI backend |
| `types/` | TypeScript interfaces and type definitions |
| `routes/` | Route configuration and frontend access controls |
| `assets/` | Images, icons, and other imported resources |

## Backend Integration

The frontend communicates with the FastAPI backend through HTTP requests.

During local development, the backend is expected to run at:

```text
http://127.0.0.1:8000
```

The FastAPI interactive API documentation is available at:

```text
http://127.0.0.1:8000/docs
```

Backend requests should be organized in the `services/` directory rather than duplicated throughout individual pages.

Example API health-check request:

```typescript
const response = await fetch(
  "http://127.0.0.1:8000/api/health"
);

if (!response.ok) {
  throw new Error("Backend request failed");
}

const data = await response.json();
console.log(data);
```

For deployment, configure the API base URL appropriately for the target environment.

## Role-Based Access Control

The frontend may use the authenticated user's role to display appropriate navigation items and restrict access to certain pages.

However, frontend restrictions are not a substitute for backend security. **FastAPI must independently authenticate users and enforce authorization rules** for protected endpoints and operations.

## Development Setup

### Prerequisites

- Node.js and npm
- Git
- The project repository

### Installation

From the repository root:

```bash
cd frontend
npm install
```

### Start the development server

```bash
npm run dev
```

Vite typically serves the application at:

```text
http://localhost:5173
```

### Build for production

```bash
npm run build
```

### Run code quality checks

If configured in `package.json`, run:

```bash
npm run lint
```

## Development Guidelines

- Use TypeScript for React components and shared data types.
- Keep pages separate from reusable UI components.
- Put backend communication in `services/`.
- Reuse shared components instead of duplicating interface code.
- Keep role-specific pages organized by responsibility.
- Do not store secrets or private credentials in frontend code.
- Enforce authentication and permissions on the backend.
- Test changes locally before committing and opening a pull request.

## Project Status

The frontend structure is designed to support incremental development of the public homepage, book catalogue, member dashboard, librarian tools, and administration features.

Features should be documented as implemented only after their functionality has been developed and tested.

---

Part of the Library Management System project developed for CSE309.
