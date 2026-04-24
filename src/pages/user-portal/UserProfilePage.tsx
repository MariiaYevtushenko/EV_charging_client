import EditableAccountProfile from '../../components/account/EditableAccountProfile';

export default function UserProfilePage() {
  return (
    <div className="mx-auto w-full min-w-0 max-w-xl space-y-6 pb-2">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Профіль</h1>
      </div>

      <EditableAccountProfile
        roleLabel="Користувач"
        fallbackDisplayName="Користувач"
        formIdPrefix="user"
        className="w-full space-y-6"
      />
    </div>
  );
}
