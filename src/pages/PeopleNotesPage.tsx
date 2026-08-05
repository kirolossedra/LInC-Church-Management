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
    <div className="people-notes-ui space-y-8 py-2 md:py-6" dir={controller.dir}>
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
