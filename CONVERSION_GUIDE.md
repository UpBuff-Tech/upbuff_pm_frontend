# Conversion guide: Meteor → React + Spring Boot

This project is a 1:1 conversion of the Meteor app in `../project_management_fieldnxt`
(referred to below as **OLD**). Rule number one: **same features, same flows, same texts, same
data**. Nothing is redesigned, renamed, "improved" or dropped. Rule number two: **keep the code
simple** - this codebase is also used for learning, so prefer plain, readable code over clever code.

- `upbuff_pm_backend/`  - Spring Boot 3 (Java 17), MongoDB (the SAME database and documents as OLD)
- `upbuff_pm_frontend/` - React 18 + Vite + React Router (JavaScript, same Bootstrap/Sneat theme and assets)

## How Meteor concepts map

| Meteor (OLD)                                   | Here |
|------------------------------------------------|------|
| `Meteor.methods({'tickets.assign'(a, b) {}})`  | `POST /rpc/tickets.assign`, body = JSON array `[a, b]` → `TicketsController` → `TicketsService` |
| `Meteor.call('tickets.assign', a, b, cb)`      | `api.call('tickets.assign', a, b, cb)` (or `await api.call(...)`) |
| `Meteor.publish('x', ...)` + `subscribe`       | `POST /pub/x` in the controller; `usePublication('x', [args])` in React |
| `publishPagination(C)` + `new Meteor.Pagination(C, {...})` | `pagination.publish(db.c)` at startup; `usePagination('<collection name>', {...})` + `<Paginator>` |
| `Mongo.Collection`                             | `Database` bean: `db.tickets.find(...)` (`DbCollection`) |
| `Meteor.userId()`, `this.userId`, `Meteor.user()` | `Auth.userId()`, `Auth.user()` (backend) / `useAuth()` (frontend) |
| `throw new Meteor.Error('code', 'reason')`     | `throw new ApiError("code", "reason")`; client still reads `error.reason` |
| `Accounts.*`                                   | `AccountsService` (same password + token format in the `users` collection) |
| `Email.send({...})`                            | `emailService.send(doc(...))` |
| `SyncedCron.add`                               | `@Scheduled(cron = ...)` methods |
| `Meteor.defer / setTimeout / setInterval`      | `Async.defer / setTimeout / setInterval` |
| `Session`                                      | `Session` / `useSession` from `src/lib/session.js` |
| `FlowRouter.go(path)`                          | `navigate(path)` from `useNavigate()` |
| Blaze template + helpers + events              | one React function component (state with `useState`, loading with `useEffect`) |

---

# BACKEND rules

Base package `com.fieldnxt.pm`. Read these existing files first - they are the style to follow:
`common/DbCollection.java`, `common/Database.java`, `common/Docs.java`, `common/Js.java`,
`common/Args.java`, `common/Auth.java`, `common/ApiError.java`, `common/AccountsService.java`,
`common/EmailService.java`, `common/PaginationService.java`, `common/TicketHelpers.java`,
`constants/*`, and the finished reference module `modules/config/` (Controller + Service + Startup).

## Structure of a module: `modules/<name>/`

- `<Name>Controller.java` - `@RestController`. ONE endpoint per OLD method, in the same order as
  the OLD file: `@PostMapping("/rpc/<exact old method name>")`, signature
  `public Object xxx(@RequestBody Args args)`. It only unpacks arguments by position
  (`args.string(0)`, `args.doc(1)`, `args.list(2)`, `args.number(3)`, `args.integer(3)`, `args.bool(4)`,
  `args.date(5)`, `args.get(6)` for "anything") and calls the service. No logic in controllers.
  Use the typed getter only when OLD did `check(x, String)` etc. (it throws the same "Match failed");
  when OLD did not check the type, use `args.get(i)` or convert leniently in the service.
- `<Name>Service.java` - `@Service` with the logic, one public method per OLD method, with a
  comment naming the OLD method (`/** tickets.assign */`). Constructor injection only.
  Split a very large service into several focused services (e.g. `TicketEmailService`) rather than
  one 3000-line file; private helper functions of the OLD file become private methods (or a small
  helper class when several services need them).
- `<Name>Startup.java` - only when OLD had `Meteor.startup` work for the module (indexes via
  `db.x.ensureIndex(doc(...))`, `publishPagination`, seed data). Use
  `@EventListener(ApplicationReadyEvent.class)` like `ConfigStartup`.
- Publications (`Meteor.publish('name', fn)`) go in the controller as
  `@PostMapping("/pub/<name>")` returning the `List<Document>` the cursor would have published
  (same selector/fields/sort/limit, same access checks; return an empty list where OLD did
  `this.ready()`). If OLD returned several cursors, return a `Document` keyed by collection name.
- If two `Meteor.methods` keys in the same OLD object literal have the same name, the LAST one wins
  (JavaScript rule) - convert only that one. Spring refuses duplicate mappings, so each
  `/rpc/<name>` must exist exactly once in the whole backend.
- Convert EVERY method in your files, including legacy ones that look unused. If a legacy method
  uses a collection that is not a field of `Database`, use `db.collection("<name>")`.

## Translating the logic (keep it line-for-line recognisable)

- Data stays `org.bson.Document` everywhere. Same field names, same nesting, same value types.
  Never introduce entity/DTO classes. `import static com.fieldnxt.pm.common.Docs.doc;`
  - `{ a: 1, b: { $ne: true } }` → `doc("a", 1, "b", doc("$ne", true))`
  - `C.findOne(id)` / `C.findOne({..}, {fields, sort})` → `db.c.findOne(id)` / `db.c.findOne(doc(..), doc("fields", .., "sort", ..))`
  - `C.find(sel, opts).fetch()` → `db.c.find(sel, opts)`; `.count()` → `db.c.count(sel)`; match-all selector is `new Document()`
  - `C.insert(doc)` → `db.c.insert(doc)` (returns the new `_id`; ids are Meteor-style random strings)
  - `C.update(sel, mod)` → `db.c.update(sel, mod)`; with `{ multi: true }` → `db.c.update(sel, mod, doc("multi", true))`
  - `C.remove(sel)` → `db.c.remove(sel)`; `rawCollection()` → `db.c.raw()`; aggregation → `db.c.aggregate(List.of(...))`
  - A regular expression in a query → `java.util.regex.Pattern` (or `doc("$regex", .., "$options", "i")` if OLD wrote it that way)
- Read nested values null-safely with `Docs.get(user, "profile.firstName")`, `Docs.getString`,
  `Docs.getDoc`, `Docs.getDocs`, `Docs.getList`, `Docs.getDate`, `Docs.getBool`.
- JavaScript truthiness matters. `if (x)`, `a || b`, `!x` must be translated with `Js.truthy(x)`,
  `Js.or(a, b)` / `Js.firstTruthy(...)`, `Js.falsy(x)` - NOT with `!= null` - whenever the value
  could be `""`, `0` or `false`. Numbers from JSON/Mongo may be Integer, Long or Double: compare
  with `Js.eq(a, b)` or `.doubleValue()`, convert with `Js.num(x)`; never cast `(Integer)`.
  When storing a computed number that JS would have stored as an integer, store an int/long, not `5.0`
  (`Js.jsNumber(double)` picks the right type).
- `undefined` vs `null`: the Node Mongo driver did NOT store `undefined` fields. Where an OLD
  value could be `undefined` (e.g. an optional argument or a missing property), use
  `Docs.putIfPresent(target, "key", value)` so the key is left out instead of saved as null.
- Dates are `java.util.Date` in documents (exactly like before). For date maths use `java.time`
  or `Calendar` with the server's default time zone (OLD used the server's local time through
  `new Date()` / `moment()`); keep OLD's exact formats (`moment().format('DD/MM/YYYY')` →
  `new SimpleDateFormat("dd/MM/yyyy")` or `DateTimeFormatter`). Note moment tokens differ from Java's.
- `this.userId` / `Meteor.userId()` → `Auth.userId()`; `Meteor.user()` → `Auth.user()`;
  `if (!this.userId) throw new Meteor.Error(a, b)` → `Auth.requireUserId(a, b)`;
  `this.connection` → `Auth.isClientCall()`; `this.unblock()` → nothing (drop it).
- `Meteor.call('other.method', ...)` on the server → call the other service's Java method directly.
- `Accounts.createUser/setPassword/findUserByUsername/...` → `AccountsService`.
  `Accounts._generateStampedLoginToken().token` → `accounts.generateToken()`.
  Note `accounts.createUser(doc(...))` only stores username/email/password/profile, like Meteor did.
- `Email.send` → `emailService.send(doc("from", .., "to", .., "cc", .., "subject", .., "html", ..))`.
  Keep OLD's try/catch around it exactly as it was (same swallow-or-throw behaviour). HTML email
  templates are copied character for character (use Java text blocks `"""` + `.formatted()`/concatenation).
- `Meteor.settings.x` / `process.env.X` → `@Value("${app.x:}")` properties (add them to
  `application.properties` only if they are not there yet).
- `Meteor.absoluteUrl(path)` → `accounts.absoluteUrl(path)`.
- `console.log/error` → SLF4J `log.info/error`. `Random.id()` → `RandomId.id()`.
- `global.getUserName`, `getUserEmail`, `collectTicketNotificationRecipients`, `getTicketCcEmail`
  → inject `TicketHelpers`.
- Status/type constants are in `com.fieldnxt.pm.constants` (`TicketStatus.OPEN`, `LeaveStatus.PENDING`,
  `NotificationTypes.*`, `AttendanceStatus.*`, `RequestTypes.assertValidRequestType(..)` ...).
- Errors: every `throw new Meteor.Error(a, b)` keeps the exact same code and message text.
  A plain `throw new Error('msg')` inside a method reached the client as "Internal server error":
  use `throw new RuntimeException("msg")`.
- Return values must have the same shape as OLD (the React pages read the same properties).
  JS `undefined` return → return `null`.
- Comments: carry over OLD's useful comments (the "why"). Do not write comments about the conversion.

## Other modules (class names you can rely on)

`modules/<pkg>/<Class>`: `user/UserService`, `role/RoleService`, `clients/ClientsService`,
`project/ProjectService`, `projecttasks/ProjectTasksService`, `tasksessions/SessionEngine`,
`templates/TemplatesService`, `folders/FoldersService`, `filestorage/FileStorageService`,
`notifications/NotificationsService`, `attendance/AttendanceService`,
`leaverequests/LeaveRequestsService`, `tickets/TicketsService`, `tickettypes/TicketTypesService`,
`suggestions/SuggestionsService`, `synchealth/SyncHealthService`, `financial/...`, `config/ConfigService`.
Other modules are being converted at the same time; only call into another module's service when
OLD really did (`Meteor.call` or an imported function), and only touch files in YOUR module folders.

## Checking your work

`upbuff_pm_backend/scripts/check.sh <folder or files...>` compiles just those sources (and what they
reference) without building the whole project, e.g.
`scripts/check.sh src/main/java/com/fieldnxt/pm/modules/tickets`. It must end with `OK`.
Do NOT run `mvn`, do not start the server, do not touch MongoDB, do not edit `common/`, `config/`,
`constants/`, `pom.xml` or `application.properties` (report what you need instead).

---

# FRONTEND rules

Read these existing files first: `src/api/client.js`, `src/auth/AuthContext.jsx`, `src/App.jsx`,
`src/hooks/usePagination.js`, `src/hooks/usePublication.js`, `src/components/Paginator.jsx`,
`src/lib/session.js`, `src/lib/customFunctions.js`, `index.html`.

- One Blaze template → one React function component in a `.jsx` file with a default export.
  Page components live at the paths `src/App.jsx` imports (e.g. `src/pages/ticket/Ticket.jsx`).
  Sub-templates/widgets of a page become components in the same folder. Plain JS helpers
  (`utility.js`, `utils.js`) are ported next to them as `.js` modules with named exports
  (OLD often used implicit globals such as `loginUser = ...`; export and import them instead).
- **Markup is copied exactly**: same elements, ids, class names, texts, icons, order, inline styles
  (as JSX style objects), modals, tables, columns. JSX differences only: `class`→`className`,
  `for`→`htmlFor`, self-closing tags, `style={{...}}`, `{{#if}}`→`{cond && ...}` / ternary,
  `{{#each}}`→`.map()` with a `key`, `{{> child}}`→`<Child />`, `{{{html}}}`→`dangerouslySetInnerHTML`.
  A page's own `.css` file is copied unchanged next to the component and imported.
- Template `helpers` → values computed from state/props. `ReactiveVar` / `ReactiveDict` → `useState`.
  `onCreated` → state initialisation + `useEffect(() => {...}, [])`; `onRendered` → `useEffect`;
  `onDestroyed` → the effect's cleanup function. `Tracker.autorun` → `useEffect` with the values it
  read as dependencies. Values that must not trigger rendering (timers, plugin instances) → `useRef`.
- Template `events` → React handlers (`onClick`, `onChange`, `onSubmit`...) on the same elements.
  Keep the same validation order, the same toastr messages and the same method calls with the same
  arguments in the same order.
- Server calls: `api.call('method.name', arg1, arg2, (error, result) => {...})` is a drop-in for
  `Meteor.call`; `await api.call(...)` also works. Never change a method name or its arguments.
- jQuery, toastr, select2 and the Bootstrap jQuery plugin are globals, as in OLD (`$`, `toastr`).
  Keep using them for what are plugins: `toastr.success(...)`, `$('#someModal').modal('show'|'hide')`,
  select2 (`$(el).select2(...)` inside `useEffect`, reading changes with `.on('change', ...)` and
  cleaning up with `.select2('destroy')`), printThis, datepicker. Do NOT use jQuery to build or
  change content that React renders (no `.html()`, `.append()`, `.text()`, `.val()` on React-managed
  inputs, `.show()/.hide()` for conditional content) - put that in state instead. Form fields are
  controlled inputs (`value` + `onChange`) or read through `FormData`/refs on submit, whichever is
  closer to OLD's flow.
- Logged-in user and permissions: `const { user, userId, roles, configs, userCan, configValue } = useAuth();`
  (`Meteor.user()`, `Meteor.userId()`, `Meteor.roles.find()`, `Config.findOne({name})`,
  `{{#if userCan 'x'}}`). After changing the current user's own profile call `refreshUser()`.
- `Session.get/set/setPersistent` → `Session` from `src/lib/session.js` (`useSession(key)` to re-render).
- Navigation: `FlowRouter.go('/x')` → `navigate('/x')`; links `<a href="/x">` → `<Link to="/x">`
  (keep the same classes/children). `FlowRouter.getParam('id')` → `useParams()`.
- Paginated lists: `new Meteor.Pagination(Clients, {...})` → `usePagination('client', {...})` with
  the collection's MongoDB name (`users`, `jalik-roles`, `config`, `client`, `project`,
  `projectTasks`, `templates`, `syncHealth`...); `{{> defaultBootstrapPaginator ...}}` → `<Paginator ... />`.
- Subscriptions → `usePublication('name', [args])`.
- Dates from the server are real `Date` objects (and Dates you send stay Dates), same as Meteor.
  Use `moment` exactly as OLD did (`import moment from 'moment'`).
- npm libraries OLD imported (`@fullcalendar/*`, `dhtmlx-gantt`, `jspdf`, `jspdf-autotable`, `xlsx`,
  `sortablejs`, `qrcode`, `html5-qrcode`, `file-saver`) are installed - import them the same way.
  Globals from script tags: `ApexCharts`, `Menu`, `Helpers`, `TableToExcel`, `Sortable`.
  Static files are served from the same URLs as before (`/assets/...`, `/img/...`).
- Global template helpers of OLD (`formatDate`, `formatDateTime`, `formatDateInput`, `eq`,
  `taskTotalHours`, `requestTypeBadgeClass`...) are plain functions in `src/lib/` - import them.
- Do not add libraries, state managers, TypeScript, CSS frameworks or new UI. Do not edit
  `package.json`, `index.html`, `vite.config.js`, `src/api`, `src/auth`, `src/hooks`, `src/App.jsx`
  (report what you need instead).

## Checking your work

From `upbuff_pm_frontend/`, with Node 22 on the PATH (`export PATH=/usr/local/opt/node@22/bin:$PATH`):
`npx eslint <your files or folders>` must report no errors (it catches undefined variables and
broken JSX). Do not run `vite`, `npm install`, or a browser.

---

# FRONTEND: shared pieces that already exist (use them, do not re-create)

Paths are relative to `upbuff_pm_frontend/src/`. Read the file itself before using a piece.

**App shell (already mounted by `layouts/MainLayout.jsx` around every page):** menu, footer,
attendance button, notification popup, logout modal. A page component renders only what its OLD
template rendered.

**Modals** - `layouts/modals/SuccessModal.jsx`, `ErrorModal.jsx`, `WarningModal.jsx` (default exports):
`<SuccessModal id="userSuccessModal" section="user" />` = `{{> successModal id="userSuccessModal" section='user'}}`.

**Loader** - `components/loader` (index.js): `showGlobalLoader(message?)`, `hideGlobalLoader()`,
`showModalLoader('#modalId', message?)`, `hideModalLoader('#modalId')`,
`const restore = showButtonLoader('#btn', text?)` → `restore()`, `showContainerLoader(selector, message?)`,
`hideContainerLoader(selector)`, `callWithLoader({ method, params, loaderType, target, loadingMessage, onSuccess, onError })`.
Components `GlobalLoader`, `ModalLoader`, `ButtonLoader` in the same folder.

**Global template helpers** - `lib/globalHelpers.js`: `useGlobalHelpers()` returns
`{ printLoaderImage, connectionLoad, userName, appName, bodyLoader, href, logo, roleName, loginConfig, userCan, profileImage }`
(same shapes as OLD: `appName.app`, `logo.logo_img`, `href.href_url`, `userName.user`, `roleName.role`).
`lib/formatters.js`: `formatDate`, `formatDateTime`, `formatDateInput`, `eq`.
`lib/customFunctions.js`: `userCan`, `currentUserId`, `formatRelativeTime`, `validateEmail`, `addCommasToNumber`, `camelCaseToNormal`, `initializeSelect2`, `go_to_lastPage`.
`lib/select2DataLoad.js`: `select2DataLoad(dataArray, type, className)`.

**Attendance revoke** - `components/attendanceRevokeModal/AttendanceRevokeModal.jsx`:
`showAttendanceRevokeModal(attendanceId, onSuccess)` (the modal is already mounted).

**Notifications** - `components/notifications/NotificationBell.jsx`, `NotificationBadge.jsx` (no props);
`components/notifications/notificationTypes.js`: `NotificationTypes`, `isTaskDelay`, `isProjectDelay`.

**Table export** - `components/exportButtons/TableExportButtons.jsx`
(`scope`, `size`, `wrapperClass`, `config`, `instance?`) and `TableExportModal.jsx`
(`scope`, `dateFields` = "task" | "ticket", `reportTypes`, `config`, `instance?`).
`config` is the object OLD passed to `tableExportEvents({...})` (`scope, columns, rows, fileName, sheetName, title, subtitle, emptyMessage, dateFilter`);
function-valued fields receive `instance` (closures over page state also work).
`lib/tableExport.js` keeps OLD's exports (`exportRowsToExcel`, `exportRowsToPdf`, `formatExportDate`,
`formatDateRangeLabel`, `toFileNameSlug`, `readExportDateRange`, `readExportReportType`, `runTableExport`,
`describeActiveFilters`, `TASK_DATE_FIELDS`, ...). `lib/taskDailyHours.js` keeps OLD's exports.

**Task helpers** - `lib/taskHours.js` (`taskTotalHours(task)`, `taskDurationDays(task)`, `getTaskTotalSeconds`,
`getTaskDurationDays`, `formatHoursMinutes`, `durationToHours`, `WORK_HOURS_PER_DAY`);
`lib/taskRequestType.js` (`TASK_REQUEST_TYPES`, `DEFAULT_REQUEST_TYPE`, `requestTypeBadgeClass`, `isValidRequestType`);
`components/TaskRequestTypeBadge.jsx` (`requestType`, `fallback`, `className`, `style` object).

**Client-side copies of shared api helpers** - `lib/shared/`: `timeAggregation.js`, `actualDates.js`,
`requestTypes.js`, `leaveRequests.js`, `earlyLeaveRequests.js`, `kanbanBoardMethods.js` (`KANBAN_STATUSES`),
`tickets.js` (`TicketStatus`, `TicketPriority`), `attendance.js`, `notifications.js` - same export names as
the OLD `imports/api/...` files the UI imported from.

**`components/utility.js`** - `globalOptionsHelper`, `genericSortIcons`, `getSearchedResults(event, { pagination })`,
`isReady(pagination)`, `getTemplatePagination(pagination)`, `handleCommonPagination(pagination)` (returns the
`<Paginator onClick>` handler), `triggerSort(event, pagination)`, `getSortOptions(event)`.

**Folder tree** - `components/folderTree/FolderTree.jsx`: props `context`, `showFileCounts`, `visibilityFilter`,
`projectId`, `taskId`, `projectIds`, `onFolderSelected(folderId, folderName, folder)` (replaces the jQuery
`folderSelected` event). `components/folderTree/folderTreeState.js`: `refreshFolderTrees()` (replaces
`$('.folder-tree').trigger('refreshTree')`), `setFolderFormModal(...)`, `prefillFolderForm(...)`,
`setDeleteFolderModal(...)`, `setFolderFormContext(...)`. `FolderFormModal.jsx` / `DeleteFolderModal.jsx` take no props.
`components/folderBrowser/FolderBrowser.jsx` + `openFolderBrowser(callback)` (OLD never rendered the
folderBrowser template on any page - only render it where OLD did).

**Client form modal** - `pages/client/ClientFormModal.jsx`: `<ClientFormModal onClientCreated onClientUpdated />`,
`openCreateClientModal()`, `openEditClientModal(id, findUser?)`, `resetDomainUI()`, `validateDomain(domain)`.
It still dispatches the `client:created` / `client:updated` document events as OLD did.
