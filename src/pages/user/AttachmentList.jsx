// The list of file names + sizes shown below an attachments input.
//   items   - [{ name, size }] (File objects fit), or null when nothing is listed
//   compact - the smaller layout used inside the modals

export default function AttachmentList({ items, compact }) {
  if (!items) return null;

  if (compact) {
    return (
      <div className="list-group list-group-flush">
        {items.map((item, index) => (
          <div key={index} className="list-group-item d-flex justify-content-between align-items-center py-1 px-2">
            <span style={{ fontSize: '0.85rem' }}><i className="bx bx-file me-1"></i>{item.name}</span>
            <span className="badge bg-primary rounded-pill" style={{ fontSize: '0.7rem' }}>{(item.size / 1024).toFixed(1)} KB</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="list-group">
      {items.map((item, index) => (
        <div key={index} className="list-group-item d-flex justify-content-between align-items-center">
          <span><i className="bx bx-file me-2"></i>{item.name}</span>
          <span className="badge bg-primary rounded-pill">{(item.size / 1024).toFixed(2)} KB</span>
        </div>
      ))}
    </div>
  );
}
