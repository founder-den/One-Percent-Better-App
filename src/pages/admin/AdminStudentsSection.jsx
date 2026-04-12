import { useState } from 'react';
import { Tabs } from '../../components/ui.jsx';
import OverviewTab from './OverviewTab.jsx';
import StudentsTab from './StudentsTab.jsx';
import GroupsTab   from './GroupsTab.jsx';

const TABS = [
  { key: 'overview',  label: 'Overview' },
  { key: 'all',       label: 'All Students' },
  { key: 'groups',    label: 'Groups' },
];

export default function AdminStudentsSection({ groupId, onGroupCreated }) {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="mt-6">
      <Tabs tabs={TABS} active={activeTab} onChange={setActiveTab} />
      {activeTab === 'overview' && <OverviewTab />}
      {activeTab === 'all'      && <StudentsTab groupId={groupId} />}
      {activeTab === 'groups'   && (
        <GroupsTab
          onGroupCreated={id => {
            onGroupCreated?.(id);
            setActiveTab('all');
          }}
        />
      )}
    </div>
  );
}
