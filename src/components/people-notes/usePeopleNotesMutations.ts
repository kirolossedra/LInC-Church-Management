import { useState, type FormEvent } from 'react';
import type { User } from 'firebase/auth';
import {
  createDevelopmentComment,
  createDevelopmentItem,
  createPerson,
  deleteDevelopmentComment,
  deleteDevelopmentItem,
  deletePerson,
  updateDevelopmentFollowUpDate,
  type DevelopmentComment,
  type DevelopmentItem,
  type DevelopmentType,
  type PersonRecord,
} from '../../services/peopleNotes';
import { getErrorMessage, todayDateString } from './peopleNotes.utils';
import type { PeopleNotesData } from './usePeopleNotesData';

export default function usePeopleNotesMutations({
  firebaseUser,
  hasPastorAccess,
  isArabic,
  data,
}: {
  firebaseUser: User | null | undefined;
  hasPastorAccess: boolean;
  isArabic: boolean;
  data: PeopleNotesData;
}) {
  const {
    selectedPerson,
    loadPeople,
    setSelectedPersonId,
    showSuccess,
    showError,
    clearMessages,
  } = data;
  const [saving, setSaving] = useState(false);
  const [personForm, setPersonForm] = useState({ fullName: '', contact: '' });
  const [itemForm, setItemForm] = useState({
    type: 'strength' as DevelopmentType,
    title: '',
    description: '',
    dateAdded: todayDateString(),
    latestFollowUpDate: '',
  });
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [followUpInputs, setFollowUpInputs] = useState<Record<string, string>>({});
  const actionsDisabled = saving || !hasPastorAccess;

  const handleAddPerson = async (event: FormEvent) => {
    event.preventDefault();
    clearMessages();

    const fullName = personForm.fullName.trim();

    if (!fullName) {
      showError(isArabic ? 'يرجى إدخال اسم الشخص.' : 'Please enter the person name.');
      return;
    }

    setSaving(true);

    try {
      if (!firebaseUser) {
        throw new Error('Firebase login is required.');
      }

      const newPersonId = await createPerson(firebaseUser, {
        fullName,
        contact: personForm.contact.trim(),
      });

      await loadPeople();
      setSelectedPersonId(newPersonId);
      setPersonForm({ fullName: '', contact: '' });
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

  const handleAddItem = async (event: FormEvent) => {
    event.preventDefault();
    clearMessages();

    if (!selectedPerson) {
      showError(isArabic ? 'يرجى اختيار شخص أولاً.' : 'Please select a person first.');
      return;
    }

    const title = itemForm.title.trim();

    if (!title) {
      showError(isArabic ? 'يرجى إدخال عنوان.' : 'Please enter a title.');
      return;
    }

    setSaving(true);

    try {
      if (!firebaseUser) {
        throw new Error('Firebase login is required.');
      }

      await createDevelopmentItem(
        firebaseUser,
        selectedPerson.id,
        {
        type: itemForm.type,
        title,
        description: itemForm.description.trim(),
        dateAdded: itemForm.dateAdded || todayDateString(),
        latestFollowUpDate: itemForm.latestFollowUpDate || '',
        },
      );

      await loadPeople();

      setItemForm({
        type: itemForm.type,
        title: '',
        description: '',
        dateAdded: todayDateString(),
        latestFollowUpDate: '',
      });

      showSuccess(
        itemForm.type === 'strength'
          ? isArabic
            ? 'تمت إضافة نقطة القوة بنجاح.'
            : 'Strength added successfully.'
          : isArabic
            ? 'تمت إضافة مجال النمو بنجاح.'
            : 'Growth area added successfully.'
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

    if (!selectedPerson) return;

    const text = (commentInputs[item.id] || '').trim();

    if (!text) {
      showError(isArabic ? 'يرجى كتابة الملاحظة أولاً.' : 'Please write a note first.');
      return;
    }

    setSaving(true);

    try {
      if (!firebaseUser) {
        throw new Error('Firebase login is required.');
      }

      await createDevelopmentComment(
        firebaseUser,
        selectedPerson.id,
        item.id,
        text,
      );

      await loadPeople();

      setCommentInputs(prev => ({ ...prev, [item.id]: '' }));
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

    if (!selectedPerson) return;

    const followUpDate = followUpInputs[item.id] || item.latestFollowUpDate || '';

    if (!followUpDate) {
      showError(isArabic ? 'يرجى اختيار تاريخ المتابعة.' : 'Please select a follow-up date.');
      return;
    }

    setSaving(true);

    try {
      if (!firebaseUser) {
        throw new Error('Firebase login is required.');
      }

      await updateDevelopmentFollowUpDate(
        firebaseUser,
        selectedPerson.id,
        item.id,
        followUpDate,
      );

      await loadPeople();

      setFollowUpInputs(prev => ({ ...prev, [item.id]: followUpDate }));
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

    if (
      !confirm(
        isArabic
          ? `هل تريد حذف سجل ${person.fullName} بالكامل؟`
          : `Delete the full record for ${person.fullName}?`
      )
    ) {
      return;
    }

    setSaving(true);

    try {
      if (!firebaseUser) {
        throw new Error('Firebase login is required.');
      }

      await deletePerson(firebaseUser, person.id);
      await loadPeople();
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

    if (!selectedPerson) return;

    if (
      !confirm(
        isArabic ? 'هل تريد حذف هذا العنصر وكل ملاحظاته؟' : 'Delete this item and all of its notes?'
      )
    ) {
      return;
    }

    setSaving(true);

    try {
      if (!firebaseUser) {
        throw new Error('Firebase login is required.');
      }

      await deleteDevelopmentItem(
        firebaseUser,
        selectedPerson.id,
        item.id,
      );
      await loadPeople();

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

    if (!selectedPerson) return;

    if (!confirm(isArabic ? 'هل تريد حذف هذه الملاحظة؟' : 'Delete this note?')) return;

    setSaving(true);

    try {
      if (!firebaseUser) {
        throw new Error('Firebase login is required.');
      }

      await deleteDevelopmentComment(
        firebaseUser,
        selectedPerson.id,
        item.id,
        comment.id,
      );
      await loadPeople();

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

  return {
    saving,
    personForm,
    setPersonForm,
    itemForm,
    setItemForm,
    commentInputs,
    setCommentInputs,
    followUpInputs,
    setFollowUpInputs,
    actionsDisabled,
    handleAddPerson,
    handleAddItem,
    handleAddComment,
    handleUpdateFollowUpDate,
    handleDeletePerson,
    handleDeleteItem,
    handleDeleteComment,
  };
}

