import {
  addMonths,
  format,
  isSameDay,
  parseISO,
  startOfMonth,
  subMonths,
} from 'date-fns';

import {
  Plus,
  Trash2,
  Video,
  MapPin,
  Clock,
  X,
  ChevronLeft,
  ChevronRight,
  Send,
  Users,
  Check,
  ChevronDown,
  Calendar as CalendarIcon,
  CheckCircle,
  XCircle,
  Mail,
  Trophy,
  UserPlus,
  BarChart3,
} from 'lucide-react';

import { motion } from 'motion/react';

import PageTitle from '../PageTitle';
import { useI18n } from '../../i18n';

import {
  PeopleAssignmentsCalendarModal,
  PeopleDevelopmentSection,
  PeoplePersonalNoteModal,
  type PeopleDevelopmentParticipant,
} from './people-development';

import {
  BOOKING_WINDOW_TIME_OPTIONS,
  FULL_DAY_TIME_OPTIONS,
  MEETING_TIME_OPTIONS,
  SLOT_BLOCK_DURATION,
  getAvailabilityBlocksForDate,
  getDateString,
  getMeetingRequestEmail,
  getMeetingsForDate,
  getPendingRequestsForDate,
  getUnavailabilityBlocksForDate,
  hourToLabel,
  timeRangeToLabel,
  toggleAvailabilityWeekday,
} from './calendar';

import {
  MeetingRequestsSection,
} from './meeting-requests';

import {
  NextGenQuestionsSection,
  NextGenRegistrationsSection,
  NextGenSurveyResultsSection,
} from './nextgen';

import {
  useAvailability,
  useCalendarMonth,
  useMeetingRequests,
  useMeetings,
  useNextGen,
  useParticipants,
  usePeopleDevelopment,
} from './hooks';

type Participant = PeopleDevelopmentParticipant;

export default function PastorDashboard() {
  const { t, dir, locale } = useI18n();
  const displayLocale = locale === 'ar' ? 'ar' : 'en';

  const {
    participants,
  } = useParticipants();

  const {
    currentDate,
    setCurrentDate,
    dateLocale,
    days,
  } = useCalendarMonth({
    locale: displayLocale,
  });

  const {
    meetingRequests,
    showRequests,
    setShowRequests,
    requestDecisionLoading,
    handleRequestStatus,
  } = useMeetingRequests({
    translate: t,
  });

  const {
    meetings,
    meetingLoading,
    isAddOpen,
    setIsAddOpen,
    editingMeeting,
    setEditingMeeting,
    newMeeting,
    setNewMeeting,
    selectedParticipants,
    setSelectedParticipants,
    selectedCount,
    selectedNames,
    showParticipantDropdown,
    setShowParticipantDropdown,
    emailSent,
    setEmailSent,
    openMeetingEditor,
    getMeetingDisplayTitle,
    getMeetingRequestReason,
    getMeetingAcknowledged,
    toggleParticipant,
    handleSaveMeeting: handleCreate,
    handleDeleteMeeting: handleDelete,
  } = useMeetings({
    participants,
    locale: displayLocale,
    translate: t,
  });

  const {
    availability,
    unavailability,
    availabilityLoading,
    showAvailabilityModal,
    setShowAvailabilityModal,
    editingAvailability,
    setEditingAvailability,
    availabilityForm,
    setAvailabilityForm,
    availabilityDateCount,
    showUnavailabilityModal,
    setShowUnavailabilityModal,
    editingUnavailability,
    setEditingUnavailability,
    unavailabilityForm,
    setUnavailabilityForm,
    selectedSlotDay,
    setSelectedSlotDay,
    selectedDayAvailabilityBlocks,
    selectedDayMeetings,
    selectedDayOpenSlotHours,
    slotBlockHours,
    slotBlockingLoading,
    resetAvailabilityForm,
    resetUnavailabilityForm,
    handleSaveAvailability: handleCreateAvailability,
    handleDeleteAvailability,
    handleSaveUnavailability: handleCreateUnavailability,
    getDashboardSlotStatus,
    getDashboardSlotLabel,
    handleToggleSlotBlock,
  } = useAvailability({
    meetings,
    meetingRequests,
    translate: t,
  });

  const {
    nextGenQuestions,
    showNextGenQuestions,
    setShowNextGenQuestions,
    nextGenSurveyResults,
    showNextGenSurveyResults,
    setShowNextGenSurveyResults,
    nextGenSurveyResultsLoading,
    nextGenSurveyResultsError,
    nextGenRegistrations,
    showNextGenRegistrations,
    setShowNextGenRegistrations,
    nextGenRegistrationSearchTerm,
    setNextGenRegistrationSearchTerm,
    nextGenRegistrationStatusFilter,
    setNextGenRegistrationStatusFilter,
    nextGenRegistrationUpdatingId,
    nextGenSelectionLoadingId,
    pendingNextGenRegistrationCount,
    handleRegistrationStatus: handleNextGenRegistrationStatus,
    handleQuestionSelection: handleNextGenQuestionSelection,
  } = useNextGen({
    locale: displayLocale,
  });

  const {
    showPeopleDevelopment,
    setShowPeopleDevelopment,
    peopleDevelopmentMembers,
    peopleDevelopmentEntries,
    peoplePersonalNotes,
    peopleSearchTerm,
    setPeopleSearchTerm,
    draggedPeopleMemberKey,
    setDraggedPeopleMemberKey,
    peopleDevelopmentSavingKey,
    peopleDevelopmentPostingGroup,
    peopleDevelopmentDeletingKey,
    peopleAssignmentsPopupGroup,
    peopleAssignmentsPopupMonth,
    peopleAssignmentsPopupSelectedDate,
    setPeopleAssignmentsPopupSelectedDate,
    peopleAssignmentDrafts,
    peopleAssignmentFiles,
    peopleAssignmentFileInputResetKeys,
    peopleGroupSelectDrafts,
    showPeopleNotePopup,
    selectedPeopleNotePerson,
    peopleNoteType,
    setPeopleNoteType,
    peopleNoteText,
    setPeopleNoteText,
    peopleNoteSaving,
    peopleNotesTitle,
    peopleNotesSubtitle,
    activeAssignmentsPopupEntries: activePeopleAssignmentsPopupEntries,
    selectedPeopleNoteAssignedGroup,
    selectedPeopleNoteGroupLabel,
    setAssignmentDraft,
    setGroupSelectDraft,
    openAssignmentsPopup: openPeopleAssignmentsPopup,
    closeAssignmentsPopup: closePeopleAssignmentsPopup,
    changeAssignmentsPopupMonth: changePeopleAssignmentsPopupMonth,
    openPeopleNotePopup,
    closePeopleNotePopup,
    submitPeoplePersonalNote: handleSubmitPeoplePersonalNote,
    assignPersonToGroup: handleAssignPersonToGroup,
    dropPersonOnGroup: handleDropPersonOnGroup,
    changeAssignmentFile: handlePeopleAssignmentFileChange,
    clearAssignmentFile: clearPeopleAssignmentFile,
    postAssignment: handlePostPeopleDevelopmentAssignment,
    deleteAssignment: handleDeletePeopleDevelopmentPost,
    deleteAssignmentAttachment: handleDeletePeopleDevelopmentAttachment,
  } = usePeopleDevelopment({
    participants,
    locale: displayLocale,
  });

  const loading =
    meetingLoading ||
    requestDecisionLoading ||
    availabilityLoading;

  return (
    <>
      <style>{`
        .pastor-calendar-ui,
        .pastor-calendar-ui * {
          font-family: Arial, sans-serif !important;
          font-weight: 700 !important;
        }

        .pastor-calendar-ui {
          background: #fbf7f2;
          color: #2b1717;
        }

        .pastor-calendar-ui button,
        .pastor-calendar-ui input,
        .pastor-calendar-ui select,
        .pastor-calendar-ui textarea {
          font-size: 16px !important;
          line-height: 1.35 !important;
        }

        .pastor-calendar-ui .text-\[9px\],
        .pastor-calendar-ui .text-\[10px\],
        .pastor-calendar-ui .text-\[11px\],
        .pastor-calendar-ui .text-xs,
        .pastor-calendar-ui .text-sm {
          font-size: 16px !important;
          line-height: 1.35 !important;
        }

        .pastor-calendar-ui .text-lg {
          font-size: 20px !important;
          line-height: 1.35 !important;
        }

        .pastor-calendar-ui .text-xl {
          font-size: 24px !important;
          line-height: 1.25 !important;
        }

        .pastor-calendar-ui .text-2xl {
          font-size: 30px !important;
          line-height: 1.15 !important;
        }

        .pastor-calendar-ui .text-3xl {
          font-size: 34px !important;
          line-height: 1.1 !important;
        }

        .pastor-calendar-ui .pastor-dashboard-card {
          background: #fffdf9;
          border-color: #ead9d0;
          box-shadow: 0 16px 40px rgba(80, 24, 24, 0.06);
        }

        .pastor-calendar-ui .pastor-main-button {
          min-height: 48px;
          border-radius: 18px;
        }

        .pastor-calendar-ui .pastor-calendar-shell {
          background: #fffdf9;
          border-color: #ead9d0;
          box-shadow: 0 18px 48px rgba(80, 24, 24, 0.07);
        }

        .pastor-calendar-ui .pastor-day-card {
          min-height: 118px;
          border-radius: 28px;
          box-shadow: 0 8px 20px rgba(80, 24, 24, 0.04);
        }

        .pastor-calendar-ui .pastor-day-number {
          font-size: 24px !important;
          line-height: 1 !important;
        }

        .pastor-calendar-ui .pastor-popup-panel {
          background: #fffdf9;
          border-color: #ead9d0;
          color: #2b1717;
        }

        .pastor-calendar-ui .pastor-popup-header {
          background: #7a1717;
        }

        @media (max-width: 640px) {
          .pastor-calendar-ui {
            padding-left: 12px;
            padding-right: 12px;
          }

          .pastor-calendar-ui .pastor-calendar-shell {
            padding: 16px !important;
            border-radius: 30px !important;
          }

          .pastor-calendar-ui .pastor-calendar-title {
            text-align: center;
          }

          .pastor-calendar-ui .pastor-calendar-legend {
            display: none !important;
          }

          .pastor-calendar-ui .pastor-weekday-label {
            font-size: 16px !important;
            letter-spacing: 0.08em !important;
          }

          .pastor-calendar-ui .pastor-days-grid {
            gap: 10px !important;
          }

          .pastor-calendar-ui .pastor-day-card {
            min-height: 0 !important;
            aspect-ratio: 1 / 1;
            border-radius: 9999px !important;
            padding: 6px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
          }

          .pastor-calendar-ui .pastor-day-number {
            width: auto !important;
            height: auto !important;
            margin: 0 !important;
            background: transparent !important;
            font-size: 22px !important;
          }

          .pastor-calendar-ui .pastor-day-status,
          .pastor-calendar-ui .pastor-day-detail,
          .pastor-calendar-ui .pastor-day-badge {
            display: none !important;
          }

          .pastor-calendar-ui .pastor-popup-panel {
            max-height: 92vh !important;
            border-radius: 28px !important;
          }

          .pastor-calendar-ui .pastor-popup-body {
            padding: 16px !important;
          }

          .pastor-calendar-ui .pastor-slot-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 10px !important;
          }
        }
      `}</style>
      <div className="pastor-calendar-ui min-h-screen space-y-8 px-4 py-6" style={{ fontFamily: 'Arial, sans-serif', fontWeight: 700 }} dir={dir}>
      <PageTitle
        title={t('calendar.title')}
        subtitle={displayLocale === 'ar' ? 'إدارة الاجتماعات والإتاحة وطلبات الحجز وإشعارات المشاركين' : 'Manage meetings, availability, booking requests, and participant notifications'}
        icon={<CalendarIcon size={22} />}
      />

      <div className="pastor-dashboard-card flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 rounded-3xl border gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#1A1A1A]">{format(currentDate, 'MMMM yyyy', { locale: dateLocale })}</h2>
          <p className="text-xs text-gray-400 uppercase tracking-widest mt-1">
            {t('calendar.availabilityOpensBooking')}
          </p>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex bg-stone-50 rounded-xl p-1 border border-gray-200">
            <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 hover:bg-white rounded-lg transition-all"><ChevronLeft size={20} /></button>
            <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 hover:bg-white rounded-lg transition-all"><ChevronRight size={20} /></button>
          </div>
          <button
            type="button"
            onClick={() => setShowPeopleDevelopment(!showPeopleDevelopment)}
            className={`pastor-main-button flex items-center gap-2 px-5 py-3 rounded-xl font-bold transition-colors border ${
              showPeopleDevelopment
                ? 'bg-[#7a1717] text-white border-[#7a1717]'
                : 'bg-[#f8eeee] hover:bg-[#efd8d8] text-[#7a1717] border-[#d8aaaa]'
            }`}
            title={peopleNotesSubtitle}
          >
            <Users size={16} />
            <span>{peopleNotesTitle}</span>
            {participants.length > 0 && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                showPeopleDevelopment ? 'bg-white/20 text-white' : 'bg-white text-[#7a1717]'
              }`}>
                {participants.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setShowNextGenRegistrations(!showNextGenRegistrations)}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold transition-colors text-sm border ${
              showNextGenRegistrations
                ? 'bg-indigo-700 text-white border-indigo-700'
                : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
            }`}
          >
            <UserPlus size={16} />
            <span>{displayLocale === 'ar' ? 'تسجيلات NextGen' : 'NextGen Registrations'}</span>
            {pendingNextGenRegistrationCount > 0 && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                showNextGenRegistrations ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-700'
              }`}>
                {pendingNextGenRegistrationCount}
              </span>
            )}
            <ChevronDown
              size={16}
              className={`transition-transform ${showNextGenRegistrations ? 'rotate-180' : ''}`}
            />
          </button>
          <button
            type="button"
            onClick={() => setShowNextGenSurveyResults(!showNextGenSurveyResults)}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold transition-colors text-sm border ${
              showNextGenSurveyResults
                ? 'bg-emerald-700 text-white border-emerald-700'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
            }`}
          >
            <BarChart3 size={16} />
            <span>{displayLocale === 'ar' ? 'نتائج استبيان NextGen' : 'NextGen Survey Results'}</span>
            {nextGenSurveyResults.totalResponses > 0 && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                showNextGenSurveyResults ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'
              }`}>
                {nextGenSurveyResults.totalResponses}
              </span>
            )}
            <ChevronDown
              size={16}
              className={`transition-transform ${showNextGenSurveyResults ? 'rotate-180' : ''}`}
            />
          </button>
          <button
            type="button"
            onClick={() => setShowNextGenQuestions(!showNextGenQuestions)}
            className="flex items-center gap-2 bg-amber-50 hover:bg-amber-100 text-amber-700 px-5 py-3 rounded-xl font-bold transition-colors text-sm border border-amber-200"
          >
            <Trophy size={16} />
            <span>{displayLocale === 'ar' ? 'أسئلة NextGen' : 'NextGen Questions'}</span>
            {nextGenQuestions.length > 0 && (
              <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full font-bold">
                {nextGenQuestions.length}
              </span>
            )}
          </button>
          <button
            onClick={() => { setIsAddOpen(true); setEditingMeeting(null); setSelectedParticipants([]); setEmailSent(false); }}
            className="pastor-main-button flex items-center gap-2 bg-[#7a1717] text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-[#7a1717]/20 transition-all hover:scale-105 active:scale-95"
          >
            <Plus size={20} />
            <span>{t('calendar.addEvent')}</span>
          </button>
          <button
            onClick={() => {
              setShowAvailabilityModal(true);
              setEditingAvailability(null);
              resetAvailabilityForm();
            }}
            className="pastor-main-button flex items-center gap-2 bg-[#e8faee] hover:bg-[#dcf7e5] text-[#165d30] px-5 py-3 rounded-xl font-bold transition-colors border border-[#8ad0a1]"
          >
            <CheckCircle size={16} />
            <span>{t('calendar.markAvailable')}</span>
          </button>
          <button
            onClick={() => {
              setShowUnavailabilityModal(true);
              setEditingUnavailability(null);
              resetUnavailabilityForm();
            }}
            className="pastor-main-button flex items-center gap-2 bg-[#fff1f1] hover:bg-[#f8dddd] text-[#7a1717] px-5 py-3 rounded-xl font-bold transition-colors border border-[#d8aaaa]"
          >
            <XCircle size={16} />
            <span>{t('calendar.markUnavailable')}</span>
          </button>
        </div>
      </div>

      {showPeopleDevelopment && (
        <PeopleDevelopmentSection
          expanded={showPeopleDevelopment}
          locale={displayLocale}
          participants={participants}
          members={peopleDevelopmentMembers}
          assignments={peopleDevelopmentEntries}
          personalNotes={peoplePersonalNotes}
          searchTerm={peopleSearchTerm}
          draggedMemberKey={draggedPeopleMemberKey}
          savingMemberKey={peopleDevelopmentSavingKey}
          postingGroup={peopleDevelopmentPostingGroup}
          assignmentDrafts={peopleAssignmentDrafts}
          assignmentFiles={peopleAssignmentFiles}
          assignmentFileInputResetKeys={
            peopleAssignmentFileInputResetKeys
          }
          groupSelectDrafts={peopleGroupSelectDrafts}
          onToggleExpanded={() =>
            setShowPeopleDevelopment(
              previous => !previous,
            )
          }
          onSearchTermChange={setPeopleSearchTerm}
          onDraggedMemberKeyChange={
            setDraggedPeopleMemberKey
          }
          onDropMember={handleDropPersonOnGroup}
          onAssignPerson={handleAssignPersonToGroup}
          onDraftTextChange={setAssignmentDraft}
          onFileChange={
            handlePeopleAssignmentFileChange
          }
          onClearFile={clearPeopleAssignmentFile}
          onPostAssignment={
            handlePostPeopleDevelopmentAssignment
          }
          onGroupSelectDraftChange={setGroupSelectDraft}
          onOpenAssignments={
            openPeopleAssignmentsPopup
          }
          onOpenPersonalNote={openPeopleNotePopup}
        />
      )}

      <MeetingRequestsSection
        meetingRequests={meetingRequests}
        expanded={showRequests}
        loading={loading}
        locale={displayLocale}
        onToggleExpanded={() =>
          setShowRequests(
            previous => !previous,
          )
        }
        onDecision={handleRequestStatus}
      />

      {showNextGenRegistrations && (
        <NextGenRegistrationsSection
          registrations={nextGenRegistrations}
          expanded={showNextGenRegistrations}
          searchTerm={nextGenRegistrationSearchTerm}
          statusFilter={nextGenRegistrationStatusFilter}
          updatingUserId={nextGenRegistrationUpdatingId}
          locale={displayLocale}
          onToggleExpanded={() =>
            setShowNextGenRegistrations(
              previous => !previous,
            )
          }
          onSearchTermChange={
            setNextGenRegistrationSearchTerm
          }
          onStatusFilterChange={
            setNextGenRegistrationStatusFilter
          }
          onStatusChange={
            handleNextGenRegistrationStatus
          }
        />
      )}

      {showNextGenSurveyResults && (
        <NextGenSurveyResultsSection
          results={nextGenSurveyResults}
          expanded={showNextGenSurveyResults}
          loading={nextGenSurveyResultsLoading}
          error={nextGenSurveyResultsError}
          locale={displayLocale}
          onToggleExpanded={() =>
            setShowNextGenSurveyResults(
              previous => !previous,
            )
          }
        />
      )}

      {showNextGenQuestions && (
        <NextGenQuestionsSection
          questions={nextGenQuestions}
          expanded={showNextGenQuestions}
          loadingQuestionId={
            nextGenSelectionLoadingId
          }
          locale={displayLocale}
          onToggleExpanded={() =>
            setShowNextGenQuestions(
              previous => !previous,
            )
          }
          onSelectionChange={
            handleNextGenQuestionSelection
          }
        />
      )}

      <section className="pastor-calendar-shell p-6 rounded-3xl border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h3 className="pastor-calendar-title text-xl font-bold text-[#7a1717] flex items-center gap-2">
              <CalendarIcon size={20} />
              {format(currentDate, 'MMMM yyyy', { locale: dateLocale })}
            </h3>
            <p className="text-xs text-gray-400 uppercase tracking-widest mt-1">
              {t('calendar.availabilityOpensBooking')}
            </p>
          </div>
          <div className="pastor-calendar-legend flex items-center gap-2 font-bold">
            <span className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-2 text-green-700 border border-green-100">
              <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
              {t('calendar.available')}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-2 text-red-700 border border-red-100">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
              {t('calendar.unavailable')}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-2 text-amber-700 border border-amber-100">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              {t('booking.booked')}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2 mb-3">
          {[t('calendar.sun'), t('calendar.mon'), t('calendar.tue'), t('calendar.wed'), t('calendar.thu'), t('calendar.fri'), t('calendar.sat')].map(d => (
            <div key={d} className="pastor-weekday-label text-center uppercase tracking-widest text-[#6f4a4a] font-bold">{d}</div>
          ))}
        </div>

        <div className="pastor-days-grid grid grid-cols-7 gap-2 sm:gap-3">
          {Array.from({ length: startOfMonth(currentDate).getDay() }).map((_, i) => (
            <div key={`calendar-empty-${i}`} />
          ))}
          {days.map(day => {
            const dateStr = getDateString(day);
            const dayMeetings = getMeetingsForDate(meetings, dateStr);
            const pendingRequests = getPendingRequestsForDate(meetingRequests, dateStr);
            const dayAvailability = getAvailabilityBlocksForDate(availability, dateStr);
            const dayUnavailability = getUnavailabilityBlocksForDate(unavailability, dateStr);
            const openSlotCount = slotBlockHours.filter(hour => getDashboardSlotStatus(day, hour) === 'available').length;
            const blockedSlotCount = slotBlockHours.filter(hour => getDashboardSlotStatus(day, hour) === 'blocked').length;
            const bookedSlotCount = slotBlockHours.filter(hour => getDashboardSlotStatus(day, hour) === 'booked').length;
            const isSelected = selectedSlotDay && isSameDay(selectedSlotDay, day);
            const hasAvailability = dayAvailability.length > 0;
            const isTodayDate = isSameDay(day, new Date());

            const statusLabel = openSlotCount > 0
              ? t('calendar.available')
              : bookedSlotCount > 0
              ? t('booking.booked')
              : t('calendar.unavailable');

            const statusDetail = openSlotCount > 0
              ? `${openSlotCount} ${displayLocale === 'ar' ? 'فترة مفتوحة' : 'open slot(s)'}`
              : bookedSlotCount > 0
              ? `${bookedSlotCount} ${displayLocale === 'ar' ? 'محجوزة' : 'booked'}`
              : hasAvailability
              ? t('calendar.unavailable')
              : t('calendar.noAvailabilityOpened');

            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => setSelectedSlotDay(day)}
                className={`pastor-day-card min-h-[92px] sm:min-h-[112px] rounded-2xl border-2 p-2 sm:p-3 text-center transition-all hover:-translate-y-0.5 hover:shadow-md font-bold ${
                  isSelected
                    ? 'border-[#7a1717] bg-[#7a1717] text-white shadow-lg shadow-[#7a1717]/20'
                    : openSlotCount > 0
                    ? 'border-green-200 bg-green-50 text-green-800 hover:border-green-300'
                    : bookedSlotCount > 0
                    ? 'border-amber-200 bg-amber-50 text-amber-800 hover:border-amber-300'
                    : 'border-red-100 bg-red-50/70 text-red-800 hover:border-red-200'
                }`}
              >
                <div className={`pastor-day-number mx-auto mb-2 flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-full text-lg sm:text-xl font-black ${
                  isSelected
                    ? 'bg-white text-[#7a1717]'
                    : isTodayDate
                    ? 'bg-[#7a1717] text-white'
                    : 'bg-white/80'
                }`}>
                  {format(day, 'd', { locale: dateLocale })}
                </div>

                <div className={`pastor-day-status font-black uppercase tracking-wide ${isSelected ? 'text-white' : ''}`}>
                  {statusLabel}
                </div>
                <div className={`pastor-day-detail mt-1 hidden sm:block font-bold leading-tight ${isSelected ? 'text-white/85' : 'text-gray-500'}`}>
                  {statusDetail}
                </div>

                {(dayMeetings.length > 0 || pendingRequests.length > 0 || blockedSlotCount > 0 || dayUnavailability.length > 0) && (
                  <div className={`pastor-day-badge mt-2 mx-auto flex w-fit items-center justify-center gap-1 rounded-full px-2 py-1 font-black ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-white/80 text-[#7a1717]'
                  }`}>
                    {dayMeetings.length + pendingRequests.length + blockedSlotCount + dayUnavailability.length}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {selectedSlotDay && (
        <div
          className="fixed inset-0 z-[50] flex items-center justify-center bg-black/45 backdrop-blur-sm p-4"
          onClick={() => setSelectedSlotDay(null)}
          dir={dir}
          style={{ fontFamily: 'Arial, sans-serif' }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="pastor-popup-panel w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-3xl shadow-2xl border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pastor-popup-header sticky top-0 z-10 text-white p-6">
              <button
                type="button"
                onClick={() => setSelectedSlotDay(null)}
                className="absolute top-4 end-4 rounded-full bg-white/15 p-2 hover:bg-white/25 transition-colors"
              >
                <X size={20} />
              </button>
              <div className="pe-10">
                <h3 className="text-2xl font-black flex items-center gap-2">
                  <Clock size={22} />
                  {format(selectedSlotDay, 'EEEE, MMMM d, yyyy', { locale: dateLocale })}
                </h3>
                <p className="mt-1 text-sm font-bold text-white/80 uppercase tracking-widest">
                  {t('calendar.availabilityOpensBooking')}
                </p>
              </div>
            </div>

            <div className="pastor-popup-body max-h-[calc(90vh-104px)] overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const date = getDateString(selectedSlotDay);
                    setEditingAvailability(null);
                    setAvailabilityForm({
                      mode: 'single',
                      date,
                      startDate: date,
                      endDate: date,
                      selectedWeekdays: [0, 1, 2, 3, 4, 5, 6],
                      startTime: '09:00',
                      endTime: '20:00',
                      reason: '',
                      allDay: true,
                    });
                    setShowAvailabilityModal(true);
                  }}
                  className="flex items-center justify-center gap-2 rounded-2xl border-2 border-green-200 bg-green-50 px-4 py-3 text-green-700 font-black hover:bg-green-100 transition-colors"
                >
                  <CheckCircle size={18} />
                  {t('calendar.markAvailable')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const date = getDateString(selectedSlotDay);
                    setEditingUnavailability(null);
                    setUnavailabilityForm({
                      date,
                      startTime: '09:00',
                      endTime: '20:00',
                      reason: '',
                      allDay: true,
                    });
                    setShowUnavailabilityModal(true);
                  }}
                  className="flex items-center justify-center gap-2 rounded-2xl border-2 border-red-200 bg-red-50 px-4 py-3 text-red-700 font-black hover:bg-red-100 transition-colors"
                >
                  <XCircle size={18} />
                  {t('calendar.markUnavailable')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewMeeting(p => ({ ...p, date: getDateString(selectedSlotDay) }));
                    setEditingMeeting(null);
                    setSelectedParticipants([]);
                    setEmailSent(false);
                    setIsAddOpen(true);
                  }}
                  className="flex items-center justify-center gap-2 rounded-2xl border-2 border-[#7a1717]/20 bg-[#f8eeee] px-4 py-3 text-[#7a1717] font-black hover:bg-[#f1dddd] transition-colors"
                >
                  <Plus size={18} />
                  {t('calendar.addEvent')}
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="rounded-2xl border-2 border-green-100 bg-green-50/70 p-5">
                  <h4 className="font-black text-green-700 mb-4 flex items-center gap-2">
                    <CheckCircle size={18} />
                    {displayLocale === 'ar' ? 'الفترات المتاحة للحجز' : 'Available Booking Slots'}
                  </h4>

                  {selectedDayOpenSlotHours.length === 0 ? (
                    <div className="rounded-2xl bg-white border border-green-100 p-4 text-green-700/70 font-black">
                      {displayLocale === 'ar' ? 'لا توجد فترات متاحة مفتوحة في هذا اليوم.' : 'No available booking slots opened for this day.'}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {selectedDayOpenSlotHours.map(hour => (
                        <div
                          key={hour}
                          className="rounded-2xl bg-white border-2 border-green-100 p-4 text-green-800 font-black"
                        >
                          <div className="flex items-center gap-2">
                            <Clock size={16} />
                            {hourToLabel(hour, displayLocale)} - {hourToLabel(hour + SLOT_BLOCK_DURATION, displayLocale)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedDayAvailabilityBlocks.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <div className="text-[#165d30]/70 uppercase tracking-widest">
                        {displayLocale === 'ar' ? 'نوافذ الإتاحة' : 'Availability Windows'}
                      </div>
                      {selectedDayAvailabilityBlocks.map(a => (
                        <div key={a.id} className="group rounded-xl bg-white border border-green-100 p-3 text-green-800 relative">
                          <button
                            type="button"
                            onClick={() => handleDeleteAvailability(a.id)}
                            className="absolute top-2 end-2 text-green-500 hover:text-green-800 opacity-70"
                          >
                            <X size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingAvailability(a);
                              setAvailabilityForm({
                                mode: 'single',
                                date: a.date,
                                startDate: a.date,
                                endDate: a.date,
                                selectedWeekdays: [0, 1, 2, 3, 4, 5, 6],
                                startTime: a.startTime || '09:00',
                                endTime: a.endTime || '20:00',
                                reason: a.reason || '',
                                allDay: a.allDay || false,
                              });
                              setShowAvailabilityModal(true);
                            }}
                            className="block w-full text-start pe-8"
                          >
                            <div>{a.allDay ? t('calendar.available') : timeRangeToLabel(a.startTime, a.endTime, displayLocale)}</div>
                            {a.reason && <div className="mt-1 text-green-600">{a.reason}</div>}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border-2 border-[#ead9d0] bg-stone-50 p-5">
                  <h4 className="font-black text-[#7a1717] mb-4 flex items-center gap-2">
                    <CalendarIcon size={18} />
                    {t('calendar.meeting')}
                  </h4>
                  <div className="space-y-3">
                    {selectedDayMeetings.length === 0 ? (
                      <div className="rounded-2xl bg-white border border-[#ead9d0] p-4 text-gray-400 font-black">
                        {displayLocale === 'ar' ? 'لا توجد اجتماعات مؤكدة.' : 'No confirmed meetings.'}
                      </div>
                    ) : selectedDayMeetings.map(m => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => openMeetingEditor(m)}
                        className="block w-full rounded-2xl bg-white border-2 border-[#ead9d0] p-4 text-start font-black hover:border-[#7a1717]/30 hover:bg-[#f8eeee] transition-colors"
                      >
                        <div className="text-[#7a1717]">{getMeetingDisplayTitle(m)}</div>
                        <div className="text-gray-500 mt-1">{timeRangeToLabel(m.startTime, m.endTime, displayLocale)}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <details className="rounded-2xl border-2 border-[#ead9d0] bg-white p-4">
                <summary className="cursor-pointer list-none font-black text-[#7a1717] flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2">
                    <Clock size={18} />
                    {displayLocale === 'ar' ? 'التحقق من كل الفترات' : 'Verify All Slots'}
                  </span>
                  <span className="text-[#7a1717]/60">
                    {displayLocale === 'ar' ? 'افتح للتفاصيل' : 'Collapsed by default'}
                  </span>
                </summary>

                <div className="mt-4 rounded-2xl bg-[#fbf7f2] border border-[#ead9d0] p-4">
                  <p className="mb-4 text-[#6b4b4b]">
                    {displayLocale === 'ar'
                      ? 'هذه المنطقة للتحقق فقط. الفترات غير المفتوحة تعتبر غير متاحة تلقائياً.'
                      : 'Verification only. Slots are unavailable by default unless availability opens them.'}
                  </p>
                  <div className="pastor-slot-grid grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {slotBlockHours.map(hour => {
                      const status = getDashboardSlotStatus(selectedSlotDay, hour);
                      const isClickable = status === 'available' || status === 'blocked';
                      const slotLabel = getDashboardSlotLabel(status);

                      return (
                        <button
                          key={hour}
                          type="button"
                          disabled={!isClickable || slotBlockingLoading}
                          onClick={() => handleToggleSlotBlock(selectedSlotDay, hour)}
                          className={`p-3 rounded-xl border-2 font-black transition-all ${
                            status === 'blocked'
                              ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
                              : status === 'available'
                              ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
                              : status === 'booked'
                              ? 'bg-amber-50 border-amber-200 text-amber-700 cursor-not-allowed opacity-80'
                              : 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed opacity-70'
                          }`}
                        >
                          <div>{hourToLabel(hour, displayLocale)}</div>
                          <div className="mt-1 uppercase tracking-widest">{slotLabel}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </details>

            </div>
          </motion.div>
        </div>
      )}

      <section className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <h3 className="text-xl font-bold flex items-center gap-2 text-[#7a1717]">
            <Clock size={20} />
            {t('calendar.upcoming')}
          </h3>
          <span className="px-5 py-3 bg-[#f8eeee] text-[#7a1717] rounded-xl text-xs font-bold border border-[#d8aaaa]">
            {displayLocale === 'ar'
              ? 'يتم إرسال التأكيد تلقائياً عند القبول'
              : 'Accept sends EmailJS confirmation automatically'}
          </span>
        </div>
        <div className="space-y-4">
          {meetings.filter(m => {
            if (!m.date) return false;
            try {
              return parseISO(m.date) >= new Date();
            } catch {
              return false;
            }
          }).map(m => {
            const meetingParticipants = (m.participantIds || []).map(id =>
              participants.find(p => p.id === id)
            ).filter(Boolean) as Participant[];

            const requestEmail = getMeetingRequestEmail(m);
            const requestReason = getMeetingRequestReason(m);
            const requestAcknowledged = getMeetingAcknowledged(m);

            return (
              <div
                key={m.id}
                onClick={() => openMeetingEditor(m)}
                className="flex flex-col md:flex-row md:items-center justify-between p-6 bg-stone-50 rounded-2xl border border-gray-100 hover:border-[#7a1717]/20 transition-all gap-4 cursor-pointer"
              >
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-white rounded-xl shadow-sm flex flex-col items-center justify-center border border-gray-100">
                    <span className="text-[10px] uppercase font-bold text-gray-400">{format(parseISO(m.date), 'MMM', { locale: dateLocale })}</span>
                    <span className="text-2xl font-bold text-[#7a1717] leading-none">{format(parseISO(m.date), 'dd')}</span>
                  </div>
                  <div>
                    <h4 className="text-lg font-bold">{getMeetingDisplayTitle(m)}</h4>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 mt-1">
                      <span className="flex items-center gap-1"><Clock size={12} /> {timeRangeToLabel(m.startTime, m.endTime, displayLocale)}</span>
                      {m.location && <span className="flex items-center gap-1"><MapPin size={12} /> {m.location}</span>}
                      {requestEmail && <span className="flex items-center gap-1"><Mail size={12} /> {requestEmail}</span>}
                      {meetingParticipants.length > 0 && (
                        <span className="flex items-center gap-1"><Users size={12} /> {meetingParticipants.map(p => p.name).join(', ')}</span>
                      )}
                    </div>
                    {requestReason && <p className="text-xs text-gray-400 mt-1 italic">{requestReason}</p>}
                    {requestEmail && (
                      <div className={`inline-flex items-center gap-1 mt-2 px-2 py-1 rounded-full text-[10px] font-bold ${
                        requestAcknowledged
                          ? 'bg-green-50 text-green-700 border border-green-100'
                          : 'bg-amber-50 text-amber-700 border border-amber-100'
                      }`}>
                        {requestAcknowledged
                          ? (displayLocale === 'ar' ? 'تم إرسال التأكيد' : 'Confirmation sent')
                          : (displayLocale === 'ar' ? 'في انتظار التأكيد' : 'Confirmation pending')}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 self-end md:self-auto flex-wrap justify-end">
                  {requestEmail && !requestAcknowledged && (
                    <span className="px-4 py-3 bg-amber-50 text-amber-700 rounded-xl text-xs font-bold border border-amber-100">
                      {displayLocale === 'ar' ? 'لم يتم تأكيده بعد' : 'Not confirmed yet'}
                    </span>
                  )}
                  {requestEmail && requestAcknowledged && (
                    <span className="px-4 py-3 bg-gray-50 text-gray-500 rounded-xl text-xs font-bold border border-gray-100">
                      {displayLocale === 'ar' ? 'تم التأكيد' : 'Acknowledged'}
                    </span>
                  )}
                  {m.meetLink && (
                    <a
                      href={m.meetLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors"
                    >
                      <Video size={18} />
                    </a>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(m.id!);
                    }}
                    className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            );
          })}
          {meetings.filter(m => {
            if (!m.date) return false;
            try { return parseISO(m.date) >= new Date(); } catch { return false; }
          }).length === 0 && (
            <div className="text-center py-12 text-gray-400 italic">{t('calendar.noUpcoming')}</div>
          )}
        </div>
      </section>

      {isAddOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center bg-stone-50 sticky top-0 z-10">
              <h3 className="text-xl font-bold">{editingMeeting ? t('calendar.update') : t('calendar.create')}</h3>
              <button onClick={() => setIsAddOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('calendar.titleField')}</label>
                <input required type="text" className="w-full px-4 py-3 bg-stone-50 border-none rounded-xl focus:ring-2 focus:ring-[#7a1717]/20 outline-none" value={newMeeting.title} onChange={e => setNewMeeting(p => ({ ...p, title: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('calendar.dateField')}</label>
                  <input required type="date" className="w-full px-4 py-3 bg-stone-50 border-none rounded-xl focus:ring-2 focus:ring-[#7a1717]/20 outline-none" value={newMeeting.date} onChange={e => setNewMeeting(p => ({ ...p, date: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('calendar.typeField')}</label>
                  <select className="w-full px-4 py-3 bg-stone-50 border-none rounded-xl focus:ring-2 focus:ring-[#7a1717]/20 outline-none" value={newMeeting.type} onChange={e => setNewMeeting(p => ({ ...p, type: e.target.value as any }))}>
                    <option value="service">{t('calendar.service')}</option>
                    <option value="prayer">{t('calendar.prayer')}</option>
                    <option value="counseling">{t('calendar.counseling')}</option>
                    <option value="other">{t('calendar.other')}</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('calendar.startTime')}</label>
                  <select required className="w-full px-4 py-3 bg-stone-50 border-none rounded-xl focus:ring-2 focus:ring-[#7a1717]/20 outline-none" value={newMeeting.startTime} onChange={e => setNewMeeting(p => ({ ...p, startTime: e.target.value }))}>
                    {MEETING_TIME_OPTIONS.map(option => (
                      <option key={`meeting-start-${option.value}`} value={option.value}>{hourToLabel(option.hour, displayLocale)}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('calendar.endTime')}</label>
                  <select required className="w-full px-4 py-3 bg-stone-50 border-none rounded-xl focus:ring-2 focus:ring-[#7a1717]/20 outline-none" value={newMeeting.endTime} onChange={e => setNewMeeting(p => ({ ...p, endTime: e.target.value }))}>
                    {MEETING_TIME_OPTIONS.map(option => (
                      <option key={`meeting-end-${option.value}`} value={option.value}>{hourToLabel(option.hour, displayLocale)}</option>
                    ))}
                  </select>
                </div>
              </div>

              {participants.length > 0 && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('calendar.participants')}</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowParticipantDropdown(!showParticipantDropdown)}
                      className="w-full px-4 py-3 bg-stone-50 border-none rounded-xl flex items-center justify-between text-left hover:bg-stone-100 transition-colors"
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <Users size={16} className="text-gray-400 flex-shrink-0" />
                        <span className="truncate text-sm">
                          {selectedCount === 0
                            ? t('calendar.selectParticipants')
                            : `${selectedCount} ${t('calendar.selected')}`
                          }
                        </span>
                      </div>
                      <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />
                    </button>

                    {showParticipantDropdown && (
                      <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                        <div className="p-2 border-b bg-stone-50 rounded-t-xl flex justify-between items-center">
                          <span className="text-xs font-bold text-gray-500 uppercase">{participants.length} {t('calendar.trainees')}</span>
                          <button
                            type="button"
                            onClick={() => setSelectedParticipants(participants.map(p => p.id))}
                            className="text-[10px] text-[#7a1717] font-bold hover:underline"
                          >
                            {t('calendar.selectAll')}
                          </button>
                        </div>
                        {participants.map(p => (
                          <label
                            key={p.id}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-stone-50 cursor-pointer border-b border-gray-50 last:border-b-0"
                          >
                            <input
                              type="checkbox"
                              checked={selectedParticipants.includes(p.id)}
                              onChange={() => toggleParticipant(p.id)}
                              className="w-4 h-4 rounded border-gray-300 text-[#7a1717] focus:ring-[#7a1717]"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-bold truncate">{p.name}</div>
                              <div className="text-[10px] text-gray-400 truncate">{p.email}</div>
                            </div>
                            {p.primaryGift && (
                              <span className="text-[9px] bg-stone-100 text-gray-500 px-2 py-0.5 rounded-full whitespace-nowrap">{p.primaryGift}</span>
                            )}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  {selectedCount > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {selectedNames.map((name, i) => (
                        <span key={i} className="inline-flex items-center gap-1 text-[10px] bg-[#f8eeee] text-[#7a1717] px-2 py-1 rounded-full">
                          {name}
                          <button type="button" onClick={() => toggleParticipant(selectedParticipants[i])} className="hover:text-red-500">
                            <X size={10} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                  {displayLocale === 'ar' ? 'رابط الاجتماع عبر الإنترنت (اختياري)' : 'Online Meeting Link (Optional)'}
                </label>
                <div className="relative">
                  <Video className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="url"
                    placeholder="https://..."
                    className="w-full pl-12 pr-4 py-3 bg-stone-50 border-none rounded-xl focus:ring-2 focus:ring-[#7a1717]/20 outline-none"
                    value={newMeeting.meetLink}
                    onChange={event => setNewMeeting(previous => ({ ...previous, meetLink: event.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('calendar.location')}</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input type="text" className="w-full pl-12 pr-4 py-3 bg-stone-50 border-none rounded-xl focus:ring-2 focus:ring-[#7a1717]/20 outline-none" value={newMeeting.location} onChange={e => setNewMeeting(p => ({ ...p, location: e.target.value }))} />
                </div>
              </div>

              {emailSent && (
                <div className="flex items-center gap-2 text-green-700 bg-green-50 px-4 py-3 rounded-xl border border-green-100">
                  <Check size={16} />
                  <span className="text-sm font-bold">{t('calendar.meetingSaved')} ({selectedCount})!</span>
                </div>
              )}

              <button disabled={loading} type="submit" className="w-full py-4 bg-[#7a1717] text-white rounded-2xl font-bold shadow-xl shadow-[#7a1717]/10 hover:scale-[1.02] active:scale-98 transition-all flex items-center justify-center gap-2">
                {loading ? (
                  <>{t('calendar.saving')}</>
                ) : (
                  <>
                    <Send size={16} />
                    {editingMeeting ? t('calendar.update') : t('calendar.create')}
                  </>
                )}
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {showAvailabilityModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center bg-stone-50 sticky top-0 z-10">
              <div>
                <h3 className="text-xl font-bold text-green-700">{editingAvailability ? t('calendar.editAvailability') : t('calendar.markAvailable')}</h3>
                <p className="text-xs text-gray-400 mt-1">{t('calendar.availabilityDatabaseNote')}</p>
              </div>
              <button onClick={() => { setShowAvailabilityModal(false); setEditingAvailability(null); resetAvailabilityForm(); }} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateAvailability} className="p-6 space-y-4">
              {!editingAvailability && (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setAvailabilityForm(p => ({ ...p, mode: 'single' }))}
                    className={`py-3 rounded-xl text-sm font-bold border transition-colors ${
                      availabilityForm.mode === 'single'
                        ? 'bg-green-600 text-white border-green-600'
                        : 'bg-white text-green-700 border-green-200 hover:bg-green-50'
                    }`}
                  >
                    {t('calendar.singleDay')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAvailabilityForm(p => ({ ...p, mode: 'multiple' }))}
                    className={`py-3 rounded-xl text-sm font-bold border transition-colors ${
                      availabilityForm.mode === 'multiple'
                        ? 'bg-green-600 text-white border-green-600'
                        : 'bg-white text-green-700 border-green-200 hover:bg-green-50'
                    }`}
                  >
                    {t('calendar.multipleDays')}
                  </button>
                </div>
              )}

              {(availabilityForm.mode === 'single' || editingAvailability) && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('calendar.dateField')}</label>
                  <input
                    required
                    type="date"
                    className="w-full px-4 py-3 bg-stone-50 border-none rounded-xl focus:ring-2 focus:ring-green-300 outline-none"
                    value={availabilityForm.date}
                    onChange={e => setAvailabilityForm(p => ({ ...p, date: e.target.value }))}
                  />
                </div>
              )}

              {availabilityForm.mode === 'multiple' && !editingAvailability && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('calendar.startDate')}</label>
                      <input
                        required
                        type="date"
                        className="w-full px-4 py-3 bg-stone-50 border-none rounded-xl focus:ring-2 focus:ring-green-300 outline-none"
                        value={availabilityForm.startDate}
                        onChange={e => setAvailabilityForm(p => ({ ...p, startDate: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('calendar.endDate')}</label>
                      <input
                        required
                        type="date"
                        className="w-full px-4 py-3 bg-stone-50 border-none rounded-xl focus:ring-2 focus:ring-green-300 outline-none"
                        value={availabilityForm.endDate}
                        onChange={e => setAvailabilityForm(p => ({ ...p, endDate: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('calendar.daysIncluded')}</label>
                    <div className="grid grid-cols-7 gap-2">
                      {[
                        { day: 0, label: t('calendar.sun') },
                        { day: 1, label: t('calendar.mon') },
                        { day: 2, label: t('calendar.tue') },
                        { day: 3, label: t('calendar.wed') },
                        { day: 4, label: t('calendar.thu') },
                        { day: 5, label: t('calendar.fri') },
                        { day: 6, label: t('calendar.sat') },
                      ].map(item => (
                        <button
                          key={item.day}
                          type="button"
                          onClick={() =>
                            setAvailabilityForm(previous => ({
                              ...previous,
                              selectedWeekdays:
                                toggleAvailabilityWeekday(
                                  previous.selectedWeekdays,
                                  item.day,
                                ),
                            }))
                          }
                          className={`py-2 rounded-lg text-[10px] font-bold border transition-colors ${
                            availabilityForm.selectedWeekdays.includes(item.day)
                              ? 'bg-green-600 text-white border-green-600'
                              : 'bg-white text-gray-400 border-gray-200 hover:bg-green-50 hover:text-green-700'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400">
                      {t('calendar.selectedDatesToCreate')}: {availabilityDateCount}
                    </p>
                  </div>
                </>
              )}

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="allDayAvailability"
                  checked={availabilityForm.allDay}
                  onChange={e => setAvailabilityForm(p => ({ ...p, allDay: e.target.checked }))}
                  className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <label htmlFor="allDayAvailability" className="text-sm font-bold text-gray-700">{t('calendar.allBookableHours')}</label>
              </div>

              {!availabilityForm.allDay && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('calendar.startTime')}</label>
                    <select
                      required
                      className="w-full px-4 py-3 bg-stone-50 border-none rounded-xl focus:ring-2 focus:ring-green-300 outline-none"
                      value={availabilityForm.startTime}
                      onChange={e => setAvailabilityForm(p => ({ ...p, startTime: e.target.value }))}
                    >
                      {BOOKING_WINDOW_TIME_OPTIONS.map(option => (
                        <option key={`availability-start-${option.value}`} value={option.value}>{hourToLabel(option.hour, displayLocale)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('calendar.endTime')}</label>
                    <select
                      required
                      className="w-full px-4 py-3 bg-stone-50 border-none rounded-xl focus:ring-2 focus:ring-green-300 outline-none"
                      value={availabilityForm.endTime}
                      onChange={e => setAvailabilityForm(p => ({ ...p, endTime: e.target.value }))}
                    >
                      {BOOKING_WINDOW_TIME_OPTIONS.map(option => (
                        <option key={`availability-end-${option.value}`} value={option.value}>{hourToLabel(option.hour, displayLocale)}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('calendar.reasonLabelOptional')}</label>
                <input
                  type="text"
                  placeholder={t('calendar.availabilityPlaceholder')}
                  className="w-full px-4 py-3 bg-stone-50 border-none rounded-xl focus:ring-2 focus:ring-green-300 outline-none"
                  value={availabilityForm.reason}
                  onChange={e => setAvailabilityForm(p => ({ ...p, reason: e.target.value }))}
                />
              </div>

              <button disabled={loading} type="submit" className="w-full py-4 bg-green-600 text-white rounded-2xl font-bold shadow-xl shadow-green-600/10 hover:scale-[1.02] active:scale-98 transition-all flex items-center justify-center gap-2">
                {loading ? (
                  <>{t('calendar.savingPlain')}</>
                ) : (
                  <>
                    <Send size={16} />
                    {editingAvailability ? t('calendar.updateAvailability') : availabilityForm.mode === 'multiple' ? `${t('calendar.markDaysAvailable')} (${availabilityDateCount})` : t('calendar.markDayAvailable')}
                  </>
                )}
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {showUnavailabilityModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center bg-stone-50 sticky top-0 z-10">
              <div>
                <h3 className="text-xl font-bold text-red-700">{editingUnavailability ? t('calendar.editUnavailability') : t('calendar.markUnavailable')}</h3>
                <p className="text-xs text-gray-400 mt-1">{t('calendar.unavailabilityDatabaseNote')}</p>
              </div>
              <button onClick={() => { setShowUnavailabilityModal(false); setEditingUnavailability(null); resetUnavailabilityForm(); }} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateUnavailability} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('calendar.dateField')}</label>
                <input
                  required
                  type="date"
                  className="w-full px-4 py-3 bg-stone-50 border-none rounded-xl focus:ring-2 focus:ring-red-300 outline-none"
                  value={unavailabilityForm.date}
                  onChange={e => setUnavailabilityForm(p => ({ ...p, date: e.target.value }))}
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="allDayUnavailability"
                  checked={unavailabilityForm.allDay}
                  onChange={e => setUnavailabilityForm(p => ({ ...p, allDay: e.target.checked }))}
                  className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                />
                <label htmlFor="allDayUnavailability" className="text-sm font-bold text-gray-700">{t('calendar.allDay')}</label>
              </div>

              {!unavailabilityForm.allDay && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('calendar.startTime')}</label>
                    <select
                      required
                      className="w-full px-4 py-3 bg-stone-50 border-none rounded-xl focus:ring-2 focus:ring-red-300 outline-none"
                      value={unavailabilityForm.startTime}
                      onChange={e => setUnavailabilityForm(p => ({ ...p, startTime: e.target.value }))}
                    >
                      {FULL_DAY_TIME_OPTIONS.map(option => (
                        <option key={`unavailability-start-${option.value}`} value={option.value}>{hourToLabel(option.hour, displayLocale)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('calendar.endTime')}</label>
                    <select
                      required
                      className="w-full px-4 py-3 bg-stone-50 border-none rounded-xl focus:ring-2 focus:ring-red-300 outline-none"
                      value={unavailabilityForm.endTime}
                      onChange={e => setUnavailabilityForm(p => ({ ...p, endTime: e.target.value }))}
                    >
                      {FULL_DAY_TIME_OPTIONS.map(option => (
                        <option key={`unavailability-end-${option.value}`} value={option.value}>{hourToLabel(option.hour, displayLocale)}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('calendar.reasonOptional')}</label>
                <input
                  type="text"
                  placeholder={t('calendar.unavailabilityPlaceholder')}
                  className="w-full px-4 py-3 bg-stone-50 border-none rounded-xl focus:ring-2 focus:ring-red-300 outline-none"
                  value={unavailabilityForm.reason}
                  onChange={e => setUnavailabilityForm(p => ({ ...p, reason: e.target.value }))}
                />
              </div>

              <button disabled={loading} type="submit" className="w-full py-4 bg-red-600 text-white rounded-2xl font-bold shadow-xl shadow-red-600/10 hover:scale-[1.02] active:scale-98 transition-all flex items-center justify-center gap-2">
                {loading ? (
                  <>{t('calendar.savingPlain')}</>
                ) : (
                  <>
                    <Send size={16} />
                    {editingUnavailability ? t('calendar.updateUnavailability') : t('calendar.markUnavailable')}
                  </>
                )}
              </button>
            </form>
          </motion.div>
        </div>
      )}

      <PeoplePersonalNoteModal
        open={showPeopleNotePopup}
        person={selectedPeopleNotePerson}
        noteType={peopleNoteType}
        noteText={peopleNoteText}
        saving={peopleNoteSaving}
        locale={displayLocale}
        assignedGroup={selectedPeopleNoteAssignedGroup}
        groupLabel={selectedPeopleNoteGroupLabel}
        onNoteTypeChange={setPeopleNoteType}
        onNoteTextChange={setPeopleNoteText}
        onClose={closePeopleNotePopup}
        onSubmit={handleSubmitPeoplePersonalNote}
      />

      <PeopleAssignmentsCalendarModal
        open={Boolean(peopleAssignmentsPopupGroup)}
        groupId={peopleAssignmentsPopupGroup}
        entries={activePeopleAssignmentsPopupEntries}
        month={peopleAssignmentsPopupMonth}
        selectedDate={
          peopleAssignmentsPopupSelectedDate
        }
        deletingKey={peopleDevelopmentDeletingKey}
        locale={displayLocale}
        onMonthChange={
          changePeopleAssignmentsPopupMonth
        }
        onSelectedDateChange={
          setPeopleAssignmentsPopupSelectedDate
        }
        onClose={closePeopleAssignmentsPopup}
        onDeleteAssignment={
          handleDeletePeopleDevelopmentPost
        }
        onDeleteAttachment={
          handleDeletePeopleDevelopmentAttachment
        }
      />



      </div>
    </>
  );
}
