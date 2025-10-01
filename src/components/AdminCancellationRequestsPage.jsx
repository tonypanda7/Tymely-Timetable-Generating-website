import PropTypes from 'prop-types';

const AdminCancellationRequestsPage = ({
  collegeId,
  onNavigate,
  currentView = 'cancellation-requests',
  role,
  cancellations = [],
  approveCancellation,
  rejectCancellation
}) => {
  const pending = Array.isArray(cancellations) ? cancellations.filter(c => String(c.status || 'pending') === 'pending') : [];

  return (
    <div className="cancellation-container">
      <div className="page-header">
        <h1 className="page-title">Cancellation Requests</h1>
      </div>

      <div className="requests-card">
        {pending.length === 0 ? (
          <div className="empty-state">No pending requests.</div>
        ) : (
          <div className="requests-list">
            {pending.map((c) => (
              <div key={c.id} className="request-item">
                <div className="request-info">
                  <div><span className="label">Class:</span> {c.className}</div>
                  <div><span className="label">Subject:</span> {c.subjectName}</div>
                  <div><span className="label">Day/Period:</span> {Number(c.dayIndex) + 1} / {Number(c.periodIndex) + 1}</div>
                  <div><span className="label">Teacher:</span> {c.teacherId}</div>
                </div>
                <div className="actions">
                  <button className="btn approve" onClick={() => typeof approveCancellation === 'function' && approveCancellation(c)}>Approve</button>
                  <button className="btn reject" onClick={() => typeof rejectCancellation === 'function' && rejectCancellation(c)}>Reject</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .cancellation-container { padding: 1.5rem 1.5rem 1.5rem 0; font-family: 'Inter', -apple-system, Roboto, Helvetica, sans-serif; background: #fff; }
        .page-header { margin-bottom: 1rem; }
        .page-title { margin: 0; font-size: 2rem; font-weight: 600; color: #0A0A0A; }

        .requests-card {
          background: #FFF;
          border: 1px solid rgba(0,0,0,0.1);
          border-radius: 14px;
          padding: 1.5rem;
        }

        .empty-state { color: #717182; font-size: 0.95rem; }
        .requests-list { display: flex; flex-direction: column; gap: 12px; }

        .request-item {
          display: flex;
          flex-direction: column;
          gap: 10px;
          border: 1px solid rgba(0,0,0,0.08);
          border-radius: 10px;
          padding: 12px;
          background: #F9FAFB;
        }

        .request-info { color: #1F2937; font-size: 14px; }
        .label { color: #6B7280; margin-right: 6px; }

        .actions { display: flex; gap: 8px; }
        .btn { padding: 8px 14px; border-radius: 8px; color: #fff; border: none; cursor: pointer; font-weight: 600; }
        .approve { background: #16A34A; }
        .approve:hover { background: #15803D; }
        .reject { background: #DC2626; }
        .reject:hover { background: #B91C1C; }

        @media (max-width: 1024px) { .cancellation-container { padding: 1rem 1rem 1rem 0; } }
      `}</style>
    </div>
  );
};

AdminCancellationRequestsPage.propTypes = {
  collegeId: PropTypes.string,
  onNavigate: PropTypes.func,
  currentView: PropTypes.string,
  role: PropTypes.string,
  cancellations: PropTypes.array,
  approveCancellation: PropTypes.func,
  rejectCancellation: PropTypes.func,
};

export default AdminCancellationRequestsPage;
