import { AlertTriangle } from 'lucide-react';
import type { DevelopmentItem, DevelopmentType } from '../../services/peopleNotes';
import DevelopmentItemCard from './DevelopmentItemCard';
import type { PeopleNotesController } from './usePeopleNotes';
import LincLogo from '../brand/LincLogo';

export default function DevelopmentItemSection({
  controller,
  type,
  items,
}: {
  controller: PeopleNotesController;
  type: DevelopmentType;
  items: DevelopmentItem[];
}) {
  const isStrength = type === 'strength';
  const { isArabic } = controller;

  return (
    <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
      <h3 className="text-xl font-bold text-[#8B1E1E] flex items-center gap-2">
        {isStrength ? <LincLogo size={22} className="rounded-full" /> : <AlertTriangle size={20} />}
        {isStrength
          ? isArabic ? 'نقاط القوة' : 'Strengths'
          : isArabic ? 'مجالات النمو' : 'Growth Areas'}
      </h3>

      {items.length === 0 ? (
        <div className="text-sm text-gray-400 border border-dashed border-gray-200 rounded-2xl p-5">
          {isStrength
            ? isArabic ? 'لا توجد نقاط قوة مسجلة بعد.' : 'No strengths recorded yet.'
            : isArabic ? 'لا توجد مجالات نمو مسجلة بعد.' : 'No growth areas recorded yet.'}
        </div>
      ) : (
        items.map(item => (
          <DevelopmentItemCard key={item.id} controller={controller} item={item} />
        ))
      )}
    </section>
  );
}
