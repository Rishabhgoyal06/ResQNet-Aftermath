import HeatmapView from '../components/map/HeatmapView';
import { useRealtimeSOS } from '../hooks/useRealtimeSOS';

export default function HeatmapPage() {
  const { reports } = useRealtimeSOS();

  return (
    <div style={{ height: '100%', width: '100%', padding: 18 }}>
      <HeatmapView reports={reports} />
    </div>
  );
}
