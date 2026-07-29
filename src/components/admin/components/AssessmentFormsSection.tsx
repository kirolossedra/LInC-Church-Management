import { Eye, EyeOff, Loader2, LockKeyhole } from 'lucide-react';
import { ASSESSMENT_FORM_DEFINITIONS } from '../admin.constants';
import type { AssessmentFormState } from '../admin.types';
import { assessmentFormTitle } from '../admin.utils';

interface AssessmentFormsSectionProps {
  loadingAssessmentForms: boolean;
  assessmentFormStates: Record<string, AssessmentFormState>;
  savingAssessmentFormId: string | null;
  handleAssessmentFormStateChange: (
    formId: string,
    nextState: AssessmentFormState
  ) => void | Promise<void>;
}

export function AssessmentFormsSection({
  loadingAssessmentForms,
  assessmentFormStates,
  savingAssessmentFormId,
  handleAssessmentFormStateChange,
}: AssessmentFormsSectionProps) {
  return (
<section className="overflow-hidden rounded-[28px] border border-[#8b1e1e]/10 bg-white shadow-[0_16px_45px_rgba(73,20,20,0.08)]">
  <div className="border-b border-stone-100 px-6 py-5 sm:px-8">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="mb-1 text-xs font-extrabold uppercase tracking-[0.18em] text-[#8b1e1e]/50">
          Assessment Page
        </p>
        <h2 className="text-2xl font-extrabold text-[#641414]">
          Assessment Form Availability
        </h2>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-stone-500">
          Choose whether each assessment is available, shown as unavailable, or completely removed from the public form-selection page.
        </p>
      </div>

      {loadingAssessmentForms && (
        <div className="inline-flex items-center gap-2 text-sm font-semibold text-stone-500">
          <Loader2 size={17} className="animate-spin" />
          Loading form controls
        </div>
      )}
    </div>
  </div>

  <div className="p-6 sm:p-8">
    <div className="mb-6 grid gap-3 sm:grid-cols-3">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
        <p className="text-sm font-extrabold text-emerald-900">
          Active
        </p>
        <p className="mt-1 text-xs leading-relaxed text-emerald-800/75">
          Visible and clickable.
        </p>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
        <p className="text-sm font-extrabold text-amber-900">
          Disabled
        </p>
        <p className="mt-1 text-xs leading-relaxed text-amber-800/75">
          Visible, gray, and not clickable.
        </p>
      </div>

      <div className="rounded-2xl border border-stone-300 bg-stone-100 px-4 py-3">
        <p className="text-sm font-extrabold text-stone-800">
          Hidden
        </p>
        <p className="mt-1 text-xs leading-relaxed text-stone-600">
          Completely removed from the public page.
        </p>
      </div>
    </div>

    {loadingAssessmentForms ? (
      <div className="grid min-h-[180px] place-items-center rounded-2xl border border-dashed border-stone-300 bg-stone-50">
        <div className="text-center text-stone-500">
          <Loader2 size={30} className="mx-auto mb-3 animate-spin" />
          <p className="font-semibold">Loading assessment forms</p>
        </div>
      </div>
    ) : (
      <div className="grid gap-5 lg:grid-cols-2">
        {ASSESSMENT_FORM_DEFINITIONS.map((form) => {
          const currentState =
            assessmentFormStates[form.id] || 'active';
          const isSaving = savingAssessmentFormId === form.id;

          return (
            <article
              key={form.id}
              className="rounded-[22px] border border-stone-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-lg font-extrabold text-[#641414]">
                    {assessmentFormTitle(form, 'en')}
                  </p>
                  <p
                    dir="rtl"
                    className="mt-1 text-sm font-bold text-stone-500"
                  >
                    {assessmentFormTitle(form, 'ar')}
                  </p>
                  <p className="mt-2 break-all text-xs font-semibold text-stone-400">
                    Firebase ID: {form.id}
                  </p>
                </div>

                <span
                  className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-extrabold ${
                    currentState === 'active'
                      ? 'bg-emerald-100 text-emerald-800'
                      : currentState === 'disabled'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-stone-200 text-stone-700'
                  }`}
                >
                  {currentState === 'active'
                    ? 'Active'
                    : currentState === 'disabled'
                      ? 'Disabled'
                      : 'Hidden'}
                </span>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() =>
                    handleAssessmentFormStateChange(form.id, 'active')
                  }
                  className={`inline-flex min-h-[46px] items-center justify-center gap-1.5 rounded-xl px-2 text-xs font-extrabold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    currentState === 'active'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                  }`}
                >
                  {isSaving ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Eye size={16} />
                  )}
                  Active
                </button>

                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() =>
                    handleAssessmentFormStateChange(
                      form.id,
                      'disabled'
                    )
                  }
                  className={`inline-flex min-h-[46px] items-center justify-center gap-1.5 rounded-xl px-2 text-xs font-extrabold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    currentState === 'disabled'
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
                  }`}
                >
                  {isSaving ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <LockKeyhole size={16} />
                  )}
                  Disabled
                </button>

                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() =>
                    handleAssessmentFormStateChange(form.id, 'hidden')
                  }
                  className={`inline-flex min-h-[46px] items-center justify-center gap-1.5 rounded-xl px-2 text-xs font-extrabold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    currentState === 'hidden'
                      ? 'bg-stone-700 text-white shadow-sm'
                      : 'border border-stone-300 bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  {isSaving ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <EyeOff size={16} />
                  )}
                  Hidden
                </button>
              </div>
            </article>
          );
        })}
      </div>
    )}
  </div>
</section>
  );
}
