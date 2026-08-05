import { motion } from 'motion/react';
import { BookOpen, Calendar as CalendarIcon, Users, Mail, Shield, Globe, AlertCircle, ChevronRight } from 'lucide-react';
import { useI18n } from '../i18n';
import { useEffect } from 'react';
import LincPageHero from '../components/linc/LincPageHero';

export default function GuidePage() {
  const { t, dir } = useI18n();

  useEffect(() => {
    document.title = `${t('guide.title')} | LINC`;
  }, [t]);

  const sections = [
    {
      icon: <Shield size={24} />,
      title: t('guide.authTitle'),
      desc: t('guide.authDesc'),
      details: [t('guide.authDetail1'), t('guide.authDetail2')],
    },
    {
      icon: <Users size={24} />,
      title: t('guide.assessmentTitle'),
      desc: t('guide.assessmentDesc'),
      details: [t('guide.assessmentDetail1'), t('guide.assessmentDetail2'), t('guide.assessmentDetail3')],
    },
    {
      icon: <CalendarIcon size={24} />,
      title: t('guide.calendarTitle'),
      desc: t('guide.calendarDesc'),
      details: [t('guide.calendarDetail1'), t('guide.calendarDetail2'), t('guide.calendarDetail3')],
    },
    {
      icon: <Mail size={24} />,
      title: t('guide.requestsTitle'),
      desc: t('guide.requestsDesc'),
      details: [t('guide.requestsDetail1'), t('guide.requestsDetail2'), t('guide.requestsDetail3'), t('guide.requestsDetail4')],
    },
    {
      icon: <Globe size={24} />,
      title: t('guide.langTitle'),
      desc: t('guide.langDesc'),
      details: [t('guide.langDetail1'), t('guide.langDetail2')],
    },
  ];

  return (
    <div data-tutorial-id="guide-page" className="mx-auto max-w-5xl space-y-8 py-2 md:py-6" dir={dir}>
      <LincPageHero
        title={t('guide.title')}
        description={t('guide.subtitle')}
        eyebrow="Pastor workspace"
        icon={<BookOpen size={22} />}
      />

      <div className="grid gap-5 md:grid-cols-2">
        {sections.map((section, i) => (
          <motion.div
            key={i}
            data-tutorial-id={`guide-section-${i + 1}`}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="group relative overflow-hidden rounded-[1.8rem] border border-[#681919]/10 bg-[#fffdf9]/90 p-7 shadow-[0_18px_50px_rgba(80,24,24,0.07)] backdrop-blur-xl transition-transform duration-500 hover:-translate-y-1"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-[#681919] text-white shadow-[0_10px_24px_rgba(104,25,25,0.2)]">
                {section.icon}
              </div>
              <div className="flex-1">
                <h2 className="mb-2 font-serif text-2xl font-semibold text-[#2a1715]">{section.title}</h2>
                <p className="mb-4 text-sm leading-relaxed text-stone-600">{section.desc}</p>
                <ul className="space-y-2">
                  {section.details.map((detail, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm leading-relaxed text-stone-500">
                      <ChevronRight size={16} className="mt-0.5 flex-shrink-0 text-[#8b1e1e]" />
                      {detail}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="rounded-[1.8rem] border border-[#8b1e1e]/15 bg-[#8b1e1e] p-7 text-white shadow-[0_20px_55px_rgba(104,25,25,0.18)]"
      >
        <div className="flex items-start gap-3">
          <AlertCircle size={20} className="mt-1 flex-shrink-0 text-[#f2a900]" />
          <div>
            <h3 className="mb-1 font-serif text-2xl font-semibold text-white">{t('guide.supportTitle')}</h3>
            <p className="text-sm text-stone-200">{t('guide.supportDesc')}</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
