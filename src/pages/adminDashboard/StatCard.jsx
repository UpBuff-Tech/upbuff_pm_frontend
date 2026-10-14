// One statistics card of a dashboard (the admin and the director dashboard show the same cards):
//
//   <StatCard label="Total Projects" value={12} color="#4f46e520" icon="bx bx-folder text-primary" />

export default function StatCard({ label, value, color, icon }) {
  return (
    <div className="col-sm-6 col-lg-3">
      <div className="card h-100 fx-stat-card">
        <div className="card-body">
          <div className="d-flex align-items-start justify-content-between">
            <div className="content-left">
              <span className="text-muted d-block mb-1">{label}</span>
              <div className="d-flex align-items-center">
                <h3 className="mb-0 me-2">{value}</h3>
              </div>
            </div>
            <div className="avatar">
              <span className="avatar-initial rounded" style={{ backgroundColor: color }}>
                <i className={icon} style={{ fontSize: '1.5rem' }}></i>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
