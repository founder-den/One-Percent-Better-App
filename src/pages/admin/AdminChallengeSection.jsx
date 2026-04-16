import { useState } from 'react';
import { Tabs } from '../../components/ui.jsx';
import ActivitiesTab          from './ActivitiesTab.jsx';
import PeriodsTab             from './PeriodsTab.jsx';
import AdminChallengeMgmtTab  from './AdminChallengeMgmtTab.jsx';

const TABS = [
  { key: 'activities', label: 'Activities' },
  { key: 'periods',    label: 'Periods' },
  { key: 'challenges', label: 'Challenges' },
];

export default function AdminChallengeSection({ groupId }) {
  const [activeTab, setActiveTab] = useState('activities');

  return (
    <div className="mt-6">
      <Tabs tabs={TABS} active={activeTab} onChange={setActiveTab} />
      {activeTab === 'activities' && <ActivitiesTab          groupId={groupId} />}
      {activeTab === 'periods'    && <PeriodsTab             groupId={groupId} />}
      {activeTab === 'challenges' && <AdminChallengeMgmtTab />}
    </div>
  );
}
