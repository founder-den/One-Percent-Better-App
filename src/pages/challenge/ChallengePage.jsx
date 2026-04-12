import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useApp }  from '../../context/AppContext.jsx';
import { Tabs } from '../../components/ui.jsx';
import DashboardTab   from '../student/DashboardTab.jsx';
import HistoryTab     from '../student/HistoryTab.jsx';
import LeaderboardInner from './LeaderboardInner.jsx';

const TABS = [
  { key: 'submissions',  label: 'Submissions' },
  { key: 'leaderboard',  label: 'Leaderboard' },
  { key: 'history',      label: 'My History' },
];

export default function ChallengePage() {
  const { student } = useAuth();
  const [activeTab, setActiveTab] = useState('submissions');

  if (!student) {
    return (
      <div className="max-w-sm mx-auto text-center py-24 px-6">
        <div className="text-5xl opacity-30 mb-5">🔒</div>
        <h2 className="font-serif text-2xl mb-3">Login Required</h2>
        <p className="text-muted text-sm mb-6">Sign in to view the challenge.</p>
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
        <p className="text-muted text-sm">The challenge is available once your account is approved.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <Tabs tabs={TABS} active={activeTab} onChange={setActiveTab} />
      {activeTab === 'submissions'  && <DashboardTab />}
      {activeTab === 'leaderboard'  && <LeaderboardInner />}
      {activeTab === 'history'      && <HistoryTab />}
    </div>
  );
}
