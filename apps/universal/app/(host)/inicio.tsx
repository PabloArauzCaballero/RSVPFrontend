import { Surface } from '@rsvp/ui';
import { useT } from '../../src/platform/providers';

export default function HostHome() { const t = useT(); return <Surface title={t('stubs.host.title')} description={t('stubs.host.description')} />; }
