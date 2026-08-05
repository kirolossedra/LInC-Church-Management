import { Clock } from 'lucide-react';

export default function UnassignedGroupNotice({ isAr }: { isAr: boolean }) {
  return (
                <section className="rounded-3xl border-2 border-amber-200 bg-amber-50 p-6 text-amber-800 shadow-sm">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/70">
                      <Clock size={28} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black">
                        {isAr ? 'لم يتم تعيينك في مجموعة بعد' : 'You are not assigned to a group yet'}
                      </h3>
                      <p className="mt-2 leading-relaxed">
                        {isAr
                          ? 'تم التعرف على رمزك الشخصي، لكن لم يتم تعيينك في إحدى مجموعات نمو الأشخاص بعد. عندما يقوم Pastor بتعيينك، ستظهر ملاحظات وتكليفات مجموعتك هنا تلقائياً.'
                          : 'Your identifier was recognized, but you have not been assigned to a People Development group yet. Once Pastor assigns you, your group notes and assignments will appear here automatically.'}
                      </p>
                    </div>
                  </div>
                </section>
  );
}

