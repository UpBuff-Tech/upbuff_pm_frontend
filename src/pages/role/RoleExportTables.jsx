/**
 * @author Nithin
 */

// The two hidden tables the Excel exports of the role list are built from.

const titleCell = { width: '500px', fontSize: '20px' };
const wide = { width: '500px' };
const narrow = { width: '200px' };

export default function RoleExportTables() {
  return (
    <>
      <table className="table table-striped generic" id="exportTodayOrder" style={{ display: 'none' }}>
        <tbody>
          <tr>
            <th className="sorted-column" style={titleCell}>User Details
            </th>
          </tr>
          <tr>
            <th className="sorted-column" style={titleCell}>
            </th>
          </tr>
          <tr>
            <th className="sorted-column" style={titleCell}>Total No Of Active Users :
              <span id="activeUserId"></span>
            </th>
          </tr>
          <tr>
            <th className="sorted-column" style={titleCell}>Total No Of InActive Users :
              <span id="inActiveUserId"></span>
            </th>
          </tr>
          <tr>
            <th className="sorted-column" style={titleCell}>
            </th>
          </tr>
          <tr>
            <th className="text-center sorted-column" style={wide}>Sl.No</th>
            <th className="text-center sorted-column" style={narrow}>Role Name</th>
            <th className="text-center sorted-column" style={wide}>Total No Of Active Users</th>
            <th className="text-center sorted-column" style={wide}>Total No Of InActive Users</th>
            <th className="text-center sorted-column" style={wide}></th>
            <th className="text-center sorted-column" style={wide}>User Details</th>
          </tr>
        </tbody>
      </table>

      <table className="table table-striped generic" id="exportTodayOrder1" style={{ display: 'none' }}>
        <tbody>

          <tr>
            <th className="text-center sorted-column" style={wide}>Sl.No</th>
            <th className="text-center sorted-column" style={narrow}>Sub Distributor Name</th>
            <th className="text-center sorted-column" style={wide}>Total No Of Orders</th>
            <th className="text-center sorted-column" style={wide}>Total No Of Cash Sales</th>
            <th className="text-center sorted-column" style={wide}>Total No Of Credit Sales</th>
            <th className="text-center sorted-column" style={wide}></th>
            <th className="text-center sorted-column" style={wide}>User Details</th>
          </tr>
        </tbody>
      </table>
    </>
  );
}
