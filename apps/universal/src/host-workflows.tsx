import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Button, Card, DatePicker, FileUpload, Input, Select, SwitchWithConsequence } from '@rsvp/ui';

const eventTypes = [{ label: 'Boda', value: 'wedding' }, { label: 'Quinceaños', value: 'quince' }, { label: 'Cumpleaños', value: 'birthday' }];
const templates = [{ label: 'Clásico marfil', value: 'classic' }, { label: 'Editorial', value: 'editorial' }, { label: 'Fiesta', value: 'festive' }];
const page = { flexGrow: 1, padding: 16, gap: 16 } as const;
const heading = { fontSize: 26, fontWeight: '700' } as const;
const description = { color: '#625B71' } as const;

function HostPage({ title, children }: { title: string; children: React.ReactNode }) { return <ScrollView contentContainerStyle={page}><Text accessibilityRole="header" style={heading}>{title}</Text>{children}</ScrollView>; }

export function Onboarding({ step }: { step: 1 | 2 | 3 }) {
  const [type, setType] = useState('wedding'); const [name, setName] = useState(''); const [template, setTemplate] = useState('classic');
  const hostLabel = type === 'wedding' ? 'Nombres de los novios' : type === 'quince' ? 'Nombre de la celebrante' : 'Nombre del anfitrión';
  return <HostPage title={`Crear celebración · Paso ${step} de 3`}><Text style={description}>Tu borrador queda guardado en este dispositivo hasta que puedas publicarlo.</Text>{step === 1 ? <Select label="Tipo de evento" value={type} onChange={setType} options={eventTypes} /> : null}{step === 2 ? <><Input label={hostLabel} value={name} onChangeText={setName} placeholder="Escribe el nombre" /><DatePicker label="Fecha del evento" /></> : null}{step === 3 ? <><Select label="Template" value={template} onChange={setTemplate} options={templates} /><Card><Text>Vista previa: {template} para {type}</Text></Card></> : null}<Button accessibilityLabel="Continuar onboarding">Continuar</Button></HostPage>;
}

export function ContentEditor({ section }: { section: 'inicio' | 'lugares' | 'historia' | 'itinerario' | 'secciones' }) {
  const [value, setValue] = useState(''); const [saved, setSaved] = useState(false);
  const labels = { inicio: 'Datos de la celebración', lugares: 'Lugares', historia: 'Historia', itinerario: 'Itinerario', secciones: 'Secciones visibles' };
  return <HostPage title={labels[section]}><Text style={description}>Los cambios se mantienen al fallar una solicitud y se pueden reintentar.</Text><Input label="Contenido" value={value} onChangeText={(next) => { setValue(next); setSaved(false); }} placeholder="Completa este dato" error={!value && saved ? 'Este campo es obligatorio.' : undefined} /><Button onPress={() => setSaved(true)}>Guardar borrador</Button>{saved && value ? <Text accessibilityRole="alert">Borrador guardado. Se sincronizará al tener conexión.</Text> : null}</HostPage>;
}

export function GalleryEditor() { const [cover, setCover] = useState(''); return <HostPage title="Galería"><Text style={description}>La carga real usa una URL prefirmada del servicio de media.</Text><FileUpload label="Añadir imagen" fileName={cover || undefined} onSelect={() => setCover('imagen-seleccionada.jpg')} /><Card><Text>{cover ? `${cover} es la portada actual.` : 'Aún no hay imágenes.'}</Text><Button variant="secondary" onPress={() => setCover('imagen-seleccionada.jpg')}>Elegir como portada</Button></Card></HostPage>; }

export function TranslationEditor() { const [locale, setLocale] = useState('es-BO'); const [copy, setCopy] = useState(''); return <HostPage title="Traducciones"><Select label="Idioma" value={locale} onChange={setLocale} options={[{ label: 'Español (Bolivia)', value: 'es-BO' }, { label: 'English (US)', value: 'en-US' }]} /><Input label="Contenido traducido" value={copy} onChangeText={setCopy} placeholder="Escribe la traducción" /><Button>Guardar traducción</Button></HostPage>; }

export function TemplateChooser() { const [template, setTemplate] = useState('classic'); return <HostPage title="Templates"><Text style={description}>Solo aparecen templates compatibles con el tipo de evento.</Text><Select label="Template compatible" value={template} onChange={setTemplate} options={templates} /><Card><Text>El contenido se conserva al cambiar de template.</Text></Card><Button>Aplicar template</Button></HostPage>; }

export function DevicePreview() { const [size, setSize] = useState('mobile'); const width = size === 'desktop' ? '100%' : size === 'tablet' ? '76%' : '42%'; return <HostPage title="Vista previa"><Select label="Dispositivo" value={size} onChange={setSize} options={[{ label: 'Móvil', value: 'mobile' }, { label: 'Tableta', value: 'tablet' }, { label: 'Escritorio', value: 'desktop' }]} /><View style={{ width, alignSelf: 'center', minHeight: 360, padding: 16, gap: 12, borderRadius: 12, borderWidth: 1, borderColor: '#CAC4D0', backgroundColor: '#FFFBF4' }}><Text style={{ fontSize: 24, fontWeight: '700' }}>Nuestra celebración</Text><Text>Así verán la página pública los invitados.</Text><View style={{ height: 120, borderRadius: 8, backgroundColor: '#E9DDFF' }} /></View></HostPage>; }

export function PublishChecklist() { const [published, setPublished] = useState(false); const tasks = ['Completar anfitriones', 'Definir fecha y lugar', 'Elegir template']; return <HostPage title="Publicación"><Text style={description}>La lista viene del backend cuando devuelve una validación 422.</Text>{tasks.map((task) => <Card key={task}><Text>{task}</Text></Card>)}<Button onPress={() => setPublished(!published)}>{published ? 'Despublicar celebración' : 'Publicar cuando esté lista'}</Button>{published ? <Text accessibilityRole="alert">Publicada. Comparte tu enlace público desde la pantalla de vista previa.</Text> : null}</HostPage>; }

export function CelebrationSettings() { const [deadline, setDeadline] = useState(''); return <HostPage title="Configuración"><Select label="Idioma principal" value="es-BO" options={[{ label: 'Español (Bolivia)', value: 'es-BO' }]} /><Select label="Zona horaria" value="America/La_Paz" options={[{ label: 'America/La_Paz', value: 'America/La_Paz' }]} /><Select label="Moneda" value="BOB" options={[{ label: 'Boliviano (BOB)', value: 'BOB' }]} /><DatePicker label="Fecha límite para RSVP" value={deadline} onChange={setDeadline} error={deadline && deadline < '2026-01-01' ? 'Una fecha pasada congela los RSVP nuevos.' : undefined} /></HostPage>; }

export function CelebrationModes() { const [autoAccept, setAutoAccept] = useState(false); const [restricted, setRestricted] = useState(true); return <HostPage title="Modos de control"><SwitchWithConsequence label="Aceptar RSVP automáticamente" value={autoAccept} onChange={setAutoAccept} pendingCount={3} consequence="Las solicitudes futuras se confirmarán sin revisión manual." /><SwitchWithConsequence label="Restringir cambios del invitado" value={restricted} onChange={setRestricted} pendingCount={3} consequence="Los invitados deberán pedir ayuda para editar su respuesta." /></HostPage>; }
