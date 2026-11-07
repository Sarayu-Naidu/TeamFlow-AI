import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "./api.js";

const STATUSES = ["Pending", "In Progress", "Blocked", "Completed"];
const PRIORITIES = ["Low", "Medium", "High"];

function Icon({ name, size = 18 }) {
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /></>,
    check: <><path d="m5 12 4 4L19 6" /><circle cx="12" cy="12" r="9" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    alert: <><path d="M12 3 2.8 19h18.4L12 3Z" /><path d="M12 9v4m0 3h.01" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    arrow: <><path d="M5 12h14m-6-6 6 6-6 6" /></>,
    sparkle: <><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" /><path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="10" cy="7" r="4" /><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
  };
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

function dateLabel(value) {
  if (!value) return "No due date";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en", { month: "short", day: "numeric" });
}

function App() {
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState("");
  const [tasks, setTasks] = useState([]);
  const [report, setReport] = useState(null);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("All tasks");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState({ title: "", description: "", assigned_to: "", priority: "Medium", status: "Pending", due_date: "" });

  const selectedProject = projects.find((project) => String(project.id) === String(projectId));

  const loadProjects = useCallback(async () => {
    setLoadingProjects(true);
    try {
      const items = await api.getProjects();
      setProjects(items);
      setProjectId((current) => items.some((item) => String(item.id) === String(current)) ? current : (items[0] ? String(items[0].id) : ""));
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingProjects(false);
    }
  }, []);

  const loadProjectData = useCallback(async (id) => {
    if (!id) {
      setTasks([]);
      setReport(null);
      return;
    }
    setLoadingTasks(true);
    try {
      const [taskItems, summary] = await Promise.all([api.getTasks(id), api.getReport(id)]);
      setTasks(taskItems);
      setReport(summary);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingTasks(false);
    }
  }, []);

  useEffect(() => { loadProjects(); }, [loadProjects]);
  useEffect(() => { loadProjectData(projectId); }, [projectId, loadProjectData]);

  const filteredTasks = useMemo(() => statusFilter === "All tasks" ? tasks : tasks.filter((task) => task.status === statusFilter), [tasks, statusFilter]);
  const completion = report?.total_tasks ? Math.round(report.completed_tasks / report.total_tasks * 100) : 0;

  async function handleCreateTask(event) {
    event.preventDefault();
    if (!projectId) return;
    setSaving(true);
    setError("");
    try {
      await api.createTask(projectId, form);
      setForm({ title: "", description: "", assigned_to: "", priority: "Medium", status: "Pending", due_date: "" });
      setShowForm(false);
      setNotice("Task added to your project");
      await loadProjectData(projectId);
      window.setTimeout(() => setNotice(""), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(taskId, status) {
    setError("");
    try {
      await api.updateTask(taskId, { status });
      await loadProjectData(projectId);
      setNotice("Task status updated");
      window.setTimeout(() => setNotice(""), 2500);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#top" aria-label="TeamFlow home">
          <span className="brand-mark"><Icon name="sparkle" size={22} /></span>
          <span>teamflow<span className="brand-ai">.ai</span></span>
        </a>
        <div className="nav-label">WORKSPACE</div>
        <button className="nav-item active"><Icon name="grid" /> Overview</button>
        <button className="nav-item" onClick={() => document.getElementById("task-section")?.scrollIntoView({ behavior: "smooth" })}><Icon name="check" /> My tasks</button>
        <div className="sidebar-bottom">
          <div className="mini-profile"><div className="avatar">TF</div><div><strong>Your workspace</strong><span>TeamFlow member</span></div><span className="dots">•••</span></div>
        </div>
      </aside>

      <main className="main-area" id="top">
        <header className="topbar">
          <div className="breadcrumbs"><span>Workspace</span><span className="crumb-slash">/</span><strong>Overview</strong></div>
          <div className="top-actions"><span className="today-label">{new Date().toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" })}</span><div className="avatar top-avatar">TF</div></div>
        </header>

        <div className="content-wrap">
          <section className="welcome-row">
            <div><p className="eyebrow">YOUR TEAM, IN SYNC</p><h1>Good work starts<br className="mobile-break" /> with a clear view.</h1><p className="welcome-copy">Here's what's moving across your project today.</p></div>
            <button className="button primary" onClick={() => setShowForm(true)} disabled={!projectId}><Icon name="plus" /> New task</button>
          </section>

          {error && <div className="alert error-alert" role="alert"><Icon name="alert" /><span>{error}</span><button aria-label="Dismiss error" onClick={() => setError("")}>×</button></div>}
          {notice && <div className="alert success-alert" role="status"><Icon name="check" />{notice}</div>}

          <section className="project-banner">
            <div className="project-symbol"><Icon name="sparkle" size={23} /></div>
            <div className="project-info"><span className="project-overline">CURRENT PROJECT</span>
              {loadingProjects ? <h2>Loading projects…</h2> : projects.length ? <select className="project-select" value={projectId} onChange={(event) => setProjectId(event.target.value)} aria-label="Select project">{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select> : <h2>No project yet</h2>}
              <p>{selectedProject?.description || (projects.length ? "A shared space for your team's work." : "Create a project using the API, then refresh this page.")}</p>
            </div>
            {selectedProject && <div className="project-id">PROJECT <strong>#{String(selectedProject.id).padStart(3, "0")}</strong></div>}
          </section>

          <section className="stats-grid" aria-label="Project summary">
            <article className="stat-card"><div className="stat-top"><span className="stat-label">TOTAL TASKS</span><span className="stat-icon indigo"><Icon name="check" /></span></div><div className="stat-value">{report?.total_tasks ?? "—"}</div><div className="stat-foot">In this project</div></article>
            <article className="stat-card"><div className="stat-top"><span className="stat-label">COMPLETED</span><span className="stat-icon green"><Icon name="check" /></span></div><div className="stat-value">{report?.completed_tasks ?? "—"}<small>{report ? ` / ${report.total_tasks}` : ""}</small></div><div className="stat-foot"><span className="tiny-progress"><i style={{ width: `${completion}%` }} /></span>{completion}% complete</div></article>
            <article className="stat-card"><div className="stat-top"><span className="stat-label">IN PROGRESS</span><span className="stat-icon blue"><Icon name="clock" /></span></div><div className="stat-value">{report?.in_progress_tasks ?? "—"}</div><div className="stat-foot">Moving forward</div></article>
            <article className="stat-card"><div className="stat-top"><span className="stat-label">NEEDS ATTENTION</span><span className="stat-icon amber"><Icon name="alert" /></span></div><div className="stat-value">{report ? report.blocked_tasks + report.overdue_tasks : "—"}</div><div className="stat-foot">Blocked or overdue</div></article>
          </section>

          <section className="workspace-grid">
            <div className="tasks-panel" id="task-section">
              <div className="panel-heading"><div><p className="eyebrow">KEEP THINGS MOVING</p><h2>Project tasks</h2></div><div className="task-tools"><span className="task-count">{filteredTasks.length} tasks</span><select className="filter-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter tasks"><option>All tasks</option>{STATUSES.map((status) => <option key={status}>{status}</option>)}</select></div></div>
              <div className="task-list">
                {loadingTasks ? <div className="empty-state">Loading your tasks…</div> : filteredTasks.length ? filteredTasks.map((task) => <article className="task-row" key={task.id}>
                  <div className={`task-check ${task.status === "Completed" ? "is-done" : ""}`}>{task.status === "Completed" && <Icon name="check" size={15} />}</div>
                  <div className="task-main"><div className="task-title-line"><h3 className={task.status === "Completed" ? "completed-title" : ""}>{task.title}</h3><span className={`priority priority-${task.priority.toLowerCase()}`}><i />{task.priority}</span></div>{task.description && <p className="task-description">{task.description}</p>}<div className="task-meta"><span className="assignee"><span className="assignee-avatar">{task.assigned_to.slice(0, 1).toUpperCase()}</span>{task.assigned_to}</span><span className="due-date"><Icon name="calendar" size={14} />{dateLabel(task.due_date)}</span></div></div>
                  <select className={`status-select status-${task.status.toLowerCase().replaceAll(" ", "-")}`} value={task.status} onChange={(event) => handleStatusChange(task.id, event.target.value)} aria-label={`Status for ${task.title}`}>{STATUSES.map((status) => <option key={status}>{status}</option>)}</select>
                </article>) : <div className="empty-state"><div className="empty-icon"><Icon name="check" size={23} /></div><strong>{tasks.length ? "No tasks match this filter" : "A fresh start"}</strong><span>{tasks.length ? "Choose another status to see more tasks." : "Add your first task and get the team moving."}</span>{!tasks.length && projectId && <button className="text-button" onClick={() => setShowForm(true)}>Create your first task <Icon name="arrow" size={15} /></button>}</div>}
              </div>
            </div>

            <aside className="right-column">
              <section className="progress-card"><div className="progress-header"><div><p className="eyebrow">PROJECT HEALTH</p><h2>Progress</h2></div><span className="health-dot" title="Project is active" /></div><div className="progress-ring-wrap"><div className="progress-ring" style={{ "--progress": `${completion * 3.6}deg` }}><div><strong>{completion}%</strong><span>complete</span></div></div></div><div className="progress-caption">{report?.completed_tasks ?? 0} of {report?.total_tasks ?? 0} tasks completed</div><div className="progress-divider" /><div className="breakdown"><div><span><i className="legend-dot dot-green" />Completed</span><strong>{report?.completed_tasks ?? 0}</strong></div><div><span><i className="legend-dot dot-blue" />In progress</span><strong>{report?.in_progress_tasks ?? 0}</strong></div><div><span><i className="legend-dot dot-gray" />To do</span><strong>{(report?.pending_tasks ?? 0) + (report?.blocked_tasks ?? 0)}</strong></div></div></section>
              <section className="tip-card"><div className="tip-icon"><Icon name="sparkle" /></div><p className="eyebrow">A LITTLE REMINDER</p><h3>Small steps add up.</h3><p>Keep tasks moving by updating their status as your team makes progress.</p></section>
            </aside>
          </section>
          <footer className="footer-note"><span>Made for teams that make things happen.</span><span><i /> All changes sync with your project</span></footer>
        </div>
      </main>

      {showForm && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowForm(false); }}><section className="task-modal" role="dialog" aria-modal="true" aria-labelledby="form-title"><div className="modal-heading"><div><p className="eyebrow">ADD TO {selectedProject?.name?.toUpperCase()}</p><h2 id="form-title">Create a task</h2></div><button className="close-button" onClick={() => setShowForm(false)} aria-label="Close">×</button></div><form onSubmit={handleCreateTask} className="task-form"><label>Task title<input required maxLength="200" autoFocus placeholder="What needs to get done?" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label><label>Description <span className="optional">Optional</span><textarea maxLength="5000" rows="3" placeholder="Add a few details…" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label><div className="form-row"><label>Assigned to<input required maxLength="120" placeholder="Teammate name" value={form.assigned_to} onChange={(event) => setForm({ ...form, assigned_to: event.target.value })} /></label><label>Due date<input required type="date" value={form.due_date} onChange={(event) => setForm({ ...form, due_date: event.target.value })} /></label></div><div className="form-row"><label>Priority<select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}>{PRIORITIES.map((priority) => <option key={priority}>{priority}</option>)}</select></label><label>Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>{STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label></div><div className="form-actions"><button className="button secondary" type="button" onClick={() => setShowForm(false)}>Cancel</button><button className="button primary" type="submit" disabled={saving}>{saving ? "Creating…" : <><Icon name="plus" /> Create task</>}</button></div></form></section></div>}
    </div>
  );
}

export default App;
