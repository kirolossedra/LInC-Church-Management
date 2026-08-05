import { Search, UserRound, UsersRound } from 'lucide-react';
import type { PeopleNotesController } from './usePeopleNotes';

export default function PeopleList({ controller }: { controller: PeopleNotesController }) {
  const {
    isArabic,
    searchText,
    setSearchText,
    loadingPeople,
    filteredPeople,
    selectedPersonId,
    setSelectedPersonId,
  } = controller;

  return (
        <div className="lg:col-span-1 bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 bg-stone-50 border border-gray-200 rounded-xl px-4 py-3 mb-5">
            <Search size={16} className="text-gray-400" />
            <input
              type="text"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              placeholder={isArabic ? 'ابحث عن شخص...' : 'Search people...'}
              className="w-full bg-transparent outline-none text-sm"
            />
          </div>

          {loadingPeople ? (
            <div className="rounded-2xl border border-dashed border-gray-200 p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#8B1E1E] mx-auto mb-4" />
              <p className="text-sm text-gray-500">
                {isArabic ? 'جار تحميل السجلات...' : 'Loading records...'}
              </p>
            </div>
          ) : filteredPeople.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 p-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto mb-4">
                <UserRound size={24} className="text-gray-500" />
              </div>
              <h3 className="font-bold text-gray-800">
                {isArabic ? 'لا توجد سجلات' : 'No records found'}
              </h3>
              <p className="text-sm text-gray-500 mt-2">
                {isArabic ? 'أضف شخصاً جديداً أو غيّر البحث.' : 'Add a new person or adjust the search.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPeople.map(person => {
                const isSelected = person.id === selectedPersonId;
                const strengthsCount = person.items.filter(i => i.type === 'strength').length;
                const growthCount = person.items.filter(i => i.type === 'growth').length;

                return (
                  <button
                    key={person.id}
                    type="button"
                    onClick={() => setSelectedPersonId(person.id)}
                    className={`w-full text-left rounded-2xl border p-4 transition-all ${
                      isSelected
                        ? 'border-[#8B1E1E] bg-[#f8eeee]'
                        : 'border-gray-100 bg-stone-50 hover:bg-stone-100'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-gray-900">{person.fullName}</h3>

                        {person.contact && (
                          <p className="text-xs text-gray-500 mt-1">{person.contact}</p>
                        )}

                        <div className="flex flex-wrap gap-2 mt-3">
                          <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-white border border-gray-200 text-green-700">
                            {isArabic ? 'قوة' : 'Strengths'}: {strengthsCount}
                          </span>

                          <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-white border border-gray-200 text-amber-700">
                            {isArabic ? 'نمو' : 'Growth'}: {growthCount}
                          </span>
                        </div>
                      </div>

                      <UsersRound
                        size={18}
                        className={isSelected ? 'text-[#8B1E1E]' : 'text-gray-400'}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
  );
}

