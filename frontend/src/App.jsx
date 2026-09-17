import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ShellLayout } from './layouts/ShellLayout';
import LandingPage from './pages/LandingPage';
import ResumeAnalysisPage from './pages/ResumeAnalysisPage';
import JobMatchingPage from './pages/JobMatchingPage';

function RouteSlot() {
  return null;
}

export default function App() {
  return <BrowserRouter>
    <Routes>
      <Route element={<ShellLayout />}>
        <Route index element={<LandingPage />} />
        <Route path="dashboard" element={<RouteSlot />} />
        <Route path="jobs" element={<JobMatchingPage />} />
        <Route path="resume" element={<ResumeAnalysisPage />} />
        <Route path="roadmap" element={<RouteSlot />} />
        <Route path="mockprep" element={<RouteSlot />} />
        <Route path="recruiter" element={<RouteSlot />} />
        <Route path="profile" element={<RouteSlot />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  </BrowserRouter>;
}
