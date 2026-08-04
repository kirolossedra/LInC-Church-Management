import type { AssessmentController } from './useAssessmentForm';
import type { FieldDef, SectionDef } from './assessment.types';
import { fieldLabel, groupTitle, localText, ratingRange, sectionTitle } from './assessment.forms';

export default function AssessmentQuestionnaire({ controller }: { controller: AssessmentController }) {
  const { t, langCode, selectedForm, answers, setAnswer } = controller;
  if (!selectedForm) return null;

  const renderField = (field: FieldDef, section?: SectionDef) => {
    if (!selectedForm) return null;

    const baseClass = 'w-full px-[14px] py-[13px] border border-[#ddd] rounded-[14px] text-[1rem] bg-white text-[#242424] outline-none transition-[border-color,box-shadow,transform] duration-200 focus:border-[#8b1e1e] focus:shadow-[0_0_0_4px_rgba(139,30,30,0.12)]';

    if (field.type === 'textarea') {
      return (
        <textarea
          required={Boolean(field.required)}
          className={baseClass}
          style={{ minHeight: '112px', resize: 'vertical' }}
          value={String(answers[field.id] || '')}
          onChange={event => setAnswer(field.id, event.target.value)}
        />
      );
    }

    if (field.type === 'rating') {
      return (
        <div className="grid grid-cols-5 gap-[10px]">
          {ratingRange(selectedForm, section).map(num => (
            <label
              key={num}
              className={`relative grid place-items-center min-h-[48px] border rounded-[14px] cursor-pointer transition-[transform,border-color,background,box-shadow] duration-150 select-none hover:-translate-y-[1px] hover:border-[rgba(139,30,30,0.45)] hover:shadow-[0_4px_12px_rgba(139,30,30,0.12)] ${
                answers[field.id] === num
                  ? 'bg-[#8b1e1e] border-[#8b1e1e] shadow-[0_8px_18px_rgba(139,30,30,0.22)]'
                  : 'bg-[#fafafa] border-[#ddd]'
              }`}
            >
              <input
                type="radio"
                name={`${selectedForm.id}-${field.id}`}
                value={num}
                className="absolute opacity-0 pointer-events-none"
                checked={answers[field.id] === num}
                onChange={() => setAnswer(field.id, num)}
              />
              <span className={`grid place-items-center w-full h-full font-bold ${answers[field.id] === num ? 'text-white' : 'text-[#444]'}`}>
                {num}
              </span>
            </label>
          ))}
        </div>
      );
    }

    return (
      <input
        required={Boolean(field.required)}
        type={field.type === 'email' || field.type === 'number' || field.type === 'date' ? field.type : 'text'}
        className={baseClass}
        value={String(answers[field.id] || '')}
        onChange={event => setAnswer(field.id, event.target.value)}
      />
    );
  };

  const renderSection = (section: SectionDef) => {
    if (!selectedForm) return null;

    return (
      <section key={section.id} className="bg-[rgba(255,255,255,0.96)] border border-[rgba(139,30,30,0.1)] rounded-[22px] p-[clamp(18px,4vw,28px)] shadow-[0_8px_28px_rgba(0,0,0,0.08)]">
        <h2 className="m-0 mb-5 text-[#8b1e1e] text-[clamp(1.22rem,4vw,1.55rem)] font-bold border-b-2 border-[#f8eeee] pb-[10px]">
          {sectionTitle(t, section, langCode)}
        </h2>

        {section.guide && (
          <div className="bg-[#f8eeee] p-3 rounded-[14px] font-bold text-[#641414] mb-3">
            {localText(section.guide, langCode)}
          </div>
        )}

        {(section.guideKeys || []).map(key => (
          <div key={key} className="bg-[#f8eeee] p-3 rounded-[14px] font-bold text-[#641414] mb-3">
            {t(key)}
          </div>
        ))}

        {section.type === 'groupedRating' ? (
          (section.groups || []).map(group => (
            <div key={group.id} className="mt-[18px]">
              <h3 className="text-[#641414] mb-[14px] mt-[26px] text-[clamp(1.05rem,3.5vw,1.28rem)] font-bold">
                {groupTitle(t, group, langCode)}
              </h3>

              {(group.fields || []).map(field => (
                <div key={field.id} className="border border-[#ddd] p-4 rounded-[18px] mb-[14px] bg-[linear-gradient(180deg,#fff,#fffafa)]">
                  <p className="font-bold m-0 mb-[14px] text-[#333]">
                    {field.id}. {fieldLabel(t, field, langCode)}
                  </p>
                  {renderField(field, section)}
                </div>
              ))}
            </div>
          ))
        ) : (
          <div className={section.layout === 'twoColumns' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-[22px]'}>
            {(section.fields || []).map(field => (
              <div
                key={field.id}
                className={section.type === 'ratingList'
                  ? 'border border-[#ddd] p-4 rounded-[18px] mb-[14px] bg-[linear-gradient(180deg,#fff,#fffafa)]'
                  : 'mb-[18px]'}
              >
                <label className="block font-bold mb-[7px] text-[#333]">
                  {section.type === 'ratingList' ? `${field.id}. ` : ''}
                  {fieldLabel(t, field, langCode)}
                  {field.required && <span className="text-[#8b1e1e]"> *</span>}
                </label>
                {renderField(field, section)}
              </div>
            ))}
          </div>
        )}
      </section>
    );
  };


  return <>{selectedForm.sections.map(renderSection)}</>;
}

