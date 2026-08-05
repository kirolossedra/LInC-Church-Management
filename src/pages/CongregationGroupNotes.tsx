import AssignmentDetailsDialog from '../components/congregation-group-notes/AssignmentDetailsDialog';
import CongregationGroupDashboard from '../components/congregation-group-notes/CongregationGroupDashboard';
import CongregationGroupHeader from '../components/congregation-group-notes/CongregationGroupHeader';
import IdentifierLogin from '../components/congregation-group-notes/IdentifierLogin';
import useCongregationGroupNotes from '../components/congregation-group-notes/useCongregationGroupNotes';

export default function CongregationGroupNotes() {
  const controller = useCongregationGroupNotes();

  return (
    <>
      <div dir={controller.dir} className="congregation-notes-ui min-h-screen py-2 text-[#2b1717] md:py-6">
        <div className="mx-auto max-w-5xl space-y-7">
          <CongregationGroupHeader isAr={controller.isAr} />
          {!controller.profile && <IdentifierLogin controller={controller} />}
          <CongregationGroupDashboard controller={controller} />
        </div>
      </div>

      <AssignmentDetailsDialog controller={controller} />
    </>
  );
}
