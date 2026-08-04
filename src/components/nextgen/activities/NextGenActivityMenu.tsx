import { motion } from 'motion/react';
import { ChevronDown, ClipboardList, HelpCircle, ThumbsUp } from 'lucide-react';

export type NextGenActivityPanel = 'question' | 'peer-review' | 'survey' | null;

interface NextGenActivityMenuProps {
  activePanel: NextGenActivityPanel;
  isArabic: boolean;
  isSurveyCompleted: boolean;
  onSelect: (panel: Exclude<NextGenActivityPanel, null>) => void;
}

const options = [
  { id: 'question' as const, Icon: HelpCircle, titleEn: 'Add Question', titleAr: 'إضافة سؤال', descriptionEn: 'The submission is recorded to your ID.', descriptionAr: 'يُسجّل الإرسال على معرّفك.' },
  { id: 'peer-review' as const, Icon: ThumbsUp, titleEn: 'Peer Review', titleAr: 'مراجعة الزملاء', descriptionEn: 'One vote per identifier per question.', descriptionAr: 'تصويت واحد فقط لكل معرّف ولكل سؤال.' },
  { id: 'survey' as const, Icon: ClipboardList, titleEn: 'Session Feedback', titleAr: 'استبيان الجلسات', descriptionEn: 'All questions are required, with one submission per identifier.', descriptionAr: 'استبيان مطلوب الإجابة عن جميع أسئلته، مرة واحدة لكل معرّف.' },
];

export default function NextGenActivityMenu({ activePanel, isArabic, isSurveyCompleted, onSelect }: NextGenActivityMenuProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
      {options.map(({ id, Icon, titleEn, titleAr, descriptionEn, descriptionAr }) => {
        const isActive = activePanel === id;
        return (
          <motion.button key={id} type="button" onClick={() => onSelect(id)} whileTap={{ scale: 0.98 }} className={`text-left p-7 rounded-[28px] border-2 transition-all shadow-sm group ${isActive ? 'bg-[#8b1e1e] border-[#8b1e1e] text-white shadow-[0_14px_34px_rgba(139,30,30,0.22)]' : 'bg-white border-[rgba(139,30,30,0.12)] text-[#641414] hover:bg-[#f8eeee] hover:border-[#8b1e1e] hover:-translate-y-1 hover:shadow-[0_14px_34px_rgba(139,30,30,0.14)]'}`}>
            <div className="flex items-center justify-between gap-4"><div className="flex items-center gap-4"><div className={`w-14 h-14 grid place-items-center rounded-2xl transition-colors ${isActive ? 'bg-white/15 text-white' : 'bg-[#f8eeee] text-[#8b1e1e] group-hover:bg-[#8b1e1e] group-hover:text-white'}`}><Icon size={26} /></div><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-2xl font-bold">{isArabic ? titleAr : titleEn}</h2>{id === 'survey' && isSurveyCompleted && <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${isActive ? 'bg-white/15 text-white' : 'bg-green-100 text-green-800'}`}>{isArabic ? 'مكتمل' : 'Completed'}</span>}</div><p className={`text-sm mt-1 ${isActive ? 'text-white/80' : 'text-[#777]'}`}>{isArabic ? descriptionAr : descriptionEn}</p></div></div><ChevronDown size={22} className={`transition-transform ${isActive ? 'rotate-180' : ''}`} /></div>
          </motion.button>
        );
      })}
    </div>
  );
}
