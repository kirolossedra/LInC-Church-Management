import { useState } from 'react';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n';
import LincPageHero from '../components/linc/LincPageHero';
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
    <div className="nextgen-ui min-h-screen" dir={dir}>
      <section className="relative overflow-hidden py-2 md:py-6">
        <div className="relative mx-auto max-w-6xl space-y-8">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 rounded-2xl border border-[#681919]/10 bg-[#fffdf9]/90 px-5 py-3 font-bold text-[#681919] shadow-sm transition-all hover:-translate-y-0.5 hover:bg-white"
          >
            <ArrowLeft size={18} className={isArabic ? 'rotate-180' : ''} />
            {isArabic ? 'العودة للرئيسية' : 'Back to Home'}
          </button>

          <LincPageHero
            title={isArabic ? 'أنشطة NextGen' : 'NextGen Activities'}
            description={isArabic
              ? 'ابدأ كمستخدم NextGen جديد أو شارك باستخدام معرّف تمت الموافقة عليه.'
              : 'Get started as a new NextGen user or participate with an approved identifier.'}
            eyebrow="LInC NextGen"
            icon={<Sparkles size={22} />}
          />

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
