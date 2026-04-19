import EditableAccountProfile from '../../components/account/EditableAccountProfile';
import { stationAdminPageTitle } from '../../styles/stationAdminTheme';

export default function StationAdminProfilePage() {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className={stationAdminPageTitle}>Профіль</h1>
      </div>
      <EditableAccountProfile
        roleLabel="Адміністратор станції"
        fallbackDisplayName="Адміністратор"
        formIdPrefix="station"
        className="space-y-6"
      />
    </div>
  );
}
