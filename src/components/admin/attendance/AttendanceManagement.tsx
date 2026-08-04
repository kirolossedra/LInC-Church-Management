import { BarChart3, ClipboardList, UserPlus } from 'lucide-react';
import { ATTENDANCE_RESPONSIVE_STYLES } from './attendance.styles';
import AttendanceAnalysisPanel from './AttendanceAnalysisPanel';
import AttendancePeoplePanel from './AttendancePeoplePanel';
import AttendancePersonModal from './AttendancePersonModal';
import AttendancePersonalAnalysisModal from './AttendancePersonalAnalysisModal';
import AttendanceRecordingPanel from './AttendanceRecordingPanel';
import useAttendanceManagement from './useAttendanceManagement';

export default function AttendanceManagement() {
  const controller = useAttendanceManagement();
  const { dir, activePanel, setActivePanel, text } = controller;

  return (
    <div
      dir={dir}
      className="attendance-page-root"
      style={{
        minHeight: 'auto',
        padding: '0',
        fontFamily: 'Arial, sans-serif',
        background: 'transparent',
      }}
    >
      <style>{ATTENDANCE_RESPONSIVE_STYLES}</style>
      <div
        style={{
          width: '100%',
          maxWidth: '980px',
          margin: '0 auto',
        }}
      >
        <div
          className="attendance-main-card"
          style={{
            background: 'white',
            borderRadius: '28px',
            padding: '40px',
            boxShadow: '0 12px 35px rgba(139, 30, 30, 0.14)',
            border: '1px solid rgba(139, 30, 30, 0.12)',
            textAlign: 'center',
          }}
        >
          <h1
            style={{
              margin: '0 0 12px',
              color: '#8b1e1e',
              fontSize: '32px',
              fontWeight: 800,
            }}
          >
            {text.pageTitle}
          </h1>

          <p
            style={{
              margin: '0 0 32px',
              color: '#666',
              fontSize: '17px',
              lineHeight: 1.6,
            }}
          >
            {text.pageDescription}
          </p>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              maxWidth: '520px',
              margin: '0 auto',
            }}
          >
            <button
              type="button"
              onClick={() => setActivePanel('people')}
              style={{
                width: '100%',
                minHeight: '58px',
                border: '2px solid #8b1e1e',
                borderRadius: '999px',
                background: activePanel === 'people' ? '#8b1e1e' : 'white',
                color: activePanel === 'people' ? 'white' : '#8b1e1e',
                fontSize: '18px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                boxShadow: activePanel === 'people' ? '0 8px 24px rgba(139, 30, 30, 0.22)' : 'none',
              }}
            >
              <UserPlus size={20} />
              {text.addModifyPerson}
            </button>

            <button
              type="button"
              onClick={() => setActivePanel('attendance')}
              style={{
                width: '100%',
                minHeight: '58px',
                border: '2px solid #8b1e1e',
                borderRadius: '999px',
                background: activePanel === 'attendance' ? '#8b1e1e' : 'white',
                color: activePanel === 'attendance' ? 'white' : '#8b1e1e',
                fontSize: '18px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                boxShadow: activePanel === 'attendance' ? '0 8px 24px rgba(139, 30, 30, 0.22)' : 'none',
              }}
            >
              <ClipboardList size={20} />
              {text.takeAttendance}
            </button>

            <button
              type="button"
              onClick={() => setActivePanel('analysis')}
              style={{
                width: '100%',
                minHeight: '58px',
                border: '2px solid #8b1e1e',
                borderRadius: '999px',
                background: activePanel === 'analysis' ? '#8b1e1e' : 'white',
                color: activePanel === 'analysis' ? 'white' : '#8b1e1e',
                fontSize: '18px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                boxShadow: activePanel === 'analysis' ? '0 8px 24px rgba(139, 30, 30, 0.22)' : 'none',
              }}
            >
              <BarChart3 size={20} />
              {text.analysis}
            </button>
          </div>
        </div>


        <AttendancePeoplePanel controller={controller} />
        <AttendancePersonModal controller={controller} />
        <AttendanceRecordingPanel controller={controller} />
        <AttendanceAnalysisPanel controller={controller} />
        <AttendancePersonalAnalysisModal controller={controller} />
      </div>
    </div>
  );
}
