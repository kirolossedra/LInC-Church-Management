import AddPersonPanel from '../components/people-notes/AddPersonPanel';
import PeopleList from '../components/people-notes/PeopleList';
import PeopleNotesHeader from '../components/people-notes/PeopleNotesHeader';
import SelectedPersonDetails from '../components/people-notes/SelectedPersonDetails';
import usePeopleNotes from '../components/people-notes/usePeopleNotes';

export default function PeopleNotesPage({
  hasPastorAccess,
}: {
  hasPastorAccess: boolean;
}) {
  const controller = usePeopleNotes(hasPastorAccess);

  return (
    <div
      className="space-y-8"
      dir={controller.dir}
      style={{ fontFamily: 'Arial, sans-serif' }}
    >
      <PeopleNotesHeader
        controller={controller}
        hasPastorAccess={hasPastorAccess}
      />
      <AddPersonPanel controller={controller} />

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <PeopleList controller={controller} />
        <div className="lg:col-span-2 space-y-6">
          <SelectedPersonDetails controller={controller} />
        </div>
      </section>
    </div>
  );
}
