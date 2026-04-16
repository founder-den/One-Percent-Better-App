import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { Tabs } from '../../components/ui.jsx';
import {
  PersonalTasbih,
  GlobalTasbihSection,
  ReadingTrackerSection,
} from '../student/ToolsTab.jsx';

export default function ToolsPage() {
  const { student } = useAuth();
  const { studentsForGroup } = useApp();
  const [activeTab, setActiveTab] = useState('tasbih');

  if (!student) {
    return (
      <div className="max-w-sm mx-auto text-center py-24 px-6">
        <div className="text-5xl opacity-30 mb-5">🔒</div>
        <h2 className="font-serif text-2xl mb-3">Login Required</h2>
        <p className="text-muted text-sm mb-6">Sign in to use the tools.</p>
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
        <p className="text-muted text-sm">Tools are available once your account is approved.</p>
      </div>
    );
  }

  const groupmates = studentsForGroup(student.groupId).filter(s => s.id !== student.id);

  const TABS = [
    { key: 'tasbih',  label: 'Tasbih' },
    { key: 'global',  label: 'Global Tasbih' },
    { key: 'reading', label: 'Reading Tracker' },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <Tabs tabs={TABS} active={activeTab} onChange={setActiveTab} />
      <div className="mt-6">
        {activeTab === 'tasbih'  && <PersonalTasbih />}
        {activeTab === 'global'  && <GlobalTasbihSection groupId={student.groupId} />}
        {activeTab === 'reading' && <ReadingTrackerSection student={student} groupmates={groupmates} />}
      </div>
    </div>
  );
}
