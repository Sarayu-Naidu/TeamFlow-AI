const API_BASE = "/api";

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new Error("Could not reach the API. Check that the backend is running on port 8001.");
  }

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      message = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail ?? body);
    } catch {
      // Keep the useful status message if the response is not JSON.
    }
    throw new Error(message);
  }
  if (response.status === 204) return null;
  return response.json();
}

export const api = {
  getProjects: () => request("/projects"),
  getTasks: (projectId) => request(`/projects/${projectId}/tasks`),
  getReport: (projectId) => request(`/projects/${projectId}/report`),
  createTask: (projectId, task) => request(`/projects/${projectId}/tasks`, {
    method: "POST",
    body: JSON.stringify(task),
  }),
  updateTask: (taskId, changes) => request(`/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify(changes),
  }),
};
