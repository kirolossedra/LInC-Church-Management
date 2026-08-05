import { UserRound } from 'lucide-react';
import AddDevelopmentItemForm from './AddDevelopmentItemForm';
import DevelopmentItemSection from './DevelopmentItemSection';
import SelectedPersonHeader from './SelectedPersonHeader';
import type { PeopleNotesController } from './usePeopleNotes';

export default function SelectedPersonDetails({ controller }: { controller: PeopleNotesController }) {
  const { isArabic, selectedPerson, strengths, growthAreas } = controller;

  if (!selectedPerson) {
    return (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto mb-4">
                <UserRound size={28} className="text-gray-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">
                {isArabic ? 'اختر شخصاً للبدء' : 'Select a person to begin'}
              </h3>
              <p className="text-sm text-gray-500 mt-2">
                {isArabic
                  ? 'بعد اختيار الشخص ستظهر نقاط القوة ومجالات النمو والملاحظات.'
                  : 'After selecting a person, strengths, growth areas, and notes will appear here.'}
              </p>
            </div>
    );
  }

  return (
    <>
      <SelectedPersonHeader controller={controller} />
      <AddDevelopmentItemForm controller={controller} />
      <DevelopmentItemSection controller={controller} type="strength" items={strengths} />
      <DevelopmentItemSection controller={controller} type="growth" items={growthAreas} />
    </>
  );
}

