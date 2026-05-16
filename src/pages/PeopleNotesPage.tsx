import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookOpenText,
  CalendarDays,
  CheckCircle,
  MessageSquareText,
  Plus,
  Search,
  Sparkles,
  Trash2,
  UserRound,
  UsersRound,
  XCircle,
} from 'lucide-react';
import { ref, onValue, push, update, remove } from 'firebase/database';
import { database } from '../firebase';
import PageTitle from '../components/PageTitle';
import { useI18n } from '../i18n';

type DevelopmentType = 'strength' | 'growth';
interface DevelopmentComment {
  id: string;
  text: string;
  createdAt: number;
  createdBy: string;
}

interface DevelopmentItem {
  id: string;
  type: DevelopmentType;
  title: string;
  description: string;
  dateAdded: string;
  latestFollowUpDate: string;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  comments: DevelopmentComment[];
}

interface PersonRecord {
  id: string;
  fullName: string;
  contact: string;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  items: DevelopmentItem[];
}

interface PersonForm {
  fullName: string;
  contact: string;
}

interface ItemForm {
  type: DevelopmentType;
  title: string;
  description: string;
  dateAdded: string;
  latestFollowUpDate: string;
}



function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}


function formatDateLabel(dateValue: string, isArabic: boolean): string {
  if (!dateValue) return isArabic ? 'غير محدد' : 'Not set';

  try {
    return new Intl.DateTimeFormat(isArabic ? 'ar' : 'en', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(`${dateValue}T00:00:00`));
  } catch {
    return dateValue;
  }
}

function formatDateTimeLabel(timestamp: number, isArabic: boolean): string {
  if (!timestamp) return isArabic ? 'غير محدد' : 'Not set';

  try {
    return new Intl.DateTimeFormat(isArabic ? 'ar' : 'en', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(timestamp));
  } catch {
    return String(timestamp);
  }
}

function normalizePeopleSnapshot(data: any): PersonRecord[] {
  if (!data) return [];

  return Object.entries(data)
    .map(([personId, personValue]: [string, any]) => {
      const rawItems = personValue.items || {};

      const items: DevelopmentItem[] = Object.entries(rawItems)
        .map(([itemId, itemValue]: [string, any]) => {
          const rawComments = itemValue.comments || {};

          const comments: DevelopmentComment[] = Object.entries(rawComments)
            .map(([commentId, commentValue]: [string, any]) => ({
              id: commentId,
              text: commentValue.text || '',
              createdAt: commentValue.createdAt || 0,
              createdBy: commentValue.createdBy || '',
            }))
            .sort((a, b) => b.createdAt - a.createdAt);

          return {
            id: itemId,
            type: itemValue.type === 'growth' ? 'growth' : 'strength',
            title: itemValue.title || '',
            description: itemValue.description || '',
            dateAdded: itemValue.dateAdded || '',
            latestFollowUpDate: itemValue.latestFollowUpDate || '',
            createdAt: itemValue.createdAt || 0,
            updatedAt: itemValue.updatedAt || 0,
            createdBy: itemValue.createdBy || '',
            comments,
          };
        })
        .sort((a, b) => b.updatedAt - a.updatedAt);

      return {
        id: personId,
        fullName: personValue.fullName || '',
        contact: personValue.contact || '',
        createdAt: personValue.createdAt || 0,
        updatedAt: personValue.updatedAt || 0,
        createdBy: personValue.createdBy || '',
        items,
      };
    })
    .sort((a, b) => a.fullName.localeCompare(b.fullName));
}

export default function PeopleNotesPage() {
  const { dir, locale } = useI18n();
  const isArabic = locale === 'ar';

  const createdByLabel = 'peopleNotesPage';



  const [people, setPeople] = useState<PersonRecord[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState('');
  const [searchText, setSearchText] = useState('');
  const [loadingPeople, setLoadingPeople] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState('');
  const [pageSuccess, setPageSuccess] = useState('');

  const [personForm, setPersonForm] = useState<PersonForm>({
    fullName: '',
    contact: '',
  });

  const [itemForm, setItemForm] = useState<ItemForm>({
    type: 'strength',
    title: '',
    description: '',
    dateAdded: todayDateString(),
    latestFollowUpDate: '',
  });

  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [followUpInputs, setFollowUpInputs] = useState<Record<string, string>>({});

  
  const actionsDisabled = saving;

  const clearMessages = () => {
    setPageError('');
    setPageSuccess('');
  };

  const showSuccess = (message: string) => {
    setPageError('');
    setPageSuccess(message);
  };

  const showError = (message: string) => {
    setPageSuccess('');
    setPageError(message);
  };

  const requirePastorAccess = (): boolean => true;

  useEffect(() => {
    const peopleRef = ref(database, 'peopleNotes/');

    const unsubscribe = onValue(
      peopleRef,
      snapshot => {
        const parsedPeople = normalizePeopleSnapshot(snapshot.val());

        setPeople(parsedPeople);

        setSelectedPersonId(previousSelectedId => {
          if (!previousSelectedId && parsedPeople.length > 0) {
            return parsedPeople[0].id;
          }

          if (previousSelectedId && parsedPeople.length > 0 && !parsedPeople.some(person => person.id === previousSelectedId)) {
            return parsedPeople[0].id;
          }

          if (parsedPeople.length === 0) {
            return '';
          }

          return previousSelectedId;
        });

        setLoadingPeople(false);
      },
      error => {
        console.error(error);
        setLoadingPeople(false);
        showError(
          isArabic
            ? `فشل تحميل سجلات الأشخاص: ${getErrorMessage(error)}`
            : `Failed to load people records: ${getErrorMessage(error)}`
        );
      }
    );

    return () => unsubscribe();
  }, [isArabic]);

  const filteredPeople = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    if (!query) return people;

    return people.filter(person => {
      return (
        person.fullName.toLowerCase().includes(query) ||
        person.contact.toLowerCase().includes(query)
      );
    });
  }, [people, searchText]);

  const selectedPerson = useMemo(() => {
    return people.find(person => person.id === selectedPersonId) || null;
  }, [people, selectedPersonId]);

  const strengths = useMemo(() => {
    return selectedPerson?.items.filter(item => item.type === 'strength') || [];
  }, [selectedPerson]);

  const growthAreas = useMemo(() => {
    return selectedPerson?.items.filter(item => item.type === 'growth') || [];
  }, [selectedPerson]);

  const resetPersonForm = () => {
    setPersonForm({
      fullName: '',
      contact: '',
    });
  };

  const resetItemForm = (type: DevelopmentType = itemForm.type) => {
    setItemForm({
      type,
      title: '',
      description: '',
      dateAdded: todayDateString(),
      latestFollowUpDate: '',
    });
  };

  const handleAddPerson = async (event: React.FormEvent) => {

   event.preventDefault();
  console.log('handleAddPerson fired'); // ADD THIS
  clearMessages();
    
    if (!requirePastorAccess()) return;

    const fullName = personForm.fullName.trim();
    const contact = personForm.contact.trim();

    if (!fullName) {
      showError(isArabic ? 'يرجى إدخال اسم الشخص.' : 'Please enter the person name.');
      return;
    }

    setSaving(true);

    try {
      const now = Date.now();

      const newPersonRef = await push(ref(database, 'peopleNotes/'), {
        fullName,
        contact,
        createdAt: now,
        updatedAt: now,
        createdBy: createdByLabel,
      });

      setSelectedPersonId(newPersonRef.key || '');
      resetPersonForm();

      showSuccess(isArabic ? 'تمت إضافة الشخص بنجاح.' : 'Person added successfully.');
    } catch (error) {
      console.error(error);
      showError(
        isArabic
          ? `فشل حفظ الشخص: ${getErrorMessage(error)}`
          : `Failed to save person: ${getErrorMessage(error)}`
      );
    } finally {
      setSaving(false);
    }
  };

  const handleAddItem = async (event: React.FormEvent) => {
    event.preventDefault();
    clearMessages();

    if (!requirePastorAccess()) return;

    if (!selectedPerson) {
      showError(isArabic ? 'يرجى اختيار شخص أولاً.' : 'Please select a person first.');
      return;
    }

    const title = itemForm.title.trim();
    const description = itemForm.description.trim();

    if (!title) {
      showError(isArabic ? 'يرجى إدخال عنوان.' : 'Please enter a title.');
      return;
    }

    setSaving(true);

    try {
      const now = Date.now();

      await push(ref(database, `peopleNotes/${selectedPerson.id}/items/`), {
        type: itemForm.type,
        title,
        description,
        dateAdded: itemForm.dateAdded || todayDateString(),
        latestFollowUpDate: itemForm.latestFollowUpDate || '',
        createdAt: now,
        updatedAt: now,
        createdBy: createdByLabel,
      });

      await update(ref(database, `peopleNotes/${selectedPerson.id}`), {
        updatedAt: now,
      });

      resetItemForm(itemForm.type);

      showSuccess(
        itemForm.type === 'strength'
          ? isArabic ? 'تمت إضافة نقطة القوة بنجاح.' : 'Strength added successfully.'
          : isArabic ? 'تمت إضافة مجال النمو بنجاح.' : 'Growth area added successfully.'
      );
    } catch (error) {
      console.error(error);
      showError(
        isArabic
          ? `فشل حفظ العنصر: ${getErrorMessage(error)}`
          : `Failed to save item: ${getErrorMessage(error)}`
      );
    } finally {
      setSaving(false);
    }
  };

  const handleAddComment = async (item: DevelopmentItem) => {
    clearMessages();

    if (!requirePastorAccess()) return;

    if (!selectedPerson) {
      showError(isArabic ? 'يرجى اختيار شخص أولاً.' : 'Please select a person first.');
      return;
    }

    const text = (commentInputs[item.id] || '').trim();

    if (!text) {
      showError(isArabic ? 'يرجى كتابة الملاحظة أولاً.' : 'Please write a note first.');
      return;
    }

    setSaving(true);

    try {
      const now = Date.now();

      await push(ref(database, `peopleNotes/${selectedPerson.id}/items/${item.id}/comments/`), {
        text,
        createdAt: now,
        createdBy: createdByLabel,
      });

      await update(ref(database, `peopleNotes/${selectedPerson.id}/items/${item.id}`), {
        updatedAt: now,
      });

      await update(ref(database, `peopleNotes/${selectedPerson.id}`), {
        updatedAt: now,
      });

      setCommentInputs(prev => ({
        ...prev,
        [item.id]: '',
      }));

      showSuccess(isArabic ? 'تمت إضافة الملاحظة بنجاح.' : 'Note added successfully.');
    } catch (error) {
      console.error(error);
      showError(
        isArabic
          ? `فشل حفظ الملاحظة: ${getErrorMessage(error)}`
          : `Failed to save note: ${getErrorMessage(error)}`
      );
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateFollowUpDate = async (item: DevelopmentItem) => {
    clearMessages();

    if (!requirePastorAccess()) return;

    if (!selectedPerson) {
      showError(isArabic ? 'يرجى اختيار شخص أولاً.' : 'Please select a person first.');
      return;
    }

    const followUpDate = followUpInputs[item.id] || item.latestFollowUpDate || '';

    if (!followUpDate) {
      showError(isArabic ? 'يرجى اختيار تاريخ المتابعة.' : 'Please select a follow-up date.');
      return;
    }

    setSaving(true);

    try {
      const now = Date.now();

      await update(ref(database, `peopleNotes/${selectedPerson.id}/items/${item.id}`), {
        latestFollowUpDate: followUpDate,
        updatedAt: now,
      });

      await update(ref(database, `peopleNotes/${selectedPerson.id}`), {
        updatedAt: now,
      });

      setFollowUpInputs(prev => ({
        ...prev,
        [item.id]: followUpDate,
      }));

      showSuccess(isArabic ? 'تم تحديث تاريخ المتابعة بنجاح.' : 'Follow-up date updated successfully.');
    } catch (error) {
      console.error(error);
      showError(
        isArabic
          ? `فشل تحديث تاريخ المتابعة: ${getErrorMessage(error)}`
          : `Failed to update follow-up date: ${getErrorMessage(error)}`
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePerson = async (person: PersonRecord) => {
    clearMessages();

    if (!requirePastorAccess()) return;

    const confirmed = confirm(
      isArabic
        ? `هل تريد حذف سجل ${person.fullName} بالكامل؟`
        : `Delete the full record for ${person.fullName}?`
    );

    if (!confirmed) return;

    setSaving(true);

    try {
      await remove(ref(database, `peopleNotes/${person.id}`));
      showSuccess(isArabic ? 'تم حذف السجل بنجاح.' : 'Record deleted successfully.');
    } catch (error) {
      console.error(error);
      showError(
        isArabic
          ? `فشل حذف الشخص: ${getErrorMessage(error)}`
          : `Failed to delete person: ${getErrorMessage(error)}`
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (item: DevelopmentItem) => {
    clearMessages();

    if (!requirePastorAccess()) return;

    if (!selectedPerson) {
      showError(isArabic ? 'يرجى اختيار شخص أولاً.' : 'Please select a person first.');
      return;
    }

    const confirmed = confirm(
      isArabic
        ? 'هل تريد حذف هذا العنصر وكل ملاحظاته؟'
        : 'Delete this item and all of its notes?'
    );

    if (!confirmed) return;

    setSaving(true);

    try {
      const now = Date.now();

      await remove(ref(database, `peopleNotes/${selectedPerson.id}/items/${item.id}`));

      await update(ref(database, `peopleNotes/${selectedPerson.id}`), {
        updatedAt: now,
      });

      showSuccess(isArabic ? 'تم حذف العنصر بنجاح.' : 'Item deleted successfully.');
    } catch (error) {
      console.error(error);
      showError(
        isArabic
          ? `فشل حذف العنصر: ${getErrorMessage(error)}`
          : `Failed to delete item: ${getErrorMessage(error)}`
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteComment = async (item: DevelopmentItem, comment: DevelopmentComment) => {
    clearMessages();

    if (!requirePastorAccess()) return;

    if (!selectedPerson) {
      showError(isArabic ? 'يرجى اختيار شخص أولاً.' : 'Please select a person first.');
      return;
    }

    const confirmed = confirm(
      isArabic
        ? 'هل تريد حذف هذه الملاحظة؟'
        : 'Delete this note?'
    );

    if (!confirmed) return;

    setSaving(true);

    try {
      const now = Date.now();

      await remove(ref(database, `peopleNotes/${selectedPerson.id}/items/${item.id}/comments/${comment.id}`));

      await update(ref(database, `peopleNotes/${selectedPerson.id}/items/${item.id}`), {
        updatedAt: now,
      });

      await update(ref(database, `peopleNotes/${selectedPerson.id}`), {
        updatedAt: now,
      });

      showSuccess(isArabic ? 'تم حذف الملاحظة بنجاح.' : 'Note deleted successfully.');
    } catch (error) {
      console.error(error);
      showError(
        isArabic
          ? `فشل حذف الملاحظة: ${getErrorMessage(error)}`
          : `Failed to delete note: ${getErrorMessage(error)}`
      );
    } finally {
      setSaving(false);
    }
  };

  const renderDevelopmentItem = (item: DevelopmentItem) => {
    const itemLabel = item.type === 'strength'
      ? isArabic ? 'نقطة قوة' : 'Strength'
      : isArabic ? 'مجال نمو' : 'Growth Area';

    return (
      <div key={item.id} className="rounded-2xl border border-gray-100 bg-stone-50 p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-white border border-gray-200 text-[11px] font-bold text-[#8B1E1E]">
                {itemLabel}
              </span>

              <span className="text-[11px] text-gray-400">
                {isArabic ? 'أضيف في' : 'Added'}: {formatDateLabel(item.dateAdded, isArabic)}
              </span>

              <span className="text-[11px] text-gray-400">
                {isArabic ? 'آخر متابعة' : 'Latest follow-up'}: {formatDateLabel(item.latestFollowUpDate, isArabic)}
              </span>
            </div>

            <h4 className="text-lg font-bold text-gray-900">{item.title}</h4>

            {item.description && (
              <p className="text-sm leading-6 text-gray-600 whitespace-pre-wrap">
                {item.description}
              </p>
            )}

            {item.createdBy && (
              <p className="text-[11px] text-gray-400">
                {isArabic ? 'أضيف بواسطة' : 'Added by'}: {item.createdBy}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => handleDeleteItem(item)}
            disabled={actionsDisabled}
            className="self-start p-2 rounded-xl text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
            title={isArabic ? 'حذف' : 'Delete'}
          >
            <Trash2 size={17} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end">
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 block">
              {isArabic ? 'تحديث آخر تاريخ متابعة' : 'Update latest follow-up date'}
            </label>

            <input
              type="date"
              value={followUpInputs[item.id] ?? item.latestFollowUpDate ?? ''}
              onChange={event =>
                setFollowUpInputs(prev => ({
                  ...prev,
                  [item.id]: event.target.value,
                }))
              }
              disabled={saving}
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#8B1E1E]/20 outline-none text-sm disabled:opacity-60"
            />
          </div>

          <button
            type="button"
            onClick={() => handleUpdateFollowUpDate(item)}
            disabled={actionsDisabled}
            className="px-5 py-3 bg-[#8B1E1E] text-white rounded-xl font-bold text-sm hover:bg-[#641414] transition-colors disabled:opacity-50"
          >
            {isArabic ? 'حفظ المتابعة' : 'Save Follow-up'}
          </button>
        </div>

        <div className="border-t border-gray-200 pt-4 space-y-3">
          <h5 className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <MessageSquareText size={16} className="text-[#8B1E1E]" />
            {isArabic ? 'الملاحظات' : 'Notes'}
          </h5>

          <div className="space-y-2">
            {item.comments.length === 0 ? (
              <div className="text-sm text-gray-400 bg-white border border-dashed border-gray-200 rounded-xl p-4">
                {isArabic ? 'لا توجد ملاحظات لهذا العنصر بعد.' : 'No notes for this item yet.'}
              </div>
            ) : (
              item.comments.map(comment => (
                <div key={comment.id} className="bg-white border border-gray-100 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-6">{comment.text}</p>

                      <p className="text-[11px] text-gray-400 mt-2">
                        {formatDateTimeLabel(comment.createdAt, isArabic)}
                        {comment.createdBy ? ` • ${comment.createdBy}` : ''}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteComment(item, comment)}
                      disabled={actionsDisabled}
                      className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
                      title={isArabic ? 'حذف الملاحظة' : 'Delete note'}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
            <textarea
              value={commentInputs[item.id] || ''}
              onChange={event =>
                setCommentInputs(prev => ({
                  ...prev,
                  [item.id]: event.target.value,
                }))
              }
              rows={3}
              disabled={saving}
              placeholder={isArabic ? 'أضف ملاحظة أو تعليق متابعة...' : 'Add a note or follow-up comment...'}
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#8B1E1E]/20 outline-none text-sm resize-none disabled:opacity-60"
            />

            <button
              type="button"
              onClick={() => handleAddComment(item)}
              disabled={actionsDisabled}
              className="self-end px-5 py-3 bg-white border border-[#8B1E1E] text-[#8B1E1E] rounded-xl font-bold text-sm hover:bg-[#f8eeee] transition-colors disabled:opacity-50"
            >
              {isArabic ? 'إضافة ملاحظة' : 'Add Note'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8" dir={dir} style={{ fontFamily: 'Arial, sans-serif' }}>
      <PageTitle
        title={isArabic ? 'ملاحظات نمو الأشخاص' : 'People Development Notes'}
        subtitle={
          isArabic
            ? 'تتبع نقاط القوة، مجالات النمو، المتابعات، والملاحظات الرعوية لكل شخص'
            : 'Track strengths, growth areas, follow-ups, and pastoral notes for each person'
        }
        icon={<BookOpenText size={22} />}
      />

      {pageError && (
        <section className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm font-bold flex items-start gap-2">
          <XCircle size={18} className="shrink-0 mt-0.5" />
          <span>{pageError}</span>
        </section>
      )}

      {pageSuccess && (
        <section className="bg-green-50 border border-green-200 text-green-700 rounded-2xl p-4 text-sm font-bold flex items-start gap-2">
          <CheckCircle size={18} className="shrink-0 mt-0.5" />
          <span>{pageSuccess}</span>
        </section>
      )}

      <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
        <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-6">
          <div>
            <h2 className="text-2xl font-bold text-[#1A1A1A]">
              {isArabic ? 'سجل الأشخاص' : 'People Records'}
            </h2>

            <p className="text-sm text-gray-500 mt-2 max-w-3xl">
              {isArabic
                ? 'أضف شخصاً، ثم سجّل نقاط القوة ومجالات النمو وتواريخ المتابعة والملاحظات المرتبطة بكل نقطة.'
                : 'Add a person, then record strengths, growth areas, follow-up dates, and notes attached to each item.'}
            </p>
          </div>

          <form onSubmit={handleAddPerson} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 w-full xl:max-w-3xl">
            <input
              type="text"
              value={personForm.fullName}
              onChange={event =>
                setPersonForm(prev => ({
                  ...prev,
                  fullName: event.target.value,
                }))
              }
              disabled={saving}
              placeholder={isArabic ? 'اسم الشخص' : 'Person name'}
              className="px-4 py-3 bg-stone-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#8B1E1E]/20 outline-none text-sm disabled:opacity-60"
            />

            <input
              type="text"
              value={personForm.contact}
              onChange={event =>
                setPersonForm(prev => ({
                  ...prev,
                  contact: event.target.value,
                }))
              }
              disabled={saving}
              placeholder={isArabic ? 'وسيلة تواصل اختيارية' : 'Optional contact'}
              className="px-4 py-3 bg-stone-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#8B1E1E]/20 outline-none text-sm disabled:opacity-60"
            />

            <button
              type="submit"
              disabled={actionsDisabled}
              className="flex items-center justify-center gap-2 bg-[#8B1E1E] text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-[#8B1E1E]/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              <Plus size={18} />
              <span>{saving ? (isArabic ? 'جار الحفظ...' : 'Saving...') : isArabic ? 'إضافة شخص' : 'Add Person'}</span>
            </button>
          </form>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 bg-stone-50 border border-gray-200 rounded-xl px-4 py-3 mb-5">
            <Search size={16} className="text-gray-400" />

            <input
              type="text"
              value={searchText}
              onChange={event => setSearchText(event.target.value)}
              placeholder={isArabic ? 'ابحث عن شخص...' : 'Search people...'}
              className="w-full bg-transparent outline-none text-sm"
            />
          </div>

          {loadingPeople ? (
            <div className="rounded-2xl border border-dashed border-gray-200 p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#8B1E1E] mx-auto mb-4"></div>

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
                {isArabic
                  ? 'أضف شخصاً جديداً أو غيّر البحث.'
                  : 'Add a new person or adjust the search.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPeople.map(person => {
                const isSelected = person.id === selectedPersonId;
                const strengthsCount = person.items.filter(item => item.type === 'strength').length;
                const growthCount = person.items.filter(item => item.type === 'growth').length;

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

                      <UsersRound size={18} className={isSelected ? 'text-[#8B1E1E]' : 'text-gray-400'} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-6">
          {!selectedPerson ? (
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
          ) : (
            <>
              <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{selectedPerson.fullName}</h2>

                    {selectedPerson.contact && (
                      <p className="text-sm text-gray-500 mt-1">{selectedPerson.contact}</p>
                    )}

                    <div className="flex flex-wrap gap-3 mt-3 text-xs text-gray-400">
                      <span>
                        {isArabic ? 'تم الإنشاء' : 'Created'}: {formatDateTimeLabel(selectedPerson.createdAt, isArabic)}
                      </span>

                      <span>
                        {isArabic ? 'آخر تحديث' : 'Updated'}: {formatDateTimeLabel(selectedPerson.updatedAt, isArabic)}
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

              <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                <h3 className="text-xl font-bold text-[#8B1E1E] mb-5 flex items-center gap-2">
                  <Plus size={20} />
                  {isArabic ? 'إضافة نقطة جديدة' : 'Add New Item'}
                </h3>

                <form onSubmit={handleAddItem} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() =>
                        setItemForm(prev => ({
                          ...prev,
                          type: 'strength',
                        }))
                      }
                      className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border font-bold text-sm transition-colors disabled:opacity-50 ${
                        itemForm.type === 'strength'
                          ? 'bg-green-50 border-green-200 text-green-700'
                          : 'bg-white border-gray-200 text-gray-500 hover:bg-stone-50'
                      }`}
                    >
                      <Sparkles size={16} />
                      {isArabic ? 'نقطة قوة' : 'Strength'}
                    </button>

                    <button
                      type="button"
                      disabled={saving}
                      onClick={() =>
                        setItemForm(prev => ({
                          ...prev,
                          type: 'growth',
                        }))
                      }
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
                    onChange={event =>
                      setItemForm(prev => ({
                        ...prev,
                        title: event.target.value,
                      }))
                    }
                    disabled={saving}
                    placeholder={isArabic ? 'العنوان' : 'Title'}
                    className="w-full px-4 py-3 bg-stone-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#8B1E1E]/20 outline-none text-sm disabled:opacity-60"
                  />

                  <textarea
                    value={itemForm.description}
                    onChange={event =>
                      setItemForm(prev => ({
                        ...prev,
                        description: event.target.value,
                      }))
                    }
                    rows={4}
                    disabled={saving}
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
                        onChange={event =>
                          setItemForm(prev => ({
                            ...prev,
                            dateAdded: event.target.value,
                          }))
                        }
                        disabled={saving}
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
                        onChange={event =>
                          setItemForm(prev => ({
                            ...prev,
                            latestFollowUpDate: event.target.value,
                          }))
                        }
                        disabled={saving}
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
                      ? isArabic ? 'جار الحفظ...' : 'Saving...'
                      : itemForm.type === 'strength'
                        ? isArabic ? 'إضافة نقطة قوة' : 'Add Strength'
                        : isArabic ? 'إضافة مجال نمو' : 'Add Growth Area'}
                  </button>
                </form>
              </section>

              <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
                <h3 className="text-xl font-bold text-[#8B1E1E] flex items-center gap-2">
                  <Sparkles size={20} />
                  {isArabic ? 'نقاط القوة' : 'Strengths'}
                </h3>

                {strengths.length === 0 ? (
                  <div className="text-sm text-gray-400 border border-dashed border-gray-200 rounded-2xl p-5">
                    {isArabic ? 'لا توجد نقاط قوة مسجلة بعد.' : 'No strengths recorded yet.'}
                  </div>
                ) : (
                  strengths.map(renderDevelopmentItem)
                )}
              </section>

              <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
                <h3 className="text-xl font-bold text-[#8B1E1E] flex items-center gap-2">
                  <AlertTriangle size={20} />
                  {isArabic ? 'مجالات النمو' : 'Growth Areas'}
                </h3>

                {growthAreas.length === 0 ? (
                  <div className="text-sm text-gray-400 border border-dashed border-gray-200 rounded-2xl p-5">
                    {isArabic ? 'لا توجد مجالات نمو مسجلة بعد.' : 'No growth areas recorded yet.'}
                  </div>
                ) : (
                  growthAreas.map(renderDevelopmentItem)
                )}
              </section>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
