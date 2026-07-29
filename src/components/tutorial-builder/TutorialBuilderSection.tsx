import { useMemo, useState } from 'react';
import {
  BookOpenCheck,
  ChevronDown,
  Copy,
  Edit3,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  Trash2,
} from 'lucide-react';

import type { Tutorial, TutorialDraft } from './tutorialBuilder.types';
import { useTutorials } from './TutorialContext';
import TutorialEditorModal from './TutorialEditorModal';

interface TutorialBuilderSectionProps {
  expanded: boolean;
  locale: 'en' | 'ar';
  onToggleExpanded: () => void;
}

export default function TutorialBuilderSection({
  expanded,
  locale,
  onToggleExpanded,
}: TutorialBuilderSectionProps) {
  const {
    tutorials,
    tutorialsLoading,
    saveTutorial,
    deleteTutorial,
    duplicateTutorial,
    toggleTutorialPublished,
    startTutorial,
  } = useTutorials();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTutorial, setEditingTutorial] = useState<Tutorial | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const categoryCount = useMemo(
    () => new Set(tutorials.map(tutorial => tutorial.category)).size,
    [tutorials],
  );

  const openCreate = () => {
    setEditingTutorial(null);
    setEditorOpen(true);
  };

  const openEdit = (tutorial: Tutorial) => {
    setEditingTutorial(tutorial);
    setEditorOpen(true);
  };

  const handleSave = async (draft: TutorialDraft) => {
    setSaving(true);

    try {
      await saveTutorial(draft);
      setEditorOpen(false);
      setEditingTutorial(null);
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : locale === 'ar'
            ? 'تعذر حفظ الدرس.'
            : 'Could not save the tutorial.',
      );
    } finally {
      setSaving(false);
    }
  };

  const handlePreviewDraft = async (draft: TutorialDraft) => {
    const now = Date.now();
    const previewTutorial: Tutorial = {
      id: draft.id || `tutorial-preview-${now}`,
      title: draft.title,
      description: draft.description,
      category: draft.category,
      audience: draft.audience,
      published: false,
      steps: draft.steps,
      createdBy: 'preview',
      createdAt: now,
      createdAtISO: new Date(now).toISOString(),
      updatedAt: now,
      updatedAtISO: new Date(now).toISOString(),
    };

    setEditorOpen(false);
    await startTutorial(previewTutorial, true);
  };

  const handleDelete = async (tutorial: Tutorial) => {
    const confirmed = window.confirm(
      locale === 'ar'
        ? `حذف الدرس "${tutorial.title}" نهائياً؟`
        : `Delete “${tutorial.title}” permanently?`,
    );

    if (!confirmed) {
      return;
    }

    setBusyId(tutorial.id);

    try {
      await deleteTutorial(tutorial);
    } catch (error) {
      console.error('Failed to delete tutorial:', error);
      window.alert(
        locale === 'ar'
          ? 'تعذر حذف الدرس.'
          : 'Could not delete the tutorial.',
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleDuplicate = async (tutorial: Tutorial) => {
    setBusyId(tutorial.id);

    try {
      await duplicateTutorial(tutorial);
    } catch (error) {
      console.error('Failed to duplicate tutorial:', error);
      window.alert(
        locale === 'ar'
          ? 'تعذر نسخ الدرس.'
          : 'Could not duplicate the tutorial.',
      );
    } finally {
      setBusyId(null);
    }
  };

  const handlePublishToggle = async (tutorial: Tutorial) => {
    setBusyId(tutorial.id);

    try {
      await toggleTutorialPublished(tutorial);
    } catch (error) {
      console.error('Failed to change tutorial publication:', error);
      window.alert(
        locale === 'ar'
          ? 'تعذر تغيير حالة النشر.'
          : 'Could not change the publication status.',
      );
    } finally {
      setBusyId(null);
    }
  };

  const handlePreview = async (tutorial: Tutorial) => {
    await startTutorial(tutorial, true);
  };

  return (
    <section
      data-tutorial-id="pastor-tutorial-builder-section"
      className="pastor-dashboard-card overflow-hidden rounded-3xl border border-violet-200 bg-white"
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
      style={{ fontFamily: 'Arial, sans-serif' }}
    >
      <button
        type="button"
        onClick={onToggleExpanded}
        className="flex w-full items-center gap-4 bg-gradient-to-r from-violet-800 to-fuchsia-800 px-6 py-5 text-left text-white"
      >
        <div className="rounded-2xl bg-white/15 p-3">
          <BookOpenCheck size={24} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold">
            {locale === 'ar' ? 'منشئ الدروس التفاعلية' : 'Tutorial Builder'}
          </h2>
          <p className="mt-1 text-sm text-white/75">
            {locale === 'ar'
              ? 'أنشئ شروحات تحاكي الضغط من دون تنفيذ عمليات حقيقية.'
              : 'Build guided explanations that simulate clicks without executing real operations.'}
          </p>
        </div>
        <div className="hidden items-center gap-2 sm:flex">
          <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold">
            {tutorials.length} {locale === 'ar' ? 'درس' : 'tutorials'}
          </span>
          <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold">
            {categoryCount} {locale === 'ar' ? 'تصنيف' : 'categories'}
          </span>
        </div>
        <ChevronDown
          size={20}
          className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {expanded && (
        <div className="space-y-5 p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-bold text-violet-900">
                {locale === 'ar' ? 'مكتبة الدروس' : 'Tutorial Library Management'}
              </h3>
              <p className="text-sm text-gray-500">
                {locale === 'ar'
                  ? 'إنشاء وقراءة وتعديل ونسخ ونشر وحذف الدروس وخطواتها.'
                  : 'Create, read, update, duplicate, publish, and delete tutorials and their steps.'}
              </p>
            </div>
            <button
              type="button"
              onClick={openCreate}
              data-tutorial-id="tutorial-builder-create"
              className="flex items-center justify-center gap-2 rounded-xl bg-violet-700 px-5 py-3 font-bold text-white hover:bg-violet-800"
            >
              <Plus size={18} />
              {locale === 'ar' ? 'إنشاء درس' : 'Create Tutorial'}
            </button>
          </div>

          {tutorialsLoading ? (
            <div className="flex items-center justify-center gap-3 rounded-3xl border border-violet-100 bg-violet-50 p-10 text-violet-700">
              <Loader2 className="animate-spin" size={22} />
              {locale === 'ar' ? 'جارٍ تحميل الدروس...' : 'Loading tutorials...'}
            </div>
          ) : tutorials.length === 0 ? (
            <div className="rounded-3xl border-2 border-dashed border-violet-200 bg-violet-50/50 p-10 text-center">
              <BookOpenCheck size={36} className="mx-auto text-violet-400" />
              <p className="mt-3 font-bold text-violet-900">
                {locale === 'ar' ? 'لم يتم إنشاء دروس بعد.' : 'No tutorials have been created yet.'}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {locale === 'ar'
                  ? 'أنشئ درساً ثم اختر عناصر الشاشة خطوة بخطوة.'
                  : 'Create one, then select screen elements step by step.'}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {tutorials.map(tutorial => {
                const busy = busyId === tutorial.id;

                return (
                  <article
                    key={tutorial.id}
                    className="rounded-3xl border border-violet-100 bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-700">
                            {tutorial.category}
                          </span>
                          <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-bold text-gray-600">
                            {tutorial.audience}
                          </span>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${
                              tutorial.published
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {tutorial.published
                              ? locale === 'ar' ? 'منشور' : 'Published'
                              : locale === 'ar' ? 'مسودة' : 'Draft'}
                          </span>
                        </div>
                        <h4 className="mt-3 text-xl font-bold text-gray-900">
                          {tutorial.title}
                        </h4>
                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-600">
                          {tutorial.description || (
                            locale === 'ar' ? 'لا يوجد وصف.' : 'No description.'
                          )}
                        </p>
                      </div>
                      {busy && <Loader2 className="animate-spin text-violet-600" size={20} />}
                    </div>

                    <div className="mt-4 flex items-center justify-between rounded-2xl bg-stone-50 px-4 py-3 text-sm">
                      <span className="font-bold text-gray-700">
                        {tutorial.steps.length} {locale === 'ar' ? 'خطوة' : 'steps'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(tutorial.updatedAt).toLocaleDateString(
                          locale === 'ar' ? 'ar-EG' : 'en-CA',
                        )}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                      <button
                        type="button"
                        onClick={() => openEdit(tutorial)}
                        disabled={busy}
                        className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        <Edit3 size={16} />
                        {locale === 'ar' ? 'تعديل' : 'Edit'}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handlePreview(tutorial)}
                        disabled={busy || tutorial.steps.length === 0}
                        className="flex items-center justify-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-bold text-sky-700 hover:bg-sky-100 disabled:opacity-50"
                      >
                        <Eye size={16} />
                        {locale === 'ar' ? 'معاينة' : 'Preview'}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handlePublishToggle(tutorial)}
                        disabled={busy}
                        className="flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                      >
                        {tutorial.published ? <EyeOff size={16} /> : <Eye size={16} />}
                        {tutorial.published
                          ? locale === 'ar' ? 'إلغاء النشر' : 'Unpublish'
                          : locale === 'ar' ? 'نشر' : 'Publish'}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDuplicate(tutorial)}
                        disabled={busy}
                        className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        <Copy size={16} />
                        {locale === 'ar' ? 'نسخ' : 'Duplicate'}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(tutorial)}
                        disabled={busy}
                        className="flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-100 disabled:opacity-50 sm:col-span-2"
                      >
                        <Trash2 size={16} />
                        {locale === 'ar' ? 'حذف نهائي' : 'Delete Permanently'}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      <TutorialEditorModal
        open={editorOpen}
        tutorial={editingTutorial}
        locale={locale}
        saving={saving}
        onClose={() => {
          setEditorOpen(false);
          setEditingTutorial(null);
        }}
        onSave={handleSave}
        onPreview={handlePreviewDraft}
      />
    </section>
  );
}
