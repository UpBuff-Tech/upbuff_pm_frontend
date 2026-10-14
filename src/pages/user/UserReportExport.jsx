// The "Export Details" part of the user list page: the hidden table that is turned into the
// Excel file (#exportTodayOrder1) and the modal where the dates are chosen (#userReportExportPage).
//   printLoad       - true while the loading overlay must be shown
//   setModalLoader  - switches that overlay on / off

import { useRef, useState } from 'react';
import moment from 'moment';
import { saveAs } from 'file-saver';
import api from '../../api/client';
import LoadersSpin from './LoadersSpin';

const HEAD_STYLE = { width: '500px' };
const NARROW_STYLE = { width: '200px' };

/** {{#if list}}: a list counts only when it has rows. */
function hasRows(list) {
  return !!list && list.length > 0;
}

/** The small "Sl No. / name / cash / credit" table of a company's users. */
function SalesTable({ nameTitle, rows, nameField, cashField, creditField }) {
  return (
    <table style={{ width: '100%' }} className="table table-striped with-border">
      <thead>
        <tr>
          <th>Sl No. </th>
          <th>{nameTitle}</th>
          <th>Cash Sale Count</th>
          <th>Credit Sale Count</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={index} className="table-border">
            <td className="text-center">{index + 1}</td>
            <td style={{ wordWrap: 'break-word' }}>{row[nameField]}</td>
            <td>{row[cashField]}</td>
            <td>{row[creditField]}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function UserReportExport({ printLoad, setModalLoader }) {
  const [userExportData, setUserExportData] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [fromDateId, setFromDateId] = useState('');
  const [toDateId, setToDateId] = useState('');
  const [alertKind, setAlertKind] = useState('');            // '', 'none' (no records) or 'ready'
  const [exportDisabled, setExportDisabled] = useState(false);
  const alertRef = useRef(null);

  /** Shows the message below the dates for 3 seconds. */
  const showAlert = (value) => {
    setTimeout(function () {
      setAlertKind(value);
      $(alertRef.current).fadeIn('fast');
    }, 0);
    setTimeout(function () {
      $(alertRef.current).fadeOut('slow');
    }, 3000);
  };

  const changeEndDate = (event) => {
    let endDateValue = event.target.value;
    setEndDate(endDateValue);

    let dateOne = moment(startDate, 'DD-MM-YYYY').format('YYYY-MM-DD');
    let dateTwo = moment(endDateValue, 'DD-MM-YYYY').format('YYYY-MM-DD');
    let fromDate = new Date(dateOne);
    let toDate = new Date(dateTwo);
    setModalLoader(false);
    setUserExportData('');
    setFromDateId('');
    setToDateId('');

    if (endDateValue !== '' && startDate !== '') {
      setModalLoader(true);
      api.call('company.getCompanyDetails', fromDate, toDate, (err, res) => {
        if (!err) {
          setUserExportData(res);
          setModalLoader(false);
          setFromDateId(startDate);
          setToDateId(endDateValue);
          if (res.length === 0) {
            showAlert('none');
          }
          else {
            showAlert('ready');
          }
        }
        else {
          setModalLoader(false);
        }
      });
    }
  };

  const submitExport = (event) => {
    event.preventDefault();
    let exportData = userExportData;
    if (exportData.length === 0) {
      toastr["error"]('No Records Found');
    }
    else {
      setExportDisabled(true);
      $("#userReportExportPage").modal('hide');
      setTimeout(() => {
        let uri = 'data:application/vnd.ms-excel;base64,',
          template = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>{worksheet}</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body><table>{table}</table></body></html>',
          base64 = function (s) {
            return window.btoa(unescape(encodeURIComponent(s)))
          },
          format = function (s, c) {
            return s.replace(/{(\w+)}/g, function (m, p) {
              return c[p];
            });
          }
        let toExcel = document.getElementById("exportTodayOrder1").innerHTML;
        let ctx = {
          worksheet: window.name || 'Excel',
          table: toExcel
        };
        //return a promise that resolves with a File instance
        function urltoFile(url, filename, mimeType) {
          return (fetch(url)
            .then(function (res) { return res.arrayBuffer(); })
            .then(function (buf) { return new File([buf], filename, { type: mimeType }); })
          );
        }

        //Usage example:
        urltoFile(uri + base64(format(template, ctx)), 'hello.xls', 'text/csv')
          .then(function (file) {

            saveAs(file, "Company Details Report (" + moment(new Date()).format("DD-MM-YYYY") + ").xls");
          });
        setExportDisabled(false);
        setStartDate('');
        setEndDate('');

      }, 5000);
    }
  };

  /**
   * Close export modal
   */
  const closeExport = () => {
    $('#userReportExportPage').modal('hide');
  };

  return (
    <>
      <table className="table table-striped generic" id="exportTodayOrder1" style={{ display: 'none' }}>
        <tbody>
          <tr>
            <th className="sorted-column" style={HEAD_STYLE}>From Date :
              <span id="fromDateId">{fromDateId}</span>
              &nbsp; To Date : <span id="toDateId">{toDateId}</span>
            </th>
          </tr>
          <tr>
            <th className="text-center sorted-column" style={HEAD_STYLE}>Sl.No</th>
            <th className="text-center sorted-column" style={NARROW_STYLE}>Company name</th>
            <th className="text-center sorted-column" style={NARROW_STYLE}></th>
            <th className="text-center sorted-column" style={HEAD_STYLE}>Vansale user details</th>
            <th className="text-center sorted-column" style={HEAD_STYLE}>Active</th>
            <th className="text-center sorted-column" style={HEAD_STYLE}>Inactive</th>
            <th className="text-center sorted-column" style={HEAD_STYLE}></th>
            <th className="text-center sorted-column" style={HEAD_STYLE}>Staff user details</th>
            <th className="text-center sorted-column" style={HEAD_STYLE}>Active</th>
            <th className="text-center sorted-column" style={HEAD_STYLE}>Inactive</th>
            <th className="text-center sorted-column" style={HEAD_STYLE}></th>
            <th className="text-center sorted-column" style={HEAD_STYLE}>Customer details</th>
          </tr>
          {hasRows(userExportData) && userExportData.map((company, index) => (
            <tr key={company._id || index} id={company._id}>
              <td className="text-center sorted-column" style={HEAD_STYLE}>{index + 1}</td>
              <td className="text-center sorted-column" style={NARROW_STYLE}>{company.subDistributorName}</td>
              <td className="text-center sorted-column" style={NARROW_STYLE}></td>
              <td className="text-center sorted-column" style={HEAD_STYLE}>
                {hasRows(company.userArrays) && (
                  <SalesTable nameTitle="vansaleUser Name" rows={company.userArrays}
                    nameField="sdUserName" cashField="cashSales1" creditField="creditSales1" />
                )}
              </td>
              <td>{company.activeCount}</td>
              <td>{company.inactiveCount}</td>
              <td></td>
              <td>
                {hasRows(company.staffArrays) && (
                  <SalesTable nameTitle="Staff Name" rows={company.staffArrays}
                    nameField="staffUserName" cashField="cashSales2" creditField="creditSales2" />
                )}
              </td>
              <td>{company.activeCount1}</td>
              <td>{company.inactiveCount2}</td>
              <td></td>
              <td className="text-center sorted-column" style={HEAD_STYLE}>
                <table style={{ width: '100%' }} className="table table-striped with-border">
                  <thead>
                    <tr>
                      <th>Active</th>
                      <th>Inactive</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="table-border">
                      <td>{company.cstmractiveCount}</td>
                      <td>{company.cstmrinactiveCount}</td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          ))}
        </tbody>
      </table>


      <div className="modal fade" id="userReportExportPage" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="deliveryExportH"></h5>
              <button type="button" className="exportClose btn-close" data-dismiss="modal" aria-label="Close" onClick={closeExport}></button>
            </div>
            <form className="exportByDate" onSubmit={submitExport}>
              <div className="modal-body">
                <label htmlFor="Employee " className="form-label">From Date <span className="asteric_red">*</span> </label>
                <input type="date" autoComplete="off" className="form-control datepicker date validation startDate"
                  data-date-autoclose="true" onKeyDown={(event) => event.preventDefault()} id="my-datepicker11"
                  data-provide="datepicker" data-date-format="dd-mm-yyyy" placeholder="From Date " name="startDate"
                  required value={startDate} onChange={(event) => setStartDate(event.target.value)} />
                <span id="startDateSpan"></span>
                <label htmlFor="firstName" className="form-label">To Date <span className="asteric_red">*</span> </label>
                <input type="date" autoComplete="off" className="form-control datepicker date validation endDate"
                  data-date-autoclose="true" onKeyDown={(event) => event.preventDefault()} id="my-datepicker12"
                  data-provide="datepicker" data-date-format="dd-mm-yyyy" placeholder="To Date " name="endDate" required
                  value={endDate} onChange={changeEndDate} />
                <span id="endDateSpan"></span>
                <span id="alertSpan" ref={alertRef}>
                  {alertKind === 'none' && (
                    <>
                      <style>{' #alertSpan { color:#fc5f5f }'}</style>
                      <span id="alertSpans">No Records Found !</span>
                    </>
                  )}
                  {alertKind === 'ready' && (
                    <>
                      <style>{' #alertSpans { color:#2ECC71 }'}</style>
                      <span id="alertSpans">Records are ready for export.</span>
                    </>
                  )}
                </span>
                <LoadersSpin printLoad={printLoad} />
              </div>
              <div className="modal-footer">
                <div className="col-md md-5">
                  <button type="button" className="btn btn-secondary exportClose pull-left" data-dismiss="modal" onClick={closeExport}>Close</button>
                  {hasRows(userExportData) ? (
                    <button type="submit" id="exportButton" className="btn btn-primary pull-right" disabled={exportDisabled}>Export</button>
                  ) : (
                    <button type="submit" className="btn btn-primary pull-right" disabled>Export</button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
