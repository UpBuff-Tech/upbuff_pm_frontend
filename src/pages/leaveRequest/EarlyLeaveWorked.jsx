// Time worked by the leaving time, flagged when short of the required hours
export default function EarlyLeaveWorked({ worked, shortfall }) {
  return (
    <>
      {worked}
      {shortfall && (
        <div><small className="text-danger">Short by {shortfall}</small></div>
      )}
    </>
  );
}
