"""HTTP endpoints for projects, tasks, and project reports."""

from datetime import date
import sqlite3

from fastapi import APIRouter, Depends, HTTPException, status

from app.database import get_db
from app.schemas import (
    Project,
    ProjectCreate,
    ProjectReport,
    Task,
    TaskCreate,
    TaskUpdate,
)

router = APIRouter()


def require_project(connection: sqlite3.Connection, project_id: int) -> sqlite3.Row:
    project = connection.execute(
        "SELECT * FROM projects WHERE id = ?", (project_id,)
    ).fetchone()
    if project is None:
        raise HTTPException(status_code=404, detail=f"Project {project_id} was not found")
    return project


def require_task(connection: sqlite3.Connection, task_id: int) -> sqlite3.Row:
    task = connection.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
    if task is None:
        raise HTTPException(status_code=404, detail=f"Task {task_id} was not found")
    return task


@router.post("/projects", response_model=Project, status_code=status.HTTP_201_CREATED)
def create_project(project: ProjectCreate, connection: sqlite3.Connection = Depends(get_db)):
    cursor = connection.execute(
        "INSERT INTO projects (name, description) VALUES (?, ?)",
        (project.name, project.description),
    )
    connection.commit()
    row = connection.execute(
        "SELECT * FROM projects WHERE id = ?", (cursor.lastrowid,)
    ).fetchone()
    return dict(row)


@router.get("/projects", response_model=list[Project])
def list_projects(connection: sqlite3.Connection = Depends(get_db)):
    try:
        rows = connection.execute(
            "SELECT * FROM projects ORDER BY id"
        ).fetchall()
        return [dict(row) for row in rows]
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error))


@router.post(
    "/projects/{project_id}/tasks",
    response_model=Task,
    status_code=status.HTTP_201_CREATED,
)
def create_task(
    project_id: int,
    task: TaskCreate,
    connection: sqlite3.Connection = Depends(get_db),
):
    require_project(connection, project_id)
    cursor = connection.execute(
        """INSERT INTO tasks
           (project_id, title, description, assigned_to, priority, status, due_date)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (
            project_id,
            task.title,
            task.description,
            task.assigned_to,
            task.priority.value,
            task.status.value,
            task.due_date.isoformat(),
        ),
    )
    connection.commit()
    row = connection.execute(
        "SELECT * FROM tasks WHERE id = ?", (cursor.lastrowid,)
    ).fetchone()
    return dict(row)


@router.get("/projects/{project_id}/tasks", response_model=list[Task])
def list_tasks(
    project_id: int,
    connection: sqlite3.Connection = Depends(get_db),
):
    require_project(connection, project_id)

    rows = connection.execute(
        "SELECT * FROM tasks WHERE project_id = ? ORDER BY id",
        (project_id,),
    ).fetchall()

    return [dict(row) for row in rows]


@router.patch("/tasks/{task_id}", response_model=Task)
def update_task(
    task_id: int,
    changes: TaskUpdate,
    connection: sqlite3.Connection = Depends(get_db),
):
    require_task(connection, task_id)
    updates = changes.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=400, detail="Provide at least one field to update")
    if any(value is None for value in updates.values()):
        raise HTTPException(status_code=400, detail="Task fields cannot be set to null")

    for field in ("priority", "status"):
        if field in updates and updates[field] is not None:
            updates[field] = updates[field].value
    if "due_date" in updates and updates["due_date"] is not None:
        updates["due_date"] = updates["due_date"].isoformat()

    assignments = ", ".join(f"{field} = ?" for field in updates)
    connection.execute(
        f"UPDATE tasks SET {assignments} WHERE id = ?",
        (*updates.values(), task_id),
    )
    connection.commit()
    row = connection.execute(
    "SELECT * FROM tasks WHERE id = ?", (task_id,)
).fetchone()

    return dict(row)


@router.delete("/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(task_id: int, connection: sqlite3.Connection = Depends(get_db)):
    require_task(connection, task_id)
    connection.execute("DELETE FROM tasks WHERE id = ?", (task_id,))
    connection.commit()


@router.get("/projects/{project_id}/report", response_model=ProjectReport)
def project_report(project_id: int, connection: sqlite3.Connection = Depends(get_db)):
    project = require_project(connection, project_id)
    counts = connection.execute(
        """SELECT COUNT(*) AS total_tasks,
                  SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completed_tasks,
                  SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pending_tasks,
                  SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) AS in_progress_tasks,
                  SUM(CASE WHEN status = 'Blocked' THEN 1 ELSE 0 END) AS blocked_tasks,
                  SUM(CASE WHEN status != 'Completed' AND due_date < ? THEN 1 ELSE 0 END) AS overdue_tasks
           FROM tasks WHERE project_id = ?""",
        (date.today().isoformat(), project_id),
    ).fetchone()
    return {
        "project_id": project_id,
        "project_name": project["name"],
        **{key: counts[key] or 0 for key in counts.keys()},
    }
