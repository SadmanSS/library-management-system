# Technical Design Document (TDD)
## Library Management System

**Document status:** Proposed technical baseline  
**Version:** 1.0

## 1. Purpose and Design Principles

This document describes a proposed technical structure for the Library Management System. It separates confirmed project choices from decisions that must be finalized during implementation.

Design principles:
- Keep frontend presentation separate from backend business rules.
- Enforce permissions and ownership checks in the backend.
- Treat borrowing requests, issue, and return as separate state transitions.
- Preserve inventory and loan consistency using transactions and constraints.
- Keep optional fine records separate from circulation and never implement payment processing.
- Prefer small, testable modules over a monolithic UI or API handler.

## 2. Technology Stack

### Selected
- **Frontend:** React with TypeScript.
- **Build tooling:** Vite (based on the current frontend setup).
- **Backend:** Python with FastAPI.
- **Interface:** REST-style JSON APIs.

### To finalize
- Database engine and migration tool.
- Authentication strategy and password hashing library.
- API schema/versioning conventions.
- Production hosting and deployment topology.
- Logging, backup, and monitoring services.

Do not introduce a database or infrastructure dependency until it is selected and documented.

## 3. High-Level Architecture

```text
Browser
  |
  v
React + TypeScript UI
  |  API client (HTTP/JSON)
  v
FastAPI routers
  |
  v
Authentication + authorization dependencies
  |
  v
Application/service layer
  |
  v
Repository/data-access layer
  |
  v
Database (technology to be selected)
```

The frontend is responsible for rendering pages, collecting input, and presenting API results. The backend is authoritative for business rules, permission checks, state transitions, and data integrity.

## 4. Suggested Repository Structure

```text
library-management-system/
├── docs/
│   ├── PRD.md
│   ├── SRS.md
│   └── TDD.md
├── frontend/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── common/
│   │   │   ├── layout/
│   │   │   ├── books/
│   │   │   └── circulation/
│   │   ├── pages/
│   │   │   ├── public/
│   │   │   ├── member/
│   │   │   ├── librarian/
│   │   │   └── admin/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── types/
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── package.json
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── routes/
│   │   ├── core/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── repositories/
│   │   └── main.py
│   ├── tests/
│   └── requirements.txt
├── .env.example
├── .gitignore
└── README.md
```

This is a target structure, not a claim that all these files already exist. Adapt it incrementally to the repository rather than moving everything at once.

## 5. Frontend Design

### 5.1 Main Views
- Public/catalogue: book search, results, and book details.
- Member: personal dashboard, current loans, due dates, history, and borrow requests.
- Librarian: catalogue and copy management, request queue, issue/return desk, and overdue list.
- Admin: account/role management, borrowing-policy settings, reports, and audit view.

### 5.2 Component and Service Boundaries
- Shared UI components: buttons, inputs, tables, dialogs, status indicators, loading/error states.
- Feature components: book cards, search filters, request actions, circulation forms.
- API services: centralize HTTP calls and error handling.
- Types: define API request and response types.
- Routes: separate navigation from page implementation.

### 5.3 Frontend Security
The UI may hide actions the current role cannot perform, but this is only a usability measure. Every protected operation must also be authorized by FastAPI.

## 6. Backend Design

### 6.1 Proposed Module Responsibilities
- **API routers:** HTTP parsing, dependency injection, response status and schema.
- **Schemas:** Pydantic request and response validation.
- **Services:** business rules and workflow transitions.
- **Repositories/data access:** persistence queries.
- **Models:** database entities, once a database is selected.
- **Core:** configuration, authentication helpers, permission definitions, and shared exceptions.

Keep route handlers thin. Avoid duplicating borrowing rules across multiple endpoints.

### 6.2 Proposed API Resource Groups
Exact paths and schemas should be confirmed as the API is implemented. A reasonable initial design is:

| Resource group | Typical operations |
|---|---|
| `/api/auth` | Login/logout or token/session operations, depending on chosen auth |
| `/api/books` | Search/list, details, and librarian catalogue CRUD |
| `/api/copies` | Inventory and copy status management |
| `/api/members` | Authorized member records and profile operations |
| `/api/borrow-requests` | Create, list by permission, approve, reject, cancel |
| `/api/loans` | Issue, list permitted loans, return, and history |
| `/api/reports` | Authorized operational reports |
| `/api/admin` | User, role, and policy administration |

An endpoint should be implemented only when its behavior, permissions, request schema, and response schema are defined.

## 7. Domain Model and Integrity

### 7.1 Main Entities
- **User:** login identity, status, role, and account metadata.
- **MemberProfile:** Student/Teacher subtype and library-specific attributes.
- **Book:** bibliographic record.
- **BookCopy:** an individually tracked physical copy.
- **BorrowRequest:** request status and review metadata.
- **Loan:** issue, due, and return information.
- **FineRecord (optional):** manually recorded fine/settlement details if the library requires them.
- **AuditEvent:** security- and operations-relevant activity.

### 7.2 Key Constraints
- A Book may have multiple BookCopy records.
- A BookCopy must not have more than one active Loan.
- A Loan must reference a valid member and copy.
- A returned loan must have a return timestamp.
- A pending request can be decided only once.
- Invalid status transitions must be rejected.
- Deactivated accounts cannot initiate new borrowing actions.
- FineRecord, if implemented, records information only; it does not initiate a payment.

Use database transactions and suitable uniqueness/foreign-key constraints to prevent race conditions when issuing copies.

## 8. Circulation State Model

Suggested request states:
- `pending`
- `approved`
- `rejected`
- `cancelled`
- `fulfilled` (after issue, if this distinction is useful)

Suggested loan states:
- `active`
- `returned`
- `lost` (only if loss handling is in scope)

Overdue should generally be derived when a loan is active and the current date is later than its due date. It should not replace the underlying active loan status.

Suggested copy states:
- `available`
- `on_loan`
- `unavailable`
- `maintenance`

If reservations are later implemented, add a reservation state and define its effect on availability explicitly.

## 9. Borrow and Return Transactions

### Issue
1. Authenticate the staff user and authorize Librarian permission.
2. Validate that the member is active and within borrowing limits.
3. Validate that the copy is available and has no active loan.
4. Within a transaction, create the loan, set issue and due dates, and update copy status.
5. Commit the transaction and return the loan representation.
6. If any step fails, roll back the entire transaction.

### Return
1. Authenticate and authorize the Librarian.
2. Load the active loan and associated copy.
3. Validate that the loan has not already been returned.
4. Within a transaction, record return date and staff actor, close the loan, and set copy status to Available or Maintenance as appropriate.
5. Commit and return the updated records.

The service layer and database constraints should protect against simultaneous requests attempting to issue the same copy.

## 10. Authorization Model

Top-level roles:
- `member`
- `librarian`
- `admin`

Student and Teacher are Member subtypes, not separate roles. Borrowing limits may vary by subtype through configuration.

Authorization must include:
- Role permission checks.
- Resource ownership checks for member-specific records.
- Validation of state transitions.
- Server-side enforcement for every protected endpoint.
- Audit logging for sensitive operations such as role changes, issue, and return.

Avoid relying on frontend route guards as the only security boundary.

## 11. Fine Records Without Payments (Optional)

Payment processing is explicitly out of scope. If the library requires fines:
- A staff member may record the amount, reason, and related loan.
- A staff member may update a manual status such as `unsettled`, `settled`, or `waived`, according to approved policy.
- Record who made the change and when.
- Do not store card/bank credentials or integrate payment providers.
- Do not automatically mark a fine settled merely because a book was returned.

If no fine policy is required, omit the FineRecord entity and related UI/API entirely.

## 12. Security and Configuration

- Store secrets in environment variables or the deployment platform's secret manager.
- Provide `.env.example` with placeholder values only; never commit real secrets.
- Configure CORS for known frontend origins rather than unrestricted production origins.
- Use secure password hashing if password authentication is selected.
- Validate all incoming data with Pydantic schemas.
- Return consistent errors without exposing stack traces or secrets.
- Apply rate limiting and additional controls as deployment requirements become clear.
- Define retention and backup rules before production data is used.

## 13. Testing Strategy

### Unit Tests
- Borrowing-limit validation.
- Request and loan state transitions.
- Due-date and overdue calculations.
- Fine record behavior if enabled.

### API Tests
- Successful catalogue search.
- Unauthorized and forbidden requests.
- Request approval and rejection.
- Issue and return workflows.
- Prevention of duplicate active loans.
- Member ownership enforcement.
- Input validation and not-found cases.

### Integration Tests
- Transaction consistency between loans and copy status.
- Concurrent attempts to issue the same copy.
- Authentication and role-based permissions across the API.

### Frontend Tests
- Forms display validation and API errors.
- Pages render loading, empty, success, and failure states.
- Restricted actions are hidden appropriately, while backend authorization remains authoritative.

## 14. Deployment and Operations

Deployment platform and database are not yet specified. Before production release:
- Configure separate development and production environments.
- Set environment variables and CORS origins per environment.
- Apply database migrations in a controlled process.
- Configure HTTPS, backups, logs, and health checks.
- Verify secrets are not committed.
- Run automated tests before merging and deploying.
- Document rollback and restore procedures.

## 15. Decisions to Finalize

1. Select the database and migration strategy.
2. Select and document the authentication/session approach.
3. Confirm Student and Teacher loan limits and durations.
4. Decide whether reservations and renewals are needed.
5. Decide whether fine records are needed; payment processing remains excluded.
6. Define account creation and recovery.
7. Choose deployment targets and operational requirements.
