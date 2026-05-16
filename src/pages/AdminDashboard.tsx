import { Link } from 'react-router-dom';
import { useI18n } from '../i18n';
import AdminManager from '../components/AdminManager';
import { LayoutDashboard, UsersRound } from 'lucide-react';
import PageTitle from '../components/PageTitle';

export default function AdminDashboard({ isSuperAdmin, userEmail }: { isSuperAdmin: boolean; userEmail: string }) {
  const { dir } = useI18n();

  return (
    <div className="space-y-8" dir={dir} style={{ fontFamily: 'Arial, sans-serif' }}>
      <PageTitle
        title={isSuperAdmin ? 'Superadmin — Admin Management' : 'Admin Management'}
        subtitle={isSuperAdmin ? 'Manage roles and access' : 'View admin team'}
        icon={<LayoutDashboard size={22} />}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Link
          to="/pastor/people-notes"
          className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md"
        >
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-gray-100 p-3 text-gray-800 transition group-hover:bg-gray-200">
              <UsersRound size={24} />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-gray-900">
                People Development Notes
              </h2>

              <p className="text-sm leading-6 text-gray-600">
                Record strengths, growth areas, follow-up dates, and pastoral notes for each person.
              </p>
            </div>
          </div>
        </Link>
      </div>

      <AdminManager onAdminsLoaded={() => {}} currentEmail={userEmail} />
    </div>
  );
}
