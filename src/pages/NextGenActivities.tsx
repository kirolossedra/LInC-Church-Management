import { useState } from 'react';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n';
import {
  NextGenAccessSection,
  NextGenActivityMenu,
  NextGenParticipantHeader,
  NextGenPeerReviewPanel,
  NextGenQuestionPanel,
  NextGenSurveyPanel,
  useNextGenIdentity,
  useNextGenQuestions,
  useNextGenSurvey,
} from '../components/nextgen/activities';
import type { NextGenActivityPanel } from '../components/nextgen/activities';

export default function NextGenActivities() {
  const navigate = useNavigate();
  const { dir, locale } = useI18n();
  const isArabic = locale === 'ar';
  const [activePanel, setActivePanel] = useState<NextGenActivityPanel>(null);

  const identity = useNextGenIdentity(isArabic);
  const questions = useNextGenQuestions(
    identity.activeUser,
    identity.initialReviewedSessionIds,
    isArabic,
  );
  const survey = useNextGenSurvey(identity.activeUser, isArabic);

  const selectPanel = (panel: Exclude<NextGenActivityPanel, null>) => {
    setActivePanel(panel);
    if (panel === 'survey') survey.clearMessages();
  };

  const logout = () => {
    setActivePanel(null);
    questions.resetQuestionSession();
    survey.resetSurveySession();
    identity.handleLogout();
  };

  return (
    <div className="min-h-screen bg-[#f5f4f0]" dir={dir} style={{ fontFamily: 'Arial, sans-serif' }}>
      <section className="relative overflow-hidden px-6 py-10">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{ background: 'radial-gradient(circle at 50% 0%, #8b1e1e, transparent 58%)' }}
        />

        <div className="relative max-w-6xl mx-auto">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 px-5 py-3 bg-white text-[#8b1e1e] rounded-full font-bold border border-[rgba(139,30,30,0.12)] shadow-sm hover:bg-[#f8eeee] transition-all"
          >
            <ArrowLeft size={18} className={isArabic ? 'rotate-180' : ''} />
            {isArabic ? 'العودة للرئيسية' : 'Back to Home'}
          </button>

          <div className="text-center mt-14 mb-12">
            <div className="w-16 h-16 mx-auto grid place-items-center rounded-full bg-[#8b1e1e] text-white shadow-[0_8px_28px_rgba(139,30,30,0.24)] mb-6">
              <Sparkles size={28} />
            </div>
            <h1 className="text-[clamp(2rem,5vw,3.5rem)] font-bold text-[#8b1e1e] leading-tight mb-4">
              {isArabic ? 'أنشطة NextGen' : 'NextGen Activities'}
            </h1>
            <p className="max-w-2xl mx-auto text-[#666] text-lg leading-relaxed">
              {isArabic
                ? 'ابدأ كمستخدم NextGen جديد أو شارك باستخدام معرّف تمت الموافقة عليه.'
                : 'Get started as a new NextGen user or participate with an approved identifier.'}
            </p>
          </div>

          {!identity.activeUser ? (
            <NextGenAccessSection controller={identity} isArabic={isArabic} />
          ) : (
            <>
              <NextGenParticipantHeader
                user={identity.activeUser}
                isArabic={isArabic}
                onLogout={logout}
              />
              <NextGenActivityMenu
                activePanel={activePanel}
                isArabic={isArabic}
                isSurveyCompleted={survey.isSurveyCompleted}
                onSelect={selectPanel}
              />
              {activePanel === 'question' && (
                <NextGenQuestionPanel
                  controller={questions}
                  isArabic={isArabic}
                  onClose={() => setActivePanel(null)}
                />
              )}
              {activePanel === 'survey' && (
                <NextGenSurveyPanel
                  user={identity.activeUser}
                  controller={survey}
                  isArabic={isArabic}
                  onClose={() => setActivePanel(null)}
                />
              )}
              {activePanel === 'peer-review' && (
                <NextGenPeerReviewPanel
                  user={identity.activeUser}
                  controller={questions}
                  isArabic={isArabic}
                  onClose={() => setActivePanel(null)}
                />
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
