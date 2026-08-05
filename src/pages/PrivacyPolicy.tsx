import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Eye, Database, Mail, Clock, FileText } from 'lucide-react';
import { useI18n } from '../i18n';
import LincPageHero from '../components/linc/LincPageHero';

export default function PrivacyPolicy() {
  const { t, dir } = useI18n();

  useEffect(() => {
    document.title = `${t('privacy.title')} | LINC`;
  }, [t]);

  return (
    <div className="legal-page min-h-screen" dir={dir}>
      <div className="mx-auto max-w-4xl space-y-8 py-2 md:py-6">
        <LincPageHero
          title={t('privacy.title')}
          description={`${t('privacy.updated')}: May 2026`}
          eyebrow="Trust & Stewardship"
          icon={<Shield size={22} />}
        />

        {/* Content */}
        <div className="space-y-10 rounded-[2rem] border border-[rgba(139,30,30,0.1)] bg-[#fffdf9]/92 p-[clamp(24px,5vw,52px)] shadow-[0_24px_70px_rgba(80,24,24,0.09)] backdrop-blur-xl">
          <section>
            <h2 className="text-xl font-bold text-[#8b1e1e] mb-4 flex items-center gap-2">
              <Eye size={20} />
              {t('privacy.section1Title')}
            </h2>
            <p className="text-gray-600 leading-relaxed text-sm">
              {t('privacy.section1Desc')}
            </p>
            <ul className="mt-3 space-y-2 text-sm text-gray-600 list-disc list-inside">
              <li>{t('privacy.section1Item1')}</li>
              <li>{t('privacy.section1Item2')}</li>
              <li>{t('privacy.section1Item3')}</li>
              <li>{t('privacy.section1Item4')}</li>
              <li>{t('privacy.section1Item5')}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#8b1e1e] mb-4 flex items-center gap-2">
              <Database size={20} />
              {t('privacy.section2Title')}
            </h2>
            <p className="text-gray-600 leading-relaxed text-sm">
              {t('privacy.section2Desc')}
            </p>
            <ul className="mt-3 space-y-2 text-sm text-gray-600 list-disc list-inside">
              <li>{t('privacy.section2Item1')}</li>
              <li>{t('privacy.section2Item2')}</li>
              <li>{t('privacy.section2Item3')}</li>
              <li>{t('privacy.section2Item4')}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#8b1e1e] mb-4 flex items-center gap-2">
              <Mail size={20} />
              {t('privacy.section3Title')}
            </h2>
            <p className="text-gray-600 leading-relaxed text-sm">
              {t('privacy.section3Desc')}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#8b1e1e] mb-4 flex items-center gap-2">
              <Clock size={20} />
              {t('privacy.section4Title')}
            </h2>
            <p className="text-gray-600 leading-relaxed text-sm">
              {t('privacy.section4Desc')}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#8b1e1e] mb-4 flex items-center gap-2">
              <FileText size={20} />
              {t('privacy.section5Title')}
            </h2>
            <p className="text-gray-600 leading-relaxed text-sm">
              {t('privacy.section5Desc')}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#8b1e1e] mb-4">{t('privacy.section6Title')}</h2>
            <p className="text-gray-600 leading-relaxed text-sm">
              {t('privacy.section6Desc')}
            </p>
          </section>
        </div>

        {/* Back Link */}
        <div className="text-center mt-8">
          <Link to="/" className="inline-flex rounded-2xl border border-[#681919]/15 bg-[#fffdf9] px-5 py-3 text-sm font-bold text-[#681919] shadow-sm transition-transform hover:-translate-y-0.5">
            &larr; {t('privacy.back')}
          </Link>
        </div>
      </div>
    </div>
  );
}
