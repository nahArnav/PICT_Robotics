import { createBrowserRouter } from 'react-router';
import { PublicLayout } from './components/PublicNav';
import { Home } from './pages/Home';
import { Achievements } from './pages/Achievements';
import { Recruitment } from './pages/Recruitment';
import { Events } from './pages/Events';
import { About, Team, Gallery } from './pages/Misc';
import { Auth } from './pages/Auth';
import { ApplicationForm } from './pages/ApplicationForm';
import { DashboardLayout } from './pages/applicant/Dashboard';
import { DashOverview, DashTask, DashInterview, DashResult, DashApplication, DashAnnouncements } from './pages/applicant/Screens';
import { AdminLayout } from './pages/admin/AdminLayout';
import { AdminLogin } from './pages/admin/AdminLogin';
import { AdminSignup } from './pages/admin/AdminSignup';
import { AdminInvites } from './pages/admin/AdminInvites';
import { AdminOverview } from './pages/admin/Overview';
import { Applicants } from './pages/admin/Applicants';
import { AdminEvents } from './pages/admin/Events';
import { Pipeline, Interviews, Evaluation, AdminAnnouncements, AdminContent, AdminMail, AdminStub, AdminTasks, AdminAnalytics } from './pages/admin/AdminScreens';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: PublicLayout,
    children: [
      { index: true, Component: Home },
      { path: 'about', Component: About },
      { path: 'achievements', Component: Achievements },
      { path: 'team', Component: Team },
      { path: 'recruitment', Component: Recruitment },
      { path: 'events', Component: Events },
      { path: 'gallery', Component: Gallery },
    ],
  },
  { path: '/signin', Component: () => <Auth mode="signin" /> },
  { path: '/signup', Component: () => <Auth mode="signup" /> },
  { path: '/apply', Component: ApplicationForm },
  {
    path: '/dashboard',
    Component: DashboardLayout,
    children: [
      { index: true, Component: DashOverview },
      { path: 'application', Component: DashApplication },
      { path: 'task', Component: DashTask },
      { path: 'interview', Component: DashInterview },
      { path: 'announcements', Component: DashAnnouncements },
      { path: 'result', Component: DashResult },
    ],
  },
  { path: '/admin/login', Component: AdminLogin },
  { path: '/admin/signup', Component: AdminSignup },
  {
    path: '/admin',
    Component: AdminLayout,
    children: [
      { index: true, Component: AdminOverview },
      { path: 'applicants', Component: Applicants },
      { path: 'recruitment', Component: Pipeline },
      { path: 'interviews', Component: Interviews },
      { path: 'evaluations', Component: Evaluation },
      { path: 'announcements', Component: AdminAnnouncements },
      { path: 'events', Component: AdminEvents },
      { path: 'mail', Component: AdminMail },
      { path: 'content', Component: AdminContent },
      { path: 'tasks', Component: AdminTasks },
      { path: 'analytics', Component: AdminAnalytics },
      { path: 'settings', Component: AdminInvites },
    ],
  },
]);
