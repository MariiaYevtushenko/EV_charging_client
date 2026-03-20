import { Navigate, useParams } from 'react-router-dom';
import { useStations } from '../../context/StationsContext';

/** Старі посилання: редірект на вкладку «Порти» картки станції. */
export default function StationFunctionalityPage() {
  const { getStation } = useStations();
  const { stationId } = useParams<{ stationId: string }>();
  const station = stationId ? getStation(stationId) : undefined;

  if (!station) {
    return <Navigate to="/station-dashboard/stations" replace />;
  }

  return (
    <Navigate to={`/station-dashboard/stations/${station.id}#station-ports`} replace />
  );
}
