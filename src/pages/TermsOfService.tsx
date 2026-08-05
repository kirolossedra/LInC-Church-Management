import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Gavel, ScrollText, AlertCircle, CheckCircle, Heart } from 'lucide-react';
import { useI18n } from '../i18n';
import LincPageHero from '../components/linc/LincPageHero';

export default function TermsOfService() {
  const { t, dir } = useI18n();

  useEffect(() => {
    document.title = `${t('tos.title')} | LINC`;
  }, [t]);

  return (
    <div className="legal-page min-h-screen" dir={dir}>
      <div className="mx-auto max-w-4xl space-y-8 py-2 md:py-6">
        <LincPageHero
          title={t('tos.title')}
          description={`${t('tos.updated')}: May 2026`}
          eyebrow="Community Covenant"
          icon={<Gavel size={22} />}
        />

        {/* Content */}
        <div className="space-y-10 rounded-[2rem] border border-[rgba(139,30,30,0.1)] bg-[#fffdf9]/92 p-[clamp(24px,5vw,52px)] shadow-[0_24px_70px_rgba(80,24,24,0.09)] backdrop-blur-xl">
          <section>
            <h2 className="text-xl font-bold text-[#8b1e1e] mb-4 flex items-center gap-2">
              <ScrollText size={20} />
              {t('tos.section1Title')}
            </h2>
            <p className="text-gray-600 leading-relaxed text-sm">
              {t('tos.section1Desc')}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#8b1e1e] mb-4 flex items-center gap-2">
              <Heart size={20} />
              {t('tos.section2Title')}
            </h2>
            <p className="text-gray-600 leading-relaxed text-sm">
              {t('tos.section2Desc')}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#8b1e1e] mb-4 flex items-center gap-2">
              <CheckCircle size={20} />
              {t('tos.section3Title')}
            </h2>
            <p className="text-gray-600 leading-relaxed text-sm">
              {t('tos.section3Desc')}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#8b1e1e] mb-4 flex items-center gap-2">
              <AlertCircle size={20} />
              {t('tos.section4Title')}
            </h2>
            <p className="text-gray-600 leading-relaxed text-sm">
              {t('tos.section4Desc')}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#8b1e1e] mb-4">{t('tos.section5Title')}</h2>
            <p className="text-gray-600 leading-relaxed text-sm">
              {t('tos.section5Desc')}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#8b1e1e] mb-4">{t('tos.section6Title')}</h2>
            <p className="text-gray-600 leading-relaxed text-sm">
              {t('tos.section6Desc')}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#8b1e1e] mb-4">{t('tos.section7Title')}</h2>
            <p className="text-gray-600 leading-relaxed text-sm">
              {t('tos.section7Desc')}
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
