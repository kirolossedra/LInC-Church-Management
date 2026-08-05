import { motion } from 'motion/react';
import type { CongregationGroupNotesController } from './useCongregationGroupNotes';
import AssignmentList from './AssignmentList';
import GroupSummary from './GroupSummary';
import LatestAssignment from './LatestAssignment';
import MeetingCalendarPanel from './MeetingCalendarPanel';
import MemberProfileHeader from './MemberProfileHeader';
import UnassignedGroupNotice from './UnassignedGroupNotice';
import UpcomingMeetings from './UpcomingMeetings';

export default function CongregationGroupDashboard({ controller }: { controller: CongregationGroupNotesController }) {
  const { profile, groupConfig } = controller;
  if (!profile) return null;

  return (
    <motion.main initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <MemberProfileHeader controller={controller} />
      {!profile.group && <UnassignedGroupNotice isAr={controller.isAr} />}
      {profile.group && groupConfig && (
        <>
          <UpcomingMeetings controller={controller} />
          <GroupSummary controller={controller} />
          <MeetingCalendarPanel controller={controller} />
          <LatestAssignment controller={controller} />
          <AssignmentList controller={controller} />
        </>
      )}
    </motion.main>
  );
}

