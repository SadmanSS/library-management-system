# React + FastAPI Project

## Requirements

- [Python 3.9+](https://www.python.org/downloads/)
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
```bash
python -m venv .venv
```

Activate the virtual environment:

| System | Command |
|---|---|
| Windows (PowerShell) | `.\.venv\Scripts\Activate.ps1` |
| Windows (CMD) | `.venv\Scripts\activate.bat` |
| macOS / Linux | `source .venv/bin/activate` |

If PowerShell says scripts are disabled, run this, then activate again:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned
```

Install and start:

```bash
python -m pip install "fastapi[standard]"
```
```bash
python -m uvicorn main:app --reload
```

Backend runs at <http://127.0.0.1:8000>.

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

Frontend runs at <http://localhost:5173>.


##  Troubleshooting
```
| Problem                       | Fix                                                                               |
|-------------------------------|-----------------------------------------------------------------------------------|
| `uvicorn` not found           | Activate `.venv`, then run `python -m uvicorn main:app --reload`                  |
| Port 8000 in use              | Add `--port 8001` to the run command and update the URL in `frontend/src/App.tsx` |
| "Could not reach the backend" | Make sure the backend terminal is running                                         |

