/**
 * "Project overview" of the client dashboard: the Gantt chart's summary card (health, dates,
 * time elapsed vs work done, progress ring, tasks by status) for each of the client's projects,
 * open projects first. Each card links to the project's Gantt chart.
 *
 *   <ClientProjectOverview clientName="Fainger" />
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { currentUserId } from '../../lib/customFunctions';
import { computeStats, normalizeTasks, ProjectSummary } from '../ganttChart/projectSummary';

/** projectTasks.getByProject as a promise ([] when it fails). */
function loadTasks(projectId) {
  return new Promise((resolve) => {
    api.call('projectTasks.getByProject', projectId, (error, tasks) => resolve(!error && tasks ? tasks : []));
  });
}

export default function ClientProjectOverview({ clientName }) {
  // null while loading, then [{ project, stats, hasTasks }]
  const [cards, setCards] = useState(null);

  useEffect(() => {
    api.call('project.getByClient', (error, projects) => {
      if (!currentUserId()) return;
      if (error || !projects || !projects.length) {
        setCards([]);
        return;
      }
      Promise.all(projects.map((project) => loadTasks(project._id))).then((taskLists) => {
        if (!currentUserId()) return;
        const built = projects.map((project, index) => {
          const items = normalizeTasks(taskLists[index]);
          return { project, stats: computeStats(items, project), hasTasks: items.length > 0 };
        });
        // Open projects first (newest start first), finished ones after
        const isDone = (card) => card.project.status === 'Completed' || card.stats.health.key === 'done';
        built.sort((a, b) => isDone(a) - isDone(b)
          || new Date(b.project.startDate || 0) - new Date(a.project.startDate || 0));
        setCards(built);
      });
    });
  }, []);

  if (cards === null) {
    return (
      <div className="card mb-4">
        <div className="card-body text-center py-4">
          <div className="spinner-border spinner-border-sm text-primary" role="status"></div>
          <span className="ms-2 text-muted">Loading project overview...</span>
        </div>
      </div>
    );
  }
  if (!cards.length) return null;

  return (
    <div className="mb-4">
      <h6 className="text-muted text-uppercase small fw-semibold mb-2">Project overview</h6>
      {cards.map(({ project, stats, hasTasks }) => (
        <ProjectSummary key={project._id} project={project} clientName={clientName} stats={stats} hasTasks={hasTasks}>
          <div className="d-flex justify-content-end px-4 pb-3">
            <Link to={`/ganttChart/view?project=${project._id}`} className="btn btn-sm btn-outline-primary">
              <i className="bx bx-bar-chart-square me-1"></i>View timeline
            </Link>
          </div>
        </ProjectSummary>
      ))}
    </div>
  );
}
