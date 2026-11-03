import { Surface } from '@rsvp/ui';
import { useT } from '../../src/platform/providers';

export default function GuestHome() { const t = useT(); return <Surface title={t('stubs.guest.title')} description={t('stubs.guest.description')} />; }
