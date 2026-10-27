// Pruebas de functions/api/evento.js con node:test. Sin red: fetch se reemplaza por un doble.
// Ejecutar desde la raiz del proyecto: node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequestPost, onRequest } from '../functions/api/evento.js';

const ENV = { SUPABASE_URL: 'https://x.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_FAKE' };
const BASE = { tipo: 'clic_whatsapp', cta: 'hero', pagina: '/poliurea', utm_source: 'ig', utm_medium: 'bio', utm_campaign: 'oct' };

let llamadas = [];
let supabaseOk = true;
const realFetch = globalThis.fetch;

test.beforeEach(() => {
  llamadas = [];
  supabaseOk = true;
  globalThis.fetch = async (url, init) => {
    llamadas.push({ url: String(url), init });
    return new Response(null, { status: supabaseOk ? 201 : 400 });
  };
});
test.after(() => { globalThis.fetch = realFetch; });

function req(body, o = {}) {
  const headers = { 'Content-Type': o.ct ?? 'application/json' };
  if (o.origin !== null) headers.Origin = o.origin ?? 'https://polysellos.pages.dev';
  return new Request('https://polysellos.pages.dev/api/evento', {
    method: 'POST', headers, body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

const correr = (request) => onRequestPost({ request, env: ENV, waitUntil: () => {} });
const insercion = () => llamadas.find((l) => l.url.includes('/rest/v1/eventos'));

test('evento valido: 204, inserta con apikey y sin Authorization', async () => {
  const res = await correr(req(BASE));
  assert.equal(res.status, 204);
  const ins = insercion();
  assert.equal(ins.url, 'https://x.supabase.co/rest/v1/eventos');
  assert.equal(ins.init.headers.apikey, 'sb_publishable_FAKE');
  assert.equal(ins.init.headers.Authorization, undefined);
});

test('solo envia las columnas permitidas', async () => {
  await correr(req({ ...BASE, ip: '1.2.3.4', nombre: 'Ana', estado: 'x' }));
  const b = JSON.parse(insercion().init.body);
  assert.deepEqual(Object.keys(b).sort(), ['cta', 'pagina', 'tipo', 'utm_campaign', 'utm_medium', 'utm_source']);
});

test('envio de formulario sin utm: 204 y utm en null', async () => {
  const res = await correr(req({ tipo: 'envio_formulario', cta: 'formulario', pagina: '/' }));
  assert.equal(res.status, 204);
  const b = JSON.parse(insercion().init.body);
  assert.equal(b.tipo, 'envio_formulario');
  assert.equal(b.utm_source, null);
});

const rechazos = [
  ['origen ajeno', () => req(BASE, { origin: 'https://malo.com' }), 403],
  ['sin origen', () => req(BASE, { origin: null }), 403],
  ['no es json', () => req('x', { ct: 'text/plain' }), 415],
  ['json roto', () => req('{no'), 400],
  ['cuerpo grande', () => req({ ...BASE, pagina: '/' + 'a'.repeat(1100) }), 413],
  ['tipo fuera de la lista', () => req({ ...BASE, tipo: 'visita' }), 422],
  ['cta invalido', () => req({ ...BASE, cta: 'Hero Principal' }), 422],
  ['cta demasiado largo', () => req({ ...BASE, cta: 'a'.repeat(41) }), 422],
  ['pagina sin barra inicial', () => req({ ...BASE, pagina: 'poliurea' }), 422],
  ['utm demasiado largo', () => req({ ...BASE, utm_source: 'u'.repeat(101) }), 422],
];
for (const [nombre, hacer, estado] of rechazos) {
  test(`rechaza: ${nombre}`, async () => {
    const res = await correr(hacer());
    assert.equal(res.status, estado);
    assert.equal(insercion(), undefined, 'no debe tocar Supabase');
  });
}

test('Supabase responde error: 502 sin devolver el error', async () => {
  supabaseOk = false;
  const res = await correr(req(BASE));
  assert.equal(res.status, 502);
  assert.equal(await res.text(), '');
});

test('Supabase inalcanzable: 502', async () => {
  globalThis.fetch = async () => { throw new Error('red'); };
  const res = await correr(req(BASE));
  assert.equal(res.status, 502);
});

test('otro metodo: 405', async () => {
  const res = await onRequest();
  assert.equal(res.status, 405);
});
