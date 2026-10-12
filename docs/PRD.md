# Product Requirements Document (PRD)
## Library Management System

**Document status:** Initial product baseline  
**Version:** 1.0

## 1. Product Overview

The Library Management System (LMS) is a web application for managing a library's catalogue, physical book copies, members, borrowing, returns, due dates, and overdue records. It is intended to replace fragmented manual processes with a consistent, auditable workflow.

The system does **not** process payments or online transactions. Borrowing and returning books are the core circulation workflows. If the library has fines or repayment rules, staff may record the amount and whether it has been settled; the system does not collect money.

## 2. Product Goals

- Maintain accurate book, copy, and member records.
- Let members discover books and view availability.
- Allow members to submit borrowing requests.
- Let librarians approve or reject requests and issue books.
- Track loan dates, due dates, returns, and overdue loans.
- Provide administrators with user, role, configuration, and reporting controls.
- Enforce role-based access and protect members' private records.
- Keep circulation history available for operational reporting.

## 3. Users and Roles

The system has three top-level roles.

### 3.1 Member
A Member can be classified as a Student or Teacher subtype. These are member categories, not separate top-level authorization roles.

Members can:
- Browse and search the catalogue.
- View book descriptions and availability.
- Submit and cancel eligible borrow requests.
- View their own current loans, due dates, borrowing history, and account profile.
- View any recorded overdue status or fine/settlement information applicable to their account.

Members cannot approve their own requests, change catalogue records, alter loan records, or view another member's private information.

### 3.2 Librarian
Librarians manage day-to-day library operations. They can:
- Create, view, update, and archive catalogue records.
- Manage physical copies and their status.
- View member records as needed for circulation.
- Review, approve, or reject borrowing requests.
- Issue books, record returns, and update copy availability.
- Identify overdue loans and record any applicable fine or repayment settlement manually.
- Access circulation records required for library operations.

### 3.3 Admin
Administrators manage the system. They can:
- Create, update, deactivate, and manage user accounts.
- Assign and change roles.
- Configure system-wide borrowing rules and member-category limits.
- View system reports and audit activity.
- Manage application settings.

## 4. Scope

### 4.1 MVP — Core Library Operations

- Authentication and account management foundation.
- Role-based authorization for Member, Librarian, and Admin.
- Catalogue search and book details.
- Book-copy inventory and availability status.
- Borrow-request submission and staff review.
- Issue and return workflows.
- Due-date and overdue tracking.
- Member profile and personal loan history.
- Basic operational dashboard and reports.
- Input validation, error handling, and automated tests.

### 4.2 Beta — Extended Operations

- More complete authentication and account recovery.
- Fine policy configuration, if required by the library.
- Manual recording of fine amounts and settlement status; no payment gateway.
- Notifications for request decisions, upcoming due dates, and overdue items.
- Enhanced reports and audit history.
- Improved search, filtering, and pagination.
- Deployment, monitoring, backups, and operational hardening.

### 4.3 Out of Scope

- Online payment processing, payment gateways, wallets, or card handling.
- E-commerce or book sales.
- Automated money transfers or financial-account integration.
- Public self-registration unless explicitly approved by the project owner.
- Integrations with external institutional systems unless separately specified.

## 5. Key Workflows

### 5.1 Borrowing
1. A Member searches for a book and checks availability.
2. The Member submits a borrow request.
3. A Librarian reviews the request and approves or rejects it.
4. When approved and a copy is available, the Librarian issues the book and records the issue date and due date.
5. The system updates the copy and loan statuses.

Approval and physical issue should be represented clearly; approving a request alone must not imply that a book has been handed over.

### 5.2 Returning
1. The Member returns the physical book to the library.
2. The Librarian records the return.
3. The system closes the loan and marks the copy available, unless the copy requires maintenance or has another status.
4. If a fine policy exists, authorized staff may record the fine and its settlement status manually. No payment is processed by the application.

### 5.3 Overdue
The system identifies active loans past their due date. Librarians can review overdue records and follow the library's policy. Overdue status must not automatically mark a book as returned or automatically collect a fee.

## 6. Business Rules

- A physical copy cannot be issued to two active loans at the same time.
- Only authorized Librarians can issue or return books.
- Members can access only their own private loan and profile information.
- Borrowing limits and loan periods are configurable; values must be confirmed with the library before production.
- A request does not reserve or issue a copy unless the configured workflow explicitly says so.
- A return is recorded only after staff confirm that the book has been received.
- Fine and settlement records, if enabled, are administrative records only. The system does not collect payments.
- Deactivated users cannot initiate new borrowing actions.

## 7. Success Criteria

- Catalogue records and copy availability remain consistent after issue and return operations.
- Unauthorized users cannot perform restricted actions through either the UI or API.
- The system prevents duplicate active loans for a single copy.
- Members can find their own current loans and due dates.
- Librarians can identify overdue loans and complete returns.
- Core workflows have automated tests and clear error messages.

## 8. Assumptions and Open Decisions

The following must be confirmed before production use:
- Maximum active loans and loan period for each member subtype.
- Whether borrowing requests expire or reserve a copy.
- Renewal policy and renewal limits.
- Whether fines are used, how they are calculated, and who can record settlement.
- Whether notifications are required and which delivery channels are permitted.
- Data retention, backup, and account recovery policies.
