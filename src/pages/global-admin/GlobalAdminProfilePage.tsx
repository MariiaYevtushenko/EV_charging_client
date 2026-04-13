import EditableAccountProfile from '../../components/account/EditableAccountProfile';

export default function GlobalAdminProfilePage() {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Профіль</h1>
      </div>
      <EditableAccountProfile
        roleLabel="Адміністратор"
        fallbackDisplayName="Адміністратор"
        formIdPrefix="ga"
        className="space-y-6"
      />
    </div>
  );
}
