"""MCP tools for the TeamFlow AI FastAPI backend.

Run with ``python -m agents.mcp_server`` after installing the MCP SDK. The
server communicates with the existing HTTP API and does not access SQLite.
"""

import json
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from mcp.server.fastmcp import FastMCP


API_BASE_URL = "http://127.0.0.1:8001"
REQUEST_TIMEOUT_SECONDS = 15
VALID_STATUSES = {"Pending", "In Progress", "Blocked", "Completed"}
VALID_PRIORITIES = {"Low", "Medium", "High"}

mcp = FastMCP("TeamFlow AI")


def _request(method: str, path: str, payload: dict[str, Any] | None = None) -> Any:
    """Send a request to the TeamFlow API and return its decoded JSON response."""
    body = None if payload is None else json.dumps(payload).encode("utf-8")
    request = Request(
        f"{API_BASE_URL}{path}",
        data=body,
        method=method,
        headers={"Accept": "application/json", "Content-Type": "application/json"},
    )
    try:
        with urlopen(request, timeout=REQUEST_TIMEOUT_SECONDS) as response:
            response_body = response.read()
    except HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"TeamFlow API returned HTTP {error.code}: {detail}") from error
    except URLError as error:
        raise RuntimeError(f"Could not reach TeamFlow API at {API_BASE_URL}: {error.reason}") from error

    if not response_body:
        return None
    return json.loads(response_body.decode("utf-8"))


@mcp.tool()
def list_projects() -> list[dict[str, Any]]:
    """List all projects."""
    return _request("GET", "/projects")


@mcp.tool()
def list_tasks(project_id: int) -> list[dict[str, Any]]:
    """List tasks belonging to a project."""
    return _request("GET", f"/projects/{project_id}/tasks")


@mcp.tool()
def create_task(
    project_id: int,
    title: str,
    assigned_to: str,
    due_date: str,
    description: str = "",
    priority: str = "Medium",
    status: str = "Pending",
) -> dict[str, Any]:
    """Create a task in a project. Use YYYY-MM-DD for due_date."""
    if priority not in VALID_PRIORITIES:
        raise ValueError(f"priority must be one of: {', '.join(sorted(VALID_PRIORITIES))}")
    if status not in VALID_STATUSES:
        raise ValueError(f"status must be one of: {', '.join(sorted(VALID_STATUSES))}")
    return _request(
        "POST",
        f"/projects/{project_id}/tasks",
        {
            "title": title,
            "description": description,
            "assigned_to": assigned_to,
            "priority": priority,
            "status": status,
            "due_date": due_date,
        },
    )


@mcp.tool()
def update_task_status(task_id: int, status: str) -> dict[str, Any]:
    """Set a task's status to Pending, In Progress, Blocked, or Completed."""
    if status not in VALID_STATUSES:
        raise ValueError(f"status must be one of: {', '.join(sorted(VALID_STATUSES))}")
    return _request("PATCH", f"/tasks/{task_id}", {"status": status})


@mcp.tool()
def generate_project_report(project_id: int) -> dict[str, Any]:
    """Get task totals, status counts, and overdue task count for a project."""
    return _request("GET", f"/projects/{project_id}/report")


if __name__ == "__main__":
    mcp.run()
