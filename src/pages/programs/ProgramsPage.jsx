import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useApp }  from '../../context/AppContext.jsx';
import { ProgramsSection } from '../student/ToolsTab.jsx';

export default function ProgramsPage() {
  const { student } = useAuth();
  const { programsLabel } = useApp();

  if (!student) {
    return (
      <div className="max-w-sm mx-auto text-center py-24 px-6">
        <div className="text-5xl opacity-30 mb-5">🔒</div>
        <h2 className="font-serif text-2xl mb-3">Login Required</h2>
        <p className="text-muted text-sm mb-6">Sign in to view {programsLabel || 'Programs'}.</p>
        <Link
          to="/student"
          className="px-6 py-2.5 bg-gold text-bg font-semibold rounded-xl hover:bg-gold-l text-sm inline-block"
        >
          Go to Login
        </Link>
      </div>
    );
  }

  if ((student.status || 'active') === 'pending') {
    return (
      <div className="max-w-sm mx-auto text-center py-24 px-6">
        <div className="text-5xl opacity-30 mb-5">⏳</div>
        <h2 className="font-serif text-2xl mb-3">Account Pending</h2>
        <p className="text-muted text-sm">{programsLabel || 'Programs'} are available once your account is approved.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <ProgramsSection student={student} groupId={student.groupId} />
    </div>
  );
}
