import { Fragment } from 'react';
import { motion } from 'motion/react';
import type { AssessmentController } from './useAssessmentForm';
import { calculationSourceSection, scoreMap } from './assessment.calculations';
import {
  fieldLabel,
  getSection,
  groupTitle,
  resultCardLabel,
  resultTitle,
  translateOrText,
} from './assessment.forms';

export default function AssessmentResults({ controller }: { controller: AssessmentController }) {
  const { t, dir, langCode, selectedForm, result, resetForRetake } = controller;
  if (!selectedForm || !result) return null;

  return (
    <div className="max-w-[1120px] mx-auto px-[18px]" dir={dir} style={{ fontFamily: 'Arial, sans-serif' }}>
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white border-2 border-[#8b1e1e] rounded-[22px] p-[clamp(18px,4vw,28px)] shadow-[0_8px_28px_rgba(0,0,0,0.08)]"
      >
        <h2 className="text-[clamp(1.22rem,4vw,1.55rem)] text-[#8b1e1e] mb-5">
          {resultTitle(selectedForm, t, langCode)}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-[14px] mb-[18px]">
          {(selectedForm.results?.display?.cards || []).map(card => (
            <div key={card.id} className="bg-[#f8eeee] border border-[rgba(139,30,30,0.12)] rounded-[18px] p-4">
              <span className="block text-[#666] font-bold mb-1 text-sm">
                {resultCardLabel(t, card, langCode)}
              </span>
              <strong className="text-[#641414] text-[1.05rem]">{result.cardValues[card.id]}</strong>
            </div>
          ))}
        </div>

        <div
          className="bg-[#fffafa] border-l-4 border-[#8b1e1e] rounded-[14px] p-[14px_16px] font-bold italic mb-[18px]"
          style={{
            [dir === 'rtl' ? 'borderRight' : 'borderLeft']: '4px solid #8b1e1e',
            [dir === 'rtl' ? 'borderLeft' : 'borderRight']: 'none',
          }}
        >
          {result.summary}
        </div>

        {(selectedForm.results?.display?.scoreBlocks || []).map(block => {
          const source = scoreMap(result.calculations[block.sourceCalculation]);
          const sourceSection = calculationSourceSection(selectedForm, block.sourceCalculation);
          const section = getSection(selectedForm, sourceSection);
          const items = section?.groups?.length
            ? (section.groups || []).map(group => ({
                id: group.id,
                label: groupTitle(t, group, langCode),
                score: source[group.id] || 0,
              }))
            : (section?.fields || []).map(field => ({
                id: field.id,
                label: fieldLabel(t, field, langCode),
                score: source[field.id] || 0,
              }));

          return (
            <Fragment key={block.id}>
              <h3 className="text-[1.05rem] text-[#641414] font-bold mb-[14px] mt-[26px]">
                {translateOrText(t, block.titleKey, block.title, langCode, block.id)}
              </h3>
              <div className="grid gap-[10px] mb-[18px]">
                {items.map(item => (
                  <div
                    key={item.id}
                    className="flex justify-between items-center gap-[14px] bg-[#fafafa] border border-[#ddd] rounded-[14px] p-3"
                  >
                    <span className="text-[#242424]">{item.label}</span>
                    <strong className="text-[#641414] whitespace-nowrap">
                      {item.score} / {block.maxScore || 5}
                    </strong>
                  </div>
                ))}
              </div>
            </Fragment>
          );
        })}
      </motion.div>

      <button
        onClick={resetForRetake}
        className="w-full min-h-[56px] mt-6 border-none bg-[#8b1e1e] text-white py-4 rounded-[18px] font-bold cursor-pointer shadow-[0_8px_18px_rgba(139,30,30,0.24)] transition-transform hover:-translate-y-[1px] text-[1.08rem]"
      >
        {t('assessment.takeAgain')}
      </button>
    </div>
  );
}
