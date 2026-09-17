import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ShellLayout } from './layouts/ShellLayout';
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import ResumeAnalysisPage from './pages/ResumeAnalysisPage';
import JobMatchingPage from './pages/JobMatchingPage';
import CareerRoadmapPage from './pages/CareerRoadmapPage';
import MockPrepPage from './pages/MockPrepPage';
import RecruiterPortalPage from './pages/RecruiterPortalPage';
import ProfilePage from './pages/ProfilePage';

export default function App() {
  return <BrowserRouter>
    <Routes>
      <Route element={<ShellLayout />}>
        <Route index element={<LandingPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="jobs" element={<JobMatchingPage />} />
        <Route path="resume" element={<ResumeAnalysisPage />} />
        <Route path="roadmap" element={<CareerRoadmapPage />} />
        <Route path="mockprep" element={<MockPrepPage />} />
        <Route path="recruiter" element={<RecruiterPortalPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  </BrowserRouter>;
}
