import { AlertTriangle, CalendarDays, Plus } from 'lucide-react';
import type { PeopleNotesController } from './usePeopleNotes';
import LincLogo from '../brand/LincLogo';

export default function AddDevelopmentItemForm({ controller }: { controller: PeopleNotesController }) {
  const { isArabic, saving, itemForm, setItemForm, actionsDisabled, handleAddItem } = controller;

  return (
              <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                <h3 className="text-xl font-bold text-[#8B1E1E] mb-5 flex items-center gap-2">
                  <Plus size={20} />
                  {isArabic ? 'إضافة نقطة جديدة' : 'Add New Item'}
                </h3>

                <form onSubmit={handleAddItem} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <button
                      type="button"
                      disabled={actionsDisabled}
                      onClick={() => setItemForm(prev => ({ ...prev, type: 'strength' }))}
                      className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border font-bold text-sm transition-colors disabled:opacity-50 ${
                        itemForm.type === 'strength'
                          ? 'bg-green-50 border-green-200 text-green-700'
                          : 'bg-white border-gray-200 text-gray-500 hover:bg-stone-50'
                      }`}
                    >
                      <LincLogo size={18} className="rounded-full" />
                      {isArabic ? 'نقطة قوة' : 'Strength'}
                    </button>

                    <button
                      type="button"
                      disabled={actionsDisabled}
                      onClick={() => setItemForm(prev => ({ ...prev, type: 'growth' }))}
                      className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border font-bold text-sm transition-colors disabled:opacity-50 ${
                        itemForm.type === 'growth'
                          ? 'bg-amber-50 border-amber-200 text-amber-700'
                          : 'bg-white border-gray-200 text-gray-500 hover:bg-stone-50'
                      }`}
                    >
                      <AlertTriangle size={16} />
                      {isArabic ? 'مجال نمو' : 'Growth Area'}
                    </button>
                  </div>

                  <input
                    type="text"
                    value={itemForm.title}
                    onChange={e => setItemForm(prev => ({ ...prev, title: e.target.value }))}
                    disabled={actionsDisabled}
                    placeholder={isArabic ? 'العنوان' : 'Title'}
                    className="w-full px-4 py-3 bg-stone-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#8B1E1E]/20 outline-none text-sm disabled:opacity-60"
                  />

                  <textarea
                    value={itemForm.description}
                    onChange={e => setItemForm(prev => ({ ...prev, description: e.target.value }))}
                    rows={4}
                    disabled={actionsDisabled}
                    placeholder={isArabic ? 'الوصف أو التفاصيل...' : 'Description or details...'}
                    className="w-full px-4 py-3 bg-stone-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#8B1E1E]/20 outline-none text-sm resize-none disabled:opacity-60"
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                        <CalendarDays size={13} />
                        {isArabic ? 'تاريخ الإضافة' : 'Date Added'}
                      </label>

                      <input
                        type="date"
                        value={itemForm.dateAdded}
                        onChange={e => setItemForm(prev => ({ ...prev, dateAdded: e.target.value }))}
                        disabled={actionsDisabled}
                        className="w-full px-4 py-3 bg-stone-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#8B1E1E]/20 outline-none text-sm disabled:opacity-60"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                        <CalendarDays size={13} />
                        {isArabic ? 'آخر تاريخ متابعة' : 'Latest Follow-up Date'}
                      </label>

                      <input
                        type="date"
                        value={itemForm.latestFollowUpDate}
                        onChange={e =>
                          setItemForm(prev => ({ ...prev, latestFollowUpDate: e.target.value }))
                        }
                        disabled={actionsDisabled}
                        className="w-full px-4 py-3 bg-stone-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#8B1E1E]/20 outline-none text-sm disabled:opacity-60"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={actionsDisabled}
                    className="w-full md:w-auto flex items-center justify-center gap-2 bg-[#8B1E1E] text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-[#8B1E1E]/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                  >
                    <Plus size={18} />
                    {saving
                      ? isArabic
                        ? 'جار الحفظ...'
                        : 'Saving...'
                      : itemForm.type === 'strength'
                        ? isArabic
                          ? 'إضافة نقطة قوة'
                          : 'Add Strength'
                        : isArabic
                          ? 'إضافة مجال نمو'
                          : 'Add Growth Area'}
                  </button>
                </form>
              </section>
  );
}
