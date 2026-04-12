import ActivitiesTab from './ActivitiesTab.jsx';
import PeriodsTab    from './PeriodsTab.jsx';

export default function AdminActivitiesTab({ groupId }) {
  return (
    <div className="mt-6">
      <ActivitiesTab groupId={groupId} />
      <PeriodsTab    groupId={groupId} />
    </div>
  );
}
