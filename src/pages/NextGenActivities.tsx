import { useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Files, LogOut, MapPinned, MessageCircleQuestion } from 'lucide-react';
import { useParams } from 'react-router-dom';

import LincLogo from '../components/brand/LincLogo';
import MontrealMissionTripMap from '../components/nextgen/MontrealMissionTripMap';
import {
  NextGenAuthGateway,
  NextGenFilesWorkspace,
  NextGenQaSessionList,
  NextGenQaSessionPage,
} from '../components/nextgen/portal';
import { auth } from '../firebase';

type PortalSection = 'qa' | 'files' | 'map';

export default function NextGenActivities() {
  const [user, loading] = useAuthState(auth);
  const [section, setSection] = useState<PortalSection>('qa');
  const { sessionId } = useParams();

  return (
    <div className="nextgen-ui min-h-screen bg-[#f4efe6] px-4 py-8 md:px-7 md:py-12">
      <NextGenAuthGateway user={user} loading={loading}>
        <div className="mx-auto max-w-7xl">
          <header className="relative overflow-hidden rounded-[2.6rem] bg-[#1b0d0d] p-7 text-white shadow-[0_30px_80px_rgba(44,12,12,0.22)] md:p-11">
            <div className="linc-grid pointer-events-none absolute inset-0 opacity-10" />
            <div className="relative flex flex-col gap-7 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-5">
                <LincLogo className="h-16 w-16 rounded-2xl bg-white/10 p-2.5" />
                <div><p className="text-xs font-black uppercase tracking-[0.32em] text-[#f2a900]">LInC One</p><h1 className="mt-1 font-serif text-4xl md:text-5xl">NextGen Portal</h1></div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 pl-5">
                <div className="min-w-0"><p className="truncate text-sm font-black">{user?.displayName || user?.email}</p><p className="truncate text-xs text-stone-400">{user?.email}</p></div>
                <button onClick={() => void auth.signOut()} className="rounded-xl bg-white/10 p-3 text-stone-200 hover:bg-white/15" aria-label="Sign out"><LogOut size={18} /></button>
              </div>
            </div>
          </header>

          {sessionId ? (
            <main className="mt-8"><NextGenQaSessionPage /></main>
          ) : (
            <>
              <nav className="mt-7 grid gap-3 rounded-[2rem] border border-[#7a1717]/10 bg-white/80 p-3 shadow-sm md:grid-cols-3">
                <PortalButton active={section === 'qa'} icon={MessageCircleQuestion} label="QA sessions" onClick={() => setSection('qa')} />
                <PortalButton active={section === 'files'} icon={Files} label="NextGen files" onClick={() => setSection('files')} />
                <PortalButton active={section === 'map'} icon={MapPinned} label="Mission trip map" onClick={() => setSection('map')} />
              </nav>
              <main className="mt-8">
                {section === 'qa' && <NextGenQaSessionList />}
                {section === 'files' && <NextGenFilesWorkspace />}
                {section === 'map' && <MontrealMissionTripMap onClose={() => setSection('qa')} />}
              </main>
            </>
          )}
        </div>
      </NextGenAuthGateway>
    </div>
  );
}

function PortalButton({ active, icon: Icon, label, onClick }: {
  active: boolean;
  icon: typeof Files;
  label: string;
  onClick: () => void;
}) {
  return <button onClick={onClick} className={`flex items-center justify-center gap-3 rounded-2xl px-5 py-4 text-sm font-black transition ${active ? 'bg-[#7a1717] text-white shadow-[0_12px_28px_rgba(122,23,23,0.2)]' : 'text-stone-600 hover:bg-[#f5eee4] hover:text-[#7a1717]'}`}><Icon size={19} />{label}</button>;
}
