import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { usePagination } from '../../hooks/usePagination';
import Paginator from '../../components/Paginator';
import { globalOptionsHelper, genericSortIcons, isReady, getTemplatePagination } from '../../components/utility';
import SuccessModal from '../../layouts/modals/SuccessModal';
import ErrorModal from '../../layouts/modals/ErrorModal';
import ConfigCreate from './ConfigCreate';
import EditableText from './EditableText';
import { fxAlert, fxConfirm } from '../../components/dialog/dialog';
import { TableSkeleton } from '../../components/skeleton/Skeleton';

const configCollectionName = 'config';

// The configs listed on this page (plus every config created here, which gets `view: true`).
const LISTED_CONFIG_NAMES = [
  'sMTPPort',
  'sMTPServer',
  'sMTPUsername',
  'sMTPPassword',
  'from',
  'to',
  'cc',
  'appName',
  'headerName',
  'base_url',
  'absoluteURL',
  'subject',
  'text',
  'emailTime',
  'dbId',
  'currency',
  'whatsText',
  'whatsToken',
  'whatsInstanceId',
  'emailNeed',
  'pdf_url',
  'apiKey',
  'support_email',
  'leaveRequestTo',
  'leaveRequestCC',
  'baseUrl',
];

const CONFIG_FILTERS = {
  $or: [
    ...LISTED_CONFIG_NAMES.map((name) => ({ name: { $eq: name } })),
    { view: true },
  ],
};

function openConfigCreate() {
  $('#config-create').modal();
}

function updateIssueContact() {
  api.call('visitor.updateContactString');
}

function updateDateYear() {
  api.call('visitor.dateUpdate');
}

function updateIssueId() {
  api.call('visitor.issueId');
}

async function generateMissingUuids() {
  if (await fxConfirm('This will generate UUIDs for all users/exhibitors/participants who do not have one. Continue?', { title: 'Generate UUIDs?', confirmText: 'Generate' })) {
    api.call('visitor.generateMissingUuid', (error, result) => {
      if (error) {
        fxAlert(`Error generating UUIDs: ${error.message || error.reason}`, { title: 'UUID generation failed', tone: 'danger' });
      } else {
        fxAlert(`Total records processed: ${result.total}\nSuccessfully updated: ${result.updated}\nErrors: ${result.errors}`, { title: 'UUID generation complete', tone: 'success' });
      }
    });
  }
}

function updateQrCode() {
  api.call('visitor.generateQr');
}

function updateStringDate() {
  api.call('visitor.stringDate');
}

async function triggerDailyTaskSummary() {
  if (await fxConfirm('Send daily task summary emails to all users now?', { title: 'Send summary emails?', confirmText: 'Send emails' })) {
    toastr['info']('Sending daily task summary emails...');
    api.call('cronJob.sendDailyTaskSummaryEmails', (err, result) => {
      if (err) {
        toastr['error'](`Error: ${err.message || err.reason}`);
      } else {
        toastr['success'](`Daily task summary emails sent! (${result.emailsSent} emails sent)`);
      }
    });
  }
}

async function stopAllTimers() {
  if (await fxConfirm('This will stop EVERY running or paused task timer for ALL users. Elapsed durations will be logged against each task. Continue?', { tone: 'danger', title: 'Stop all timers?', confirmText: 'Stop all timers' })) {
    toastr['info']('Stopping all active task timers...');
    api.call('projectTasks.stopAllTimersGlobally', (err, result) => {
      if (err) {
        toastr['error'](`Error: ${err.message || err.reason}`);
      } else {
        toastr['success'](`Stopped ${result.stoppedCount} timer(s) (${result.totalCount} found)`);
      }
    });
  }
}

async function stopStaleTimers() {
  if (await fxConfirm("This will stop only STALE timers (carried over from a previous day or running over 8 hours) for ALL users. Today's active timers will keep running. Continue?", { tone: 'warning', title: 'Stop stale timers?', confirmText: 'Stop stale timers' })) {
    toastr['info']('Stopping stale task timers...');
    api.call('projectTasks.stopStaleTimersGlobally', (err, result) => {
      if (err) {
        toastr['error'](`Error: ${err.message || err.reason}`);
      } else if (result.stoppedCount === 0) {
        toastr['info'](`No stale timers found (${result.checked} active timer(s) checked).`);
      } else {
        toastr['success'](`Stopped ${result.stoppedCount} stale timer(s) of ${result.checked} checked.`);
      }
    });
  }
}

export default function SystemConfig() {
  const pagination = usePagination(configCollectionName, {
    filters: CONFIG_FILTERS,
    sort: { name: -1 },
    perPage: 10
  });

  const ready = isReady(pagination);
  const systemConfig = pagination.getPage();
  const optionsHelper = globalOptionsHelper(configCollectionName);

  // The sort arrow of the list, once the list is shown
  useEffect(() => {
    if (ready) genericSortIcons();
  }, [ready]);

  return (
    <>
      <section className="content-header">
        <h1>System Configuration
        </h1>
        <ol className="breadcrumb">
          <li className="breadcrumb-item"><Link to="/"><i className="fa fa-dashboard"></i> Home</Link></li>
          <li className="breadcrumb-item active" aria-current="page">System Configuration</li>
        </ol>
      </section>
      <section className="content">
        <div className="row">
          <div>
            <button className="btn btn-primary btn-flat pull-right" id="config-create-button" onClick={openConfigCreate}>New Config</button>
            {' '}
            <button type="button" className="btn btn-primary btn-flat" id="issueContact" onClick={updateIssueContact}>Update issue COntact </button>
            {' '}
            <button type="button" className="btn btn-primary btn-flat" id="issueId" onClick={updateIssueId}>Update _id  </button>
            {' '}
            <button type="button" className="btn btn-success btn-flat" id="generateUuid" title="Generate UUID for users/exhibitors/participants without UUID" onClick={generateMissingUuids}>
              <i className="fa fa-key"></i> Generate Missing UUIDs
            </button>
            {' '}
            <button type="button" className="btn btn-primary btn-flat" id="issueCode" onClick={updateQrCode}>Update QR Code  </button>
            {' '}
            <button type="button" className="btn btn-primary btn-flat" id="dateUpdate" onClick={updateDateYear}>Date year update  </button>
            {' '}
            <button type="button" className="btn btn-primary btn-flat" id="stringDate" onClick={updateStringDate}>String Date update  </button>
            {' '}
            <button type="button" className="btn btn-warning btn-flat" id="triggerDailyTaskSummary" onClick={triggerDailyTaskSummary}>
              <i className="fa fa-envelope"></i> Send Daily Task Summary
            </button>
            {' '}
            <button type="button" className="btn btn-danger btn-flat" id="stopAllTimers" title="Stop every running/paused task timer system-wide and log elapsed duration" onClick={stopAllTimers}>
              <i className="fa fa-stop-circle"></i> Stop All Active Timers
            </button>
            {' '}
            <button type="button" className="btn btn-warning btn-flat" id="stopStaleTimers" title="Stop only stale timers (carried over from a previous day or running over 8h) and log elapsed duration. Today's active timers are left running." onClick={stopStaleTimers}>
              <i className="fa fa-history"></i> Stop Stale Timers (Exclude Today)
            </button>

            <div className="row">
            </div>
          </div>
        </div>

        <br />

        <div className="row">
          <div className="box box-default box-solid" style={{ width: '400' }}>
            <div className="box-header with-border bg-aqua">
              <h3 className="box-title">System Configuration</h3>
            </div>
            {ready ? (
              <div className="box-body no-padding table-responsive">
                <table className="table table-striped generic">
                  <tbody>
                    <tr>
                      <th className=" sorted-column">Name</th>
                      <th className=" sorted-column">Value</th>
                    </tr>
                    {systemConfig.map((config) => (
                      <tr key={config._id} className="view " id={config._id}>
                        <td className="pl-20 " width="50%">
                          {config.name}
                        </td>
                        <td className="pl-20 " width="50%">
                          <div className="editable-input">
                            <EditableText context={config} field="value" options={optionsHelper} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-3">
                <TableSkeleton rows={6} columns={2} label="Loading configuration…" />
              </div>
            )}
          </div>
          {ready && (
            <Paginator pagination={getTemplatePagination(pagination)} limit={10} containerClass="text-right" />
          )}
        </div>
      </section>
      <div className="config-create-modal">
        <div className="modal" id="config-create">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <button type="button" className="close" data-dismiss="modal" aria-label="Close">
                  <span aria-hidden="true">&times;</span></button>
                <h4 className="modal-title">Create Config</h4>
              </div>
              <div className="modal-body">
                <ConfigCreate />
              </div>
            </div>
          </div>
        </div>
      </div>

      <SuccessModal id="configSuccessModal" section="Config" />
      <ErrorModal id="configErrorModal" section="Config" />
    </>
  );
}
