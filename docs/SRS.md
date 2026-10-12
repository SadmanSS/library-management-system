# Software Requirements Specification (SRS)
## Library Management System

**Document status:** Initial requirements baseline  
**Version:** 1.0

## 1. Purpose

This document specifies the expected behavior and quality requirements for the Library Management System. It is a baseline for implementation and testing; policy values that have not yet been confirmed are explicitly left configurable or unresolved.

## 2. System Scope

The system manages library catalogue records, physical copies, members, borrowing requests, loans, returns, due dates, overdue records, and basic reports. It does not process payments. Any fine or repayment settlement may be recorded manually by authorized staff if the library adopts such a policy.

## 3. User Classes and Authorization

### 3.1 Member
Student and Teacher are member subtypes. They share the Member authorization role, though configurable limits may differ by subtype.

Permitted actions:
- Search and view catalogue records and availability.
- Submit or cancel eligible requests.
- View and update permitted profile fields.
- View their own active loans, due dates, history, and any applicable recorded fine/settlement details.

Prohibited actions:
- Manage catalogue or inventory.
- Approve requests, issue books, or record returns.
- Access another member's private records.
- Change roles or system configuration.

### 3.2 Librarian
Permitted actions:
- Manage catalogue entries and physical copies.
- Review member information required for library operations.
- Approve or reject requests.
- Issue books and record returns.
- Review active, returned, and overdue loans.
- Record applicable fine/settlement information manually if enabled.

### 3.3 Admin
Permitted actions:
- Manage accounts and assign roles.
- Configure borrowing rules and member-subtype limits.
- View system-level reports and audit records.
- Manage system settings.

Administrative privilege should not automatically bypass the need for auditable changes to circulation records.

## 4. Functional Requirements

### FR-01: Authentication
The system shall authenticate users before granting access to protected resources. Authentication mechanism, session/token lifetime, and recovery policy must be finalized in the technical design.

### FR-02: Authorization
The backend shall enforce permissions for every protected operation. Hiding a button in the frontend alone is not sufficient authorization.

### FR-03: Catalogue Search
The system shall allow users to search and browse catalogue records using supported fields such as title, author, category, and identifier.

### FR-04: Book Details
The system shall display relevant catalogue information and availability without exposing internal or private data.

### FR-05: Inventory
The system shall track individual physical copies or equivalent inventory units and their statuses, such as Available, On Loan, Reserved (if reservations are enabled), and Unavailable.

### FR-06: Borrow Request
A Member shall be able to submit a request for an eligible book when policy conditions permit. The system shall validate the member's status, borrowing limits, and availability rules.

### FR-07: Request Review
A Librarian shall be able to approve or reject a pending request and record the decision. The system shall prevent invalid state transitions and duplicate processing.

### FR-08: Issue Loan
A Librarian shall be able to issue an available physical copy to an eligible Member. The system shall record the member, copy, issue date, due date, issuing staff member, and loan status.

### FR-09: Return Loan
A Librarian shall be able to record receipt of a borrowed copy. The system shall record the return date, close the active loan, and update copy availability. A copy requiring maintenance shall not be marked Available.

### FR-10: Due-Date and Overdue Tracking
The system shall identify loans that remain active after their due date. Overdue status shall be derived from the due date and loan status or maintained consistently by a scheduled process.

### FR-11: Member History
A Member shall be able to view their own active loans and borrowing history. A Member shall not be able to retrieve another Member's private records by changing an ID in a request.

### FR-12: Fine or Settlement Record (Optional)
If the library adopts a fine policy, authorized staff shall be able to record a fine amount and a manual settlement status. The system shall not process or initiate payments. The fine calculation and settlement rules must be defined before this requirement is enabled.

### FR-13: Account and Role Management
An Admin shall be able to create, update, deactivate, and assign roles to accounts. Role changes shall be restricted to authorized administrators and should be auditable.

### FR-14: Configuration
An Admin shall be able to manage approved library rules, including loan duration and member-subtype limits, where these settings are implemented.

### FR-15: Reporting
Authorized staff shall be able to view basic reports, including catalogue inventory, active loans, returns, overdue loans, and borrowing activity.

### FR-16: Validation and Error Handling
The system shall validate request payloads and return consistent errors for invalid data, missing resources, authentication failures, authorization failures, and conflicting circulation actions.

### FR-17: Auditability
The system should record important actions such as role changes, issue, return, and request decisions with actor and timestamp information, subject to the finalized retention policy.

## 5. Core Business Rules

- A copy may have at most one active loan.
- Only a Librarian may issue or return a copy.
- Only an authorized Member may create a request for their own account.
- A Member may see only their own private profile and loan records.
- A request, approval, issue, and return are distinct workflow states.
- The system must reject invalid transitions, such as returning a loan that is already closed.
- Due dates and borrowing limits are based on configured policy, not hard-coded assumptions.
- Payment processing is not part of the system. Optional fine settlement is recorded manually.

## 6. Data Requirements

The conceptual data model should include:
- **User:** identity, contact/login fields, account status, and role.
- **MemberProfile:** member subtype (Student or Teacher) and permitted library-specific attributes.
- **Book:** catalogue metadata such as title, author, ISBN/identifier, publisher, and category.
- **BookCopy:** individual copy identifier, condition, and availability status.
- **BorrowRequest:** member, requested book or copy, request timestamp, status, and decision metadata.
- **Loan:** member, copy, issue date, due date, return date, status, and staff references.
- **FineRecord (optional):** loan, amount, reason, manual settlement status, and staff/timestamp metadata.
- **AuditEvent:** actor, action, affected resource, timestamp, and appropriate non-sensitive context.

Relationships, constraints, and database technology must be confirmed in the TDD before implementation.

## 7. External Interface Requirements

### 7.1 Frontend
The web interface shall support catalogue browsing, member views, librarian circulation operations, and admin functions according to permissions. Responsive behavior and accessible form feedback should be provided.

### 7.2 Backend
The backend shall expose REST-style endpoints using FastAPI. Exact endpoint names and response schemas are implementation decisions to be documented in the TDD and API specification.

### 7.3 Error Responses
Errors should use consistent JSON structures and appropriate HTTP status codes. Responses must not expose stack traces, secrets, or unnecessary personal data.

## 8. Non-Functional Requirements

- **Security:** enforce authentication and authorization server-side; validate input; protect credentials and secrets.
- **Privacy:** limit access to personal and circulation records by role and ownership.
- **Integrity:** preserve consistency across copy, request, and loan states; use database constraints or transactions where needed.
- **Usability:** provide clear status labels, validation messages, and confirmation for sensitive operations.
- **Maintainability:** separate UI components, API clients, business logic, and data models.
- **Reliability:** fail safely when an operation cannot be completed; avoid partially updated circulation records.
- **Testability:** provide unit, API, authorization, and workflow tests.
- **Performance:** common catalogue and loan queries should remain responsive for the expected deployment size; numeric targets should be set after expected usage is known.
- **Accessibility:** use semantic controls, keyboard-accessible navigation, and labels for form inputs.

## 9. Acceptance Criteria

- A Member can search for books and see availability.
- A Member can submit a valid borrowing request.
- A Librarian can approve/reject requests and issue/return books.
- The system prevents a copy from having two active loans.
- Returning a book updates the loan and copy state consistently.
- Overdue active loans can be identified.
- Members cannot access other members' private records.
- Unauthorized roles are blocked by the API, not merely by the UI.
- No payment gateway or online payment collection exists.
- Automated tests cover core success paths and important failure cases.

## 10. Open Questions

Confirm before production release:
- Loan durations and limits for Students and Teachers.
- Whether reservations and renewals are supported.
- Whether fine records are needed at all; if yes, the policy and manual settlement process.
- Account creation and password recovery approach.
- Database and deployment target.
- Notification channels, data retention, and backup requirements.
