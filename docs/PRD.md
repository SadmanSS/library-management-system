# Product Requirements Document (PRD) — Library Management System

| Field | Value |
|---|---|
| Product | Library Management System (LMS) |
| Version | MVP + Beta + Future Phase |
| Releases | MVP — Midterm; Beta — Final; Payment Features — Future Development |
| Status | Draft baseline |
| Related documents | `SRS.md`, `TDD.md` |

This document defines what the product should do and why. Features are assigned to a release so the initial version stays achievable and later development is planned without overloading the first release.

## Documents in this set

| Document | Purpose |
|---|---|
| `PRD.md` | What the system does and why |
| `SRS.md` | Detailed requirements, permissions, and acceptance criteria |
| `TDD.md` | Architecture, data model, APIs, and technical decisions |

## 0. Release plan

| Release | Target | Focus |
|---|---|---|
| **MVP** | Midterm release | Core catalogue and circulation: books, copies, members, issue, return, and due dates |
| **Beta** | Final release | Login, role-based access, member self-service, borrow requests, dashboards, security, and deployment hardening |
| **Future Phase** | After Beta | Optional fines and payment-provider integration for approved library charges |

> **Payment scope:** No online payment processing is included in MVP or Beta. The future phase may support payment of library fines or other explicitly approved charges. Book borrowing and return must work without online payments.

## 1. Purpose

The Library Management System helps a library maintain its catalogue and physical copies, register members, issue and receive books, track due dates, and identify overdue loans. The project will be delivered incrementally: first a reliable core system, then secure multi-user capabilities, followed by optional online payments as a separate future enhancement.

## 2. Problem statement

Manual or disconnected records make it difficult to know which copies are available, who borrowed a book, when it is due, and whether it has been returned. The system should keep this information in one place and make routine library work easier without introducing unnecessary complexity.

## 3. Goals

| ID | Goal | Release |
|---|---|---|
| G-01 | Create, view, update, and archive book catalogue records | MVP |
| G-02 | Track individual book copies and their availability | MVP |
| G-03 | Maintain member records and Student/Teacher member categories | MVP |
| G-04 | Record book issue, due date, return, and loan status | MVP |
| G-05 | Identify overdue active loans and show clear API errors | MVP |
| G-06 | Provide a working React interface connected to the FastAPI REST API | MVP |
| G-07 | Add login, account management, and server-side permissions | Beta |
| G-08 | Let members view their own loans and submit borrowing requests | Beta |
| G-09 | Give Librarians circulation tools and Admins user/policy controls | Beta |
| G-10 | Deploy the application with secure configuration and persistent storage | Beta |
| G-11 | Optionally record fines and integrate a payment provider without storing payment-card data | Future Phase |

## 4. Target users and roles

| User | Main need | Release |
|---|---|---|
| Member | Search the catalogue, request books, and view own loans and due dates | MVP catalogue visibility; Beta self-service |
| Librarian | Manage catalogue and copies, issue/return books, and handle requests | MVP core circulation; Beta authenticated operations |
| Admin | Manage accounts, roles, borrowing rules, and reports | Beta |

The system has three top-level roles: **Member, Librarian, and Admin**. Student and Teacher are Member subtypes, not separate roles. Borrowing limits may vary by subtype through configuration.

## 5. Scope

### 5.1 In scope — MVP (midterm)

- Book catalogue CRUD: create, list, view, update, and archive books.
- Physical copy records with unique copy codes and availability status.
- Basic member records, including Student/Teacher subtype and active status.
- Issue a copy to a member and record the issue date and due date.
- Record returns and update copy availability.
- List current loans, returned loans, and overdue active loans.
- React pages/forms for the core workflows and FastAPI REST endpoints.
- Input validation, consistent errors, health check, and interactive API documentation.
- Local development with persistent relational storage selected for the implementation.

**MVP limitation:** It is a development/demo release and does not provide full login or role enforcement. It must not be exposed as a public production library service until the Beta security work is completed.

### 5.2 In scope — Beta (final)

- User login/logout and account status management.
- Three top-level roles: Member, Librarian, and Admin; enforce permissions in the backend.
- Link Member accounts to their member profile; Student and Teacher remain member subtypes.
- Members can browse books, submit/cancel eligible borrow requests, and view their own current loans and history.
- Librarians can approve/reject requests, issue books, record returns, manage copies, and view overdue loans.
- Admin can manage user accounts/roles, borrowing rules, and operational reports.
- Server-side ownership checks, secure password storage, safe secrets configuration, and API error handling.
- Deploy the frontend and API with a persistent database, HTTPS, health checks, and basic operational documentation.

### 5.3 Future Phase — payments

- Configure fine rules, if the library decides to charge for overdue, lost, or damaged items.
- Display a fine statement and payment status to the relevant Member.
- Integrate a hosted checkout/payment provider after requirements, provider availability, and local compliance are reviewed.
- Record provider transaction references, amount, currency, status, and timestamps.
- Handle payment success, failure, cancellation, and verified provider callbacks.
- Issue a receipt or payment confirmation and allow authorized staff to review payment history.

The application must not store card numbers, card security codes, banking passwords, or other raw payment credentials. Payment status must be confirmed by a trusted provider response—not merely by the user's browser redirect.

### 5.4 Out of scope for MVP and Beta

- Online payment processing and payment gateway integration.
- Book sales, e-commerce, or money transfers.
- RFID/barcode hardware integration unless separately approved.
- Inter-library loans, e-book DRM, and integrations with external institutional systems.
- Advanced recommendation engines or analytics beyond basic operational reports.

## 6. Features and priority (MoSCoW)

| ID | Feature | Release | Priority |
|---|---|---|---|
| F-01 | Create/list/view/update/archive books | MVP | Must |
| F-02 | Manage individual book copies and availability | MVP | Must |
| F-03 | Create/view/update/deactivate member records | MVP | Must |
| F-04 | Issue a book and set due date | MVP | Must |
| F-05 | Record returns and free the copy when appropriate | MVP | Must |
| F-06 | View active, returned, and overdue loans | MVP | Must |
| F-07 | Validate input and return understandable API errors | MVP | Must |
| F-08 | Health endpoint and interactive API documentation | MVP | Should |
| F-09 | React interface for core workflows | MVP | Must |
| F-10 | Login/logout and account status | Beta | Must |
| F-11 | Member/Librarian/Admin RBAC and ownership checks | Beta | Must |
| F-12 | Member profile and personal borrowing history | Beta | Must |
| F-13 | Borrow request and librarian approval/rejection | Beta | Must |
| F-14 | Admin account, role, and borrowing-policy management | Beta | Must |
| F-15 | Librarian dashboard and basic circulation reports | Beta | Should |
| F-16 | Deployment hardening, environment configuration, and backups plan | Beta | Must |
| F-17 | Fine rules and manual fine records | Future Phase | Could |
| F-18 | Hosted payment provider and transaction records for fines | Future Phase | Could |
| F-19 | Payment receipts and reconciliation view | Future Phase | Could |

## 7. User stories

### MVP

| ID | User story | Feature |
|---|---|---|
| US-01 | As a Librarian, I want to add and update books so that the catalogue stays accurate. | F-01 |
| US-02 | As a Librarian, I want to track each physical copy so I know what is available. | F-02 |
| US-03 | As a Librarian, I want to register members so that loans can be associated with the correct person. | F-03 |
| US-04 | As a Librarian, I want to issue a copy with a due date so that a loan is recorded. | F-04 |
| US-05 | As a Librarian, I want to record a return so that the copy can become available again. | F-05 |
| US-06 | As a Librarian, I want to see overdue loans so I can follow up on them. | F-06 |
| US-07 | As a maintainer, I want a health endpoint and API docs so that I can check the service. | F-07, F-08 |

### Beta

| ID | User story | Feature |
|---|---|---|
| US-08 | As a Member, I want to log in and see my own loan records so my information remains private. | F-10, F-11, F-12 |
| US-09 | As a Member, I want to request an available book so I can ask to borrow it. | F-13 |
| US-10 | As a Librarian, I want to approve or reject requests so borrowing is controlled. | F-13 |
| US-11 | As a Librarian, I want to manage catalogue and circulation after login. | F-11 |
| US-12 | As an Admin, I want to manage accounts, roles, and borrowing rules. | F-14 |
| US-13 | As a Librarian, I want to see active and overdue loans in one place. | F-15 |
| US-14 | As a maintainer, I want secure deployment configuration and a persistent database. | F-16 |

### Future Phase

| ID | User story | Feature |
|---|---|---|
| US-15 | As a Member, I want to see an approved fine and pay it through a trusted provider if online payment is enabled. | F-17, F-18 |
| US-16 | As a Member, I want a payment confirmation for a successful fine payment. | F-19 |
| US-17 | As a Librarian, I want to review payment status without handling raw payment credentials. | F-18, F-19 |

## 8. Success criteria

| Release | Success criteria |
|---|---|
| MVP | A book can be created, found, updated, and archived; copy availability changes correctly after issue and return; active overdue loans can be listed; core API endpoints and frontend work locally. |
| Beta | Unauthorized roles are blocked by the API; Members can only see their own profile and loans; Librarians can process requests and returns; Admins can manage accounts and rules; the deployed system retains data across restarts/redeploys. |
| Future Phase | A payment is recorded only after provider verification; duplicate callbacks do not create duplicate successful payments; payment history and receipts are available; no raw card data is stored by the LMS. |

## 9. Release milestones

| MVP milestone | Deliverable |
|---|---|
| M1 — Catalogue | Book and copy data models and CRUD API |
| M2 — Members | Member records and validation |
| M3 — Circulation | Issue, return, due date, and overdue tracking |
| M4 — Core demo | React workflows integrated with the FastAPI API; health/docs available |

| Beta milestone | Deliverable |
|---|---|
| B1 — Accounts | Login/logout and account/profile foundation |
| B2 — Permissions | Member, Librarian, and Admin roles enforced server-side |
| B3 — Self-service | Member loans/history and borrow requests |
| B4 — Staff/admin tools | Request review, dashboards, account and policy management |
| B5 — Release | Persistent deployment, security checks, and documented setup |

| Future milestone | Deliverable |
|---|---|
| P1 — Policy | Approved fine/charge rules and payment requirements |
| P2 — Provider | Hosted checkout integration and verified callbacks in a test environment |
| P3 — Reconciliation | Payment history, confirmation/receipt, failure handling, and security review |

## 10. Assumptions and constraints

- Frontend: React with TypeScript, built with the repository's Vite setup.
- Backend: Python with FastAPI; the API returns JSON and exposes OpenAPI documentation.
- The database must persist book, copy, member, and loan records. A local database can be used during development; hosted deployment requires storage that persists across restarts and serverless executions.
- Exact loan duration and borrowing limits must be approved and configured rather than guessed.
- Student and Teacher are Member subtypes, not separate top-level roles.
- Payment provider, currency, fee rules, refund policy, and settlement procedure are undecided and belong to the Future Phase.
