import { Surface } from '@rsvp/ui';
import { useT } from '../../src/platform/providers';

export default function ProviderHome() { const t = useT(); return <Surface title={t('stubs.provider.title')} description={t('stubs.provider.description')} />; }
