import { Trash2 } from 'lucide-react';
import { formatDateTimeLabel } from './peopleNotes.utils';
import type { PeopleNotesController } from './usePeopleNotes';

export default function SelectedPersonHeader({ controller }: { controller: PeopleNotesController }) {
  const { isArabic, selectedPerson, actionsDisabled, handleDeletePerson } = controller;
  if (!selectedPerson) return null;

  return (
              <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{selectedPerson.fullName}</h2>

                    {selectedPerson.contact && (
                      <p className="text-sm text-gray-500 mt-1">{selectedPerson.contact}</p>
                    )}

                    <div className="flex flex-wrap gap-3 mt-3 text-xs text-gray-400">
                      <span>
                        {isArabic ? 'تم الإنشاء' : 'Created'}:{' '}
                        {formatDateTimeLabel(selectedPerson.createdAt, isArabic)}
                      </span>
                      <span>
                        {isArabic ? 'آخر تحديث' : 'Updated'}:{' '}
                        {formatDateTimeLabel(selectedPerson.updatedAt, isArabic)}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeletePerson(selectedPerson)}
                    disabled={actionsDisabled}
                    className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 text-red-700 font-bold text-sm hover:bg-red-100 transition-colors disabled:opacity-50"
                  >
                    <Trash2 size={16} />
                    {isArabic ? 'حذف السجل' : 'Delete Record'}
                  </button>
                </div>
              </section>
  );
}

