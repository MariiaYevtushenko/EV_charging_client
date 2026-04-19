import EditableAccountProfile from '../../components/account/EditableAccountProfile';
import { globalAdminPageTitle } from '../../styles/globalAdminTheme';

export default function GlobalAdminProfilePage() {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className={globalAdminPageTitle}>Профіль</h1>
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
