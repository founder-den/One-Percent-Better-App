import { useState } from 'react';
import { Tabs } from '../../components/ui.jsx';
import GlobalTasbihAdminTab    from './GlobalTasbihAdminTab.jsx';
import PersonalTasbihAdminTab  from './PersonalTasbihAdminTab.jsx';
import ReadingTrackerAdminTab  from './ReadingTrackerAdminTab.jsx';

const TABS = [
  { key: 'global',   label: 'Global Tasbih' },
  { key: 'personal', label: 'Personal Tasbih' },
  { key: 'reading',  label: 'Reading Tracker' },
];

export default function AdminToolsTab() {
  const [activeTab, setActiveTab] = useState('global');

  return (
    <div className="mt-6">
      <Tabs tabs={TABS} active={activeTab} onChange={setActiveTab} />
      {activeTab === 'global'   && <div className="mt-6"><GlobalTasbihAdminTab /></div>}
      {activeTab === 'personal' && <div className="mt-6"><PersonalTasbihAdminTab /></div>}
      {activeTab === 'reading'  && <div className="mt-6"><ReadingTrackerAdminTab /></div>}
    </div>
  );
}
