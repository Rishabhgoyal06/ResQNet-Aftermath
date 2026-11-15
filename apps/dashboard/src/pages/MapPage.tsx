import LiveMap from '../components/map/LiveMap';
import { useRealtimeSOS } from '../hooks/useRealtimeSOS';
import { useProcessedSOS } from '../hooks/useProcessedSOS';
import { useMemo, useState } from 'react';

export default function MapPage() {
  const { reports } = useRealtimeSOS();
  const { reports: processedReports } = useProcessedSOS();
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  const detailedAreaById = useMemo(() => {
    const map: Record<string, string> = {};
    processedReports.forEach((report) => {
      if (report.detailed_area) {
        map[report.id] = report.detailed_area;
      }
    });
    return map;
  }, [processedReports]);

  return (
    <div style={{ height: '100%', width: '100%', padding: 18 }}>
      <LiveMap reports={reports} selectedReportId={selectedReportId} onMarkerClick={(r) => setSelectedReportId(r.id)} detailedAreaById={detailedAreaById} />
    </div>
  );
}
