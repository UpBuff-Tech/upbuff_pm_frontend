// All pages and their URLs (the old imports/startup/client/routes.js).
//   SecureRoute  = the old "secureRoute" group: you must be logged in, otherwise you go to /login.
//   PublicRoute  = the old "publicRoute" group: a logged-in user who opens /login is sent to "/".

import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import api from './api/client';
import { goToLandingPage } from './lib/landingPage';
import { Session } from './lib/session';
import MainLayout from './layouts/MainLayout';
import PageLoader from './components/loader/PageLoader';

const Login = lazy(() => import('./pages/login/Login'));
const ForgetPassword = lazy(() => import('./pages/login/ForgetPassword'));
const User = lazy(() => import('./pages/user/User'));
const UserCreate = lazy(() => import('./pages/user/UserCreate'));
const UpdateProfile = lazy(() => import('./layouts/header/UpdateProfile'));
const RoleList = lazy(() => import('./pages/role/RoleList'));
const Client = lazy(() => import('./pages/client/Client'));
const Project = lazy(() => import('./pages/project/Project'));
const Task = lazy(() => import('./pages/task/Task'));
const EmployeeTaskReport = lazy(() => import('./pages/employeeTaskReport/EmployeeTaskReport'));
const ClientTaskReport = lazy(() => import('./pages/clientTaskReport/ClientTaskReport'));
const Ticket = lazy(() => import('./pages/ticket/Ticket'));
const TicketTypes = lazy(() => import('./pages/ticketTypes/TicketTypes'));
const HolidayCalendarAdmin = lazy(() => import('./pages/holidayCalendar/HolidayCalendarAdmin'));
const Templates = lazy(() => import('./pages/templates/Templates'));
const GanttChart = lazy(() => import('./pages/ganttChart/GanttChart'));
const DocumentRepository = lazy(() => import('./pages/documentRepository/DocumentRepository'));
const Calendar = lazy(() => import('./pages/calendar/Calendar'));
const NotificationsPage = lazy(() => import('./pages/notifications/NotificationsPage'));
const AdminDashboard = lazy(() => import('./pages/adminDashboard/AdminDashboard'));
const ClientDashboard = lazy(() => import('./pages/clientDashboard/ClientDashboard'));
const DirectorDashboard = lazy(() => import('./pages/directorDashboard/DirectorDashboard'));
const UserDashboard = lazy(() => import('./pages/userDashboard/UserDashboard'));
const Financial = lazy(() => import('./pages/financial/Financial'));
const ClientTicket = lazy(() => import('./pages/clientTicket/ClientTicket'));
const ClientTask = lazy(() => import('./pages/clientTask/ClientTask'));
const Attendance = lazy(() => import('./pages/attendance/Attendance'));
const LeaveRequest = lazy(() => import('./pages/leaveRequest/LeaveRequest'));
const LeaveRegister = lazy(() => import('./pages/leaveRegister/LeaveRegister'));
const Suggestions = lazy(() => import('./pages/suggestions/Suggestions'));
const SyncHealth = lazy(() => import('./pages/syncHealth/SyncHealth'));
const SystemConfig = lazy(() => import('./pages/systemConfig/SystemConfig'));
const PageNotFound = lazy(() => import('./pages/pageNotFound/PageNotFound'));

/** checkAuthentication(): scroll to top; not logged in -> /login. */
function SecureRoute({ children }) {
  const { userId, loggingIn } = useAuth();
  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  if (!userId && !loggingIn) {
    Session.set('userRole', '');
    return <Navigate to="/login" replace />;
  }
  return <MainLayout>{children}</MainLayout>;
}

/** loginAuthentication(): logged in and on /login -> "/". */
function PublicRoute({ children }) {
  const { userId, loggingIn } = useAuth();
  const location = useLocation();
  if (loggingIn) return <PageLoader />; // wait until we know
  if (userId && location.pathname === '/login') return <Navigate to="/" replace />;
  return <MainLayout>{children}</MainLayout>;
}

/** "/" : send the user to the home page of their role. */
function Home() {
  const { user, userId, loggingIn } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loggingIn) return;
    if (!userId) {
      navigate('/login', { replace: true });
      return;
    }
    if (!user) return;
    Session.setPersistent('loginCompanyId', user.companyId);
    if (user.profile && user.profile.role === 'client') {
      navigate('/client/dashboard', { replace: true });
      return;
    }
    const loginRole = user.roles;
    // The role's home page if the user may open it, else the first dashboard they're allowed
    goToLandingPage(loginRole && loginRole.length > 0 ? loginRole[0] : null, navigate);
  }, [user, userId, loggingIn, navigate]);

  // Shown while the saved login is checked and the landing page is picked.
  return <PageLoader />;
}

/** "/signout" : clear everything kept in the browser and log out. */
function SignOut() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Logout does NOT stop running timers - that is server-side state.
    localStorage.removeItem('taskCardTimers');
    Session.setPersistent('userRole', '');
    Session.set('userPermission', '');
    Session.setPersistent('loginCompanyId', '');
    Session.setPersistent('companyAdmin', false);
    Session.setPersistent('superAdminValue', false);
    Session.setPersistent('dynamicData', '');
    sessionStorage.clear();
    Session.clearPersistent();
    logout().then(() => navigate('/login', { replace: true }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

const secure = (page) => <SecureRoute>{page}</SecureRoute>;
const open = (page) => <PublicRoute>{page}</PublicRoute>;

export default function App() {
  // Pages inside the layout get a skeleton from MainLayout's own <Suspense>, so the menu and
  // top bar stay on screen while a page's code downloads. This outer one only covers
  // pages rendered without the layout (404).
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={open(<Login />)} />
        <Route path="/login/forgetPassword" element={open(<ForgetPassword />)} />
        <Route path="/signout" element={<SignOut />} />

        <Route path="/user/list" element={secure(<User />)} />
        <Route path="/user/create" element={secure(<UserCreate />)} />
        <Route path="/userCreate/:_id" element={secure(<UserCreate />)} />
        <Route path="/profile/update" element={secure(<UpdateProfile />)} />
        <Route path="/role/list" element={secure(<RoleList />)} />
        <Route path="/client/list" element={secure(<Client />)} />
        <Route path="/project/list" element={secure(<Project />)} />
        <Route path="/task/list" element={secure(<Task />)} />
        <Route path="/updated/task/list" element={secure(<Task />)} />
        <Route path="/employeeTaskReport/list" element={secure(<EmployeeTaskReport />)} />
        <Route path="/clientTaskReport/list" element={secure(<ClientTaskReport />)} />
        <Route path="/ticket/list" element={secure(<Ticket />)} />
        <Route path="/ticketTypes/list" element={secure(<TicketTypes />)} />
        <Route path="/holidays/manage" element={secure(<HolidayCalendarAdmin />)} />
        <Route path="/templates/list" element={secure(<Templates />)} />
        <Route path="/ganttChart/view" element={secure(<GanttChart />)} />
        <Route path="/documentRepository/view" element={secure(<DocumentRepository />)} />
        <Route path="/calendar/view" element={secure(<Calendar />)} />
        <Route path="/notifications" element={secure(<NotificationsPage />)} />
        <Route path="/admin/dashboard" element={secure(<AdminDashboard />)} />
        <Route path="/client/dashboard" element={secure(<ClientDashboard />)} />
        <Route path="/director/dashboard" element={secure(<DirectorDashboard />)} />
        <Route path="/user/dashboard" element={secure(<UserDashboard />)} />
        <Route path="/financial" element={secure(<Financial />)} />
        <Route path="/client/tickets" element={secure(<ClientTicket />)} />
        <Route path="/client/tasks" element={secure(<ClientTask />)} />
        <Route path="/attendance/list" element={secure(<Attendance />)} />
        <Route path="/leaveRequest/list" element={secure(<LeaveRequest />)} />
        <Route path="/leaveRegister" element={secure(<LeaveRegister />)} />
        <Route path="/suggestions/list" element={secure(<Suggestions />)} />
        <Route path="/syncHealth/list" element={secure(<SyncHealth />)} />
        <Route path="/systemConfig/list" element={secure(<SystemConfig />)} />

        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </Suspense>
  );
}
