# TeamFlow AI backend

A beginner-friendly project and task management API built with FastAPI, Pydantic, and SQLite. Python's built-in `sqlite3` module handles the database, so no separate database server is needed.

## Run the application

From the project folder, create and activate a virtual environment, then install the dependencies:

```powershell
py -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

Start the development server:

```powershell
python -m uvicorn app.main:app --reload
```

Visit `http://127.0.0.1:8000` for the welcome response and `http://127.0.0.1:8000/docs` to try the API interactively. The database is created automatically as `teamflow.db` in the project folder when the app starts.

## Run the frontend dashboard

The React dashboard is in `frontend/`. It expects the backend to be available at `http://127.0.0.1:8001`. Start the backend on that port in one terminal:

```powershell
python -m uvicorn app.main:app --reload --port 8001
```

Then open a second terminal and run the frontend:

```powershell
cd frontend
npm install
npm run dev
```

Open the local address printed by Vite (usually `http://localhost:5173`). Vite forwards `/api` requests to port 8001 during development. The dashboard can display existing projects, add tasks, update task status, and show the project's progress summary.

Frontend files:

- `frontend/src/App.jsx` contains the dashboard layout and interactive project/task views.
- `frontend/src/api.js` contains the small set of API request helpers.
- `frontend/src/styles.css` contains the responsive visual design.
- `frontend/src/main.jsx` starts the React application.
- `frontend/vite.config.js` configures the development server and API proxy.
- `frontend/package.json` lists the frontend dependencies and commands.

## API endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/` | Welcome message and API docs link |
| POST | `/projects` | Create a project (`name`, optional `description`) |
| GET | `/projects` | List projects |
| POST | `/projects/{project_id}/tasks` | Create a task in a project |
| GET | `/projects/{project_id}/tasks` | List a project's tasks |
| PATCH | `/tasks/{task_id}` | Update one or more task fields |
| DELETE | `/tasks/{task_id}` | Delete a task |
| GET | `/projects/{project_id}/report` | Get task totals and status/overdue counts |

Task creation requires `title`, `assigned_to`, and `due_date` (formatted `YYYY-MM-DD`). `description` defaults to an empty string, `priority` defaults to `Medium`, and `status` defaults to `Pending`. Allowed priorities are `Low`, `Medium`, and `High`. Allowed statuses are `Pending`, `In Progress`, `Blocked`, and `Completed`.

Invalid input receives a descriptive `422` response from FastAPI/Pydantic. Requests for a missing project or task receive a `404` response. Empty task updates receive a `400` response.

## Files

- `app/main.py` creates the FastAPI app, initializes SQLite on startup, and defines `GET /`.
- `app/database.py` opens SQLite connections and creates the projects and tasks tables.
- `app/schemas.py` defines validated request and response models, including priority and status values.
- `app/routes.py` contains the project, task, and report endpoints.
- `requirements.txt` lists the Python packages to install.
- `teamflow.db` is generated automatically at runtime and stores persistent project and task data.
