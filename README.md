# React + FastAPI Project

## Requirements

- [Python 3.13](https://www.python.org/downloads/) (recommended)
- [Node.js 18+](https://nodejs.org/)
- [Git](https://git-scm.com/downloads)

## 1. Download the project

```bash
git clone <my-repo-url>
```
```bash
cd my-project
```

## 2. Run the backend

Open a terminal:

```bash
cd backend
```

Create a virtual environment:

```bash
python -m venv .venv
```

Activate it:

| System | Command |
|---|---|
| Windows (PowerShell) | `.\.venv\Scripts\Activate.ps1` |
| Windows (CMD) | `.venv\Scripts\activate.bat` |
| macOS / Linux | `source .venv/bin/activate` |

If PowerShell blocks script activation, run this command in the current terminal, then activate again:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned
```

Install the backend dependencies:

```bash
python -m pip install --upgrade pip
```
```bash
python -m pip install -r requirements.txt
```

Configure Supabase:

```powershell
cd backend
Copy-Item .env.example .env
```

Set `DATABASE_URL` in `.env` to the Supabase PostgreSQL connection string.
Do not commit `.env` or expose this value to the frontend. Apply the schema
before starting the API:

```powershell
$env:DATABASE_URL = "postgresql+psycopg://postgres:<password>@<host>:5432/postgres?sslmode=require"
alembic upgrade head
```

Start the backend:

```bash
python -m uvicorn main:app --reload
```

Backend: <http://127.0.0.1:8000>

API documentation: <http://127.0.0.1:8000/docs>

The database health check is available at
<http://127.0.0.1:8000/api/health/database>. The MVP database endpoints are
`GET/POST /api/books`, `GET /api/books/{id}`, and `GET/POST /api/borrowings`.

### Book catalogue API

`POST /api/books` accepts `title`, `author`, `isbn`, `category`, `total_copies`,
and optional `description` and `available_copies`. `available_copies` defaults
to `total_copies` and cannot exceed it. The response is the created book with
its generated `id` and timestamps. Duplicate ISBN values return `409 Conflict`.
`GET /api/books` returns the catalogue, and `GET /api/books/{id}` returns one
book or `404 Not Found`.

### Borrowing API

`POST /api/borrowings` accepts `book_id`, `borrower_name`, `borrower_contact`,
and `due_date`. It returns `201 Created` with the borrowing transaction,
including its `id`, `borrowed_at`, `return_date`, and `status`. The endpoint
locks the selected book while checking and decrementing `available_copies`;
it returns `404 Not Found` for an unknown book and `409 Conflict` when no
copies are available. `GET /api/borrowings/{id}` returns a confirmation or
`404 Not Found`.

## 3. Run the frontend

Open a **second terminal**:

```bash
cd my-project/frontend
```
```bash
npm install
```
```bash
npm run dev
```

Frontend: <http://localhost:5173>

## Troubleshooting

| Problem | Solution |
|---|---|
| `uvicorn` not found | Activate `.venv` and run `python -m uvicorn main:app --reload`. |
| Port 8000 is already in use | Start the backend with `python -m uvicorn main:app --reload --port 8001` and update the frontend API URL accordingly. |
| Could not reach the backend | Make sure the backend is running and the frontend is using the correct API URL. |
| PowerShell says scripts are disabled | Use the process-scoped execution policy command above, if permitted by your system administrator. |
| Windows Application Control blocks a `.pyd` file during installation | Check Windows Security's protection history or your organization's security logs to identify the blocked file and policy. Use a compatible Python version and package combination. Do not disable security controls or bypass the policy. If the device is managed, contact the administrator. |
| PyYAML fails to build during installation | Check the Python version and package compatibility. Try a supported Python version with compatible prebuilt wheels rather than forcing a source build. |
