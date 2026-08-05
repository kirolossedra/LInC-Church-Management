import AssignmentDetailsDialog from '../components/congregation-group-notes/AssignmentDetailsDialog';
import CongregationGroupDashboard from '../components/congregation-group-notes/CongregationGroupDashboard';
import CongregationGroupHeader from '../components/congregation-group-notes/CongregationGroupHeader';
import IdentifierLogin from '../components/congregation-group-notes/IdentifierLogin';
import useCongregationGroupNotes from '../components/congregation-group-notes/useCongregationGroupNotes';

export default function CongregationGroupNotes() {
  const controller = useCongregationGroupNotes();

  return (
    <>
      <div
        dir={controller.dir}
        className="min-h-screen bg-[#fbf7f2] px-4 py-6 text-[#2b1717]"
        style={{ fontFamily: 'Arial, sans-serif', fontWeight: 700 }}
      >
        <div className="mx-auto max-w-5xl space-y-6">
          <CongregationGroupHeader isAr={controller.isAr} />
          {!controller.profile && <IdentifierLogin controller={controller} />}
          <CongregationGroupDashboard controller={controller} />
        </div>
      </div>

      <AssignmentDetailsDialog controller={controller} />
    </>
  );
}
