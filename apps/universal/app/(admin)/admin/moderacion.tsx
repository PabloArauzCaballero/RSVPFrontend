import { ModerationScreen } from '../../../src/admin/queues';
import { useHostRoute } from '../../../src/platform/route';

/** E8 · Moderación. */
export default function Route() { const { onNavigate } = useHostRoute(); return <ModerationScreen onNavigate={onNavigate} />; }
