import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar           from './components/Navbar.jsx';
import Home             from './pages/Home.jsx';
import StudentPortal    from './pages/student/StudentPortal.jsx';
import ChallengePage    from './pages/challenge/ChallengePage.jsx';
import AdminPortal      from './pages/admin/AdminPortal.jsx';
import ToolsPage        from './pages/tools/ToolsPage.jsx';
import ProgramsPage     from './pages/programs/ProgramsPage.jsx';

export default function App() {
  return (
    <div className="app-layout">
      <Navbar />
      <main className="app-main">
        <Routes>
          <Route path="/"            element={<Home />} />
          <Route path="/student"     element={<StudentPortal />} />
          <Route path="/challenge"   element={<ChallengePage />} />
          <Route path="/leaderboard" element={<Navigate to="/challenge" replace />} />
          <Route path="/tools"       element={<ToolsPage />} />
          <Route path="/programs"    element={<ProgramsPage />} />
          <Route path="/admin"       element={<AdminPortal />} />
          <Route path="*"            element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
