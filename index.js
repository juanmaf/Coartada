// Cloud Function para "Cargar rondas desde una captura" (pedido el 27/8/2026): lee una foto o
// captura de pantalla del marcador de una partida (de cualquier app de golf) y devuelve una
// PROPUESTA de filas {nombre, hcp, resultado} — nunca escribe nada en `rounds` directamente.
// Cada fila la revisa y aprueba a mano la persona que subió la foto, desde la propia app
// (ver `index.html`, tarjeta "Cargar rondas desde una captura" en la pestaña Rondas).
//
// Es la ÚNICA pieza de backend de todo el proyecto — el resto sigue siendo un sitio 100%
// estático (GitHub Pages) + Firestore. Existe solo porque llamar a un modelo de IA con visión
// necesita una clave/credencial que nunca debe viajar al navegador de cualquiera que abra la
// página. Se autentica contra Vertex AI con la propia identidad de la función dentro de tu
// proyecto de Google Cloud — no hace falta crear ni guardar ninguna API key de IA.
//
// Protecciones (ver decisiones del proyecto, sección "Cargar rondas desde una captura",
// 27/8/2026 — el usuario pidió explícitamente que esto no pudiera costarle dinero ni ser un
// blanco fácil para bots):
//   1. `enforceAppCheck: true` — rechaza cualquier petición que no venga de la propia página
//      cargada en un navegador real (ver SETUP.md, Parte 3, para activar App Check).
//   2. Tope duro de llamadas al día (`DAILY_CALL_CAP`), contado en Firestore.
//   3. `maxInstances` bajo — acota cuántas peticiones puede atender la función a la vez.
//   4. Imagen de entrada limitada de tamaño y tipo.
//   5. Modelo más barato de Gemini, con límite de tokens de salida.
// Ninguna de estas protecciones necesita firestore.rules nuevas: la colección de contador
// (`_screenshotImportUsage`) solo la toca esta función (con privilegios de admin, se salta las
// reglas), y el catálogo de reglas ya bloquea cualquier colección no listada explícitamente.

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');
const admin = require('firebase-admin');
const { GoogleGenAI, Type } = require('@google/genai');

admin.initializeApp();

// Región cercana a España (mismo criterio que el resto del proyecto, ver SETUP.md) y tope de
// instancias concurrentes — con esto, aunque alguien se saltara App Check, el peor caso posible
// queda acotado (no puede "dispararse" sin límite).
setGlobalOptions({ region: 'europe-west1', maxInstances: 3 });

const DAILY_CALL_CAP = 150; // muchísimo más de lo que un grupo de amigos necesitaría en un día real
const MAX_IMAGE_BYTES = 6 * 1024 * 1024; // 6MB ya decodificado — de sobra para una captura de móvil
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const GEMINI_MODEL = 'gemini-2.5-flash-lite'; // el más barato con visión — ver decisiones del proyecto

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    fecha: { type: Type.STRING, nullable: true, description: 'Fecha de la partida en formato YYYY-MM-DD si se ve en la imagen, si no null.' },
    campo: { type: Type.STRING, nullable: true, description: 'Nombre del campo de golf si se ve en la imagen, si no null.' },
    esStableford: {
      type: Type.BOOLEAN, nullable: true,
      description: 'true si la vista/pestaña mostrada en la imagen es la de resultado Stableford ' +
        '(a veces rotulada "Stableford NET" o similar); false si es otra vista distinta, como ' +
        '"Juego por golpes" / "golpes NET" / gross/neto por golpes u otro formato que no sea ' +
        'Stableford; null si no se puede determinar con la imagen dada.'
    },
    filas: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          nombre: { type: Type.STRING, description: 'Nombre del jugador tal y como aparece en la imagen.' },
          hcp: { type: Type.NUMBER, nullable: true, description: 'Hándicap de juego de ese jugador si se ve, si no null.' },
          resultado: { type: Type.NUMBER, nullable: true, description: 'Puntos Stableford totales de ese jugador (el número de puntos, NO el "al par"), si se ve, si no null.' }
        },
        required: ['nombre']
      }
    }
  },
  required: ['filas']
};

const PROMPT = 'Esta imagen es una captura de pantalla de una app de golf con el marcador de ' +
  'una partida jugada por varias personas (formato individual Stableford). Muchas de estas apps ' +
  'tienen pestañas para ver el mismo marcador de distintas formas — por ejemplo "Juego por ' +
  'golpes NET" (o "golpes", "gross", "neto") frente a "Stableford NET" — y solo una está activa ' +
  '(resaltada, normalmente con un color de fondo distinto al de la pestaña no seleccionada) en ' +
  'cada captura. Primero identifica cuál de las dos está activa en ESTA imagen (fíjate bien en ' +
  'cuál de las dos tiene el fondo resaltado, no en el orden en que aparecen) y rellena ' +
  '`esStableford` (true si la vista activa es la de Stableford, false si es cualquier otra, como ' +
  'la de golpes). Pista adicional: un resultado Stableford real de 18 hoyos casi nunca pasa de ' +
  'unos 50 puntos — si los números que ves son casi todos bastante más altos que eso (60, 70, 80...), ' +
  'es casi seguro que es un resultado por golpes, no Stableford, aunque la pestaña resaltada no ' +
  'se vea con claridad. Extrae, para cada jugador de la lista: su nombre tal y como aparece, ' +
  'su hándicap (columna "HCP" o similar) y su resultado. IMPORTANTE: solo rellenes `resultado` ' +
  'con puntos Stableford de verdad — si `esStableford` es false (la vista activa es de golpes u ' +
  'otro formato), deja `resultado` en null para todos los jugadores en vez de poner ahí el ' +
  'número de golpes, porque no son la misma magnitud. Cuando sí sea Stableford, usa la cifra ' +
  'grande de puntos, normalmente llamada "Resultado" — NO la columna "Al par", que es una ' +
  'diferencia relativa, no el número de puntos. Si se ve la fecha de la partida, conviértela a ' +
  'formato YYYY-MM-DD. Si se ve el nombre del campo de golf, inclúyelo tal cual. Si algún dato ' +
  'no se ve con claridad, usa null para ese campo en vez de inventarlo. Devuelve solo los ' +
  'jugadores que veas listados, sin inventar filas.';

function assertValidImage(data) {
  if (!data || typeof data !== 'object') {
    throw new HttpsError('invalid-argument', 'Falta la imagen.');
  }
  const { imageBase64, mimeType } = data;
  if (typeof imageBase64 !== 'string' || imageBase64.length === 0) {
    throw new HttpsError('invalid-argument', 'Falta la imagen.');
  }
  if (typeof mimeType !== 'string' || ALLOWED_MIME_TYPES.indexOf(mimeType) === -1) {
    throw new HttpsError('invalid-argument', 'Formato de imagen no soportado (usa JPEG, PNG o WEBP).');
  }
  // Tamaño decodificado aproximado a partir de la longitud en base64, sin decodificar entero
  // todavía (base64 añade ~33% de tamaño) — evita hacer trabajo de más con una petición ya
  // sobredimensionada antes de comprobar el límite real.
  const approxBytes = Math.floor(imageBase64.length * 0.75);
  if (approxBytes > MAX_IMAGE_BYTES) {
    throw new HttpsError('invalid-argument', 'La imagen es demasiado grande (máximo 6MB).');
  }
  return { imageBase64, mimeType };
}

// Tope diario contado en Firestore, en una colección que ningún cliente puede leer ni escribir
// directamente (bloqueada por el catch-all de firestore.rules) — solo esta función la toca, con
// privilegios de admin. Fecha en UTC por simplicidad; no hace falta más precisión para un tope
// de "por si acaso".
async function checkAndIncrementDailyUsage() {
  const today = new Date().toISOString().slice(0, 10);
  const ref = admin.firestore().collection('_screenshotImportUsage').doc(today);
  const allowed = await admin.firestore().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const count = snap.exists ? (snap.data().count || 0) : 0;
    if (count >= DAILY_CALL_CAP) return false;
    tx.set(ref, { count: count + 1 }, { merge: true });
    return true;
  });
  if (!allowed) {
    throw new HttpsError('resource-exhausted', 'Se ha llegado al máximo de lecturas de hoy.');
  }
}

function clampNumber(v, min, max) {
  if (typeof v !== 'number' || !isFinite(v)) return null;
  return Math.max(min, Math.min(max, v));
}

// Nunca nos fiamos ciegamente de lo que devuelva el modelo, aunque venga ya forzado a JSON por
// el responseSchema: se vuelve a validar y acotar aquí, con el mismo espíritu defensivo que
// firestore.rules aplica a cualquier escritura de la app.
function sanitizeResult(raw) {
  const out = { fecha: null, campo: null, esStableford: null, filas: [] };
  if (raw && typeof raw.fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.fecha)) {
    out.fecha = raw.fecha;
  }
  if (raw && typeof raw.campo === 'string' && raw.campo.trim()) {
    out.campo = raw.campo.trim().slice(0, 160);
  }
  if (raw && typeof raw.esStableford === 'boolean') {
    out.esStableford = raw.esStableford;
  }
  const filas = (raw && Array.isArray(raw.filas)) ? raw.filas : [];
  out.filas = filas.slice(0, 40).map(function (f) {
    var nombre = (f && typeof f.nombre === 'string') ? f.nombre.trim().slice(0, 80) : '';
    return {
      nombre: nombre,
      hcp: clampNumber(f && f.hcp, -10, 54),
      resultado: clampNumber(f && f.resultado, 0, 80)
    };
  }).filter(function (f) { return f.nombre.length > 0; });

  // Red de seguridad puramente numérica, además del criterio visual que ya le pedimos al modelo
  // (pedido el 28/8/2026, tras comprobar en un caso real que el modelo no detectó bien qué
  // pestaña estaba activa y dejó pasar resultados de 56-76 como si fueran puntos Stableford):
  // un resultado Stableford real casi nunca pasa de ~50 puntos en una vuelta de 18 hoyos, y un
  // resultado por golpes (bruto o neto) casi siempre es bastante más alto. Si la mayoría de los
  // resultados detectados son claramente demasiado altos para ser Stableford, se fuerza
  // `esStableford` a false y se vacían esos resultados, aunque el modelo hubiera dicho lo
  // contrario o no se hubiera pronunciado — más vale esta comprobación de sentido común que
  // fiarse solo del criterio visual del modelo.
  var STABLEFORD_MAX_PLAUSIBLE = 50;
  var conResultado = out.filas.filter(function (f) { return typeof f.resultado === 'number'; });
  if (conResultado.length > 0) {
    var demasiadoAltos = conResultado.filter(function (f) { return f.resultado > STABLEFORD_MAX_PLAUSIBLE; }).length;
    if (demasiadoAltos / conResultado.length >= 0.5) {
      out.esStableford = false;
      out.filas = out.filas.map(function (f) { return { nombre: f.nombre, hcp: f.hcp, resultado: null }; });
    }
  }

  return out;
}

exports.parseScorecardImage = onCall({ enforceAppCheck: true }, async (request) => {
  const { imageBase64, mimeType } = assertValidImage(request.data);
  await checkAndIncrementDailyUsage();

  const ai = new GoogleGenAI({
    vertexai: true,
    project: process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT,
    location: 'global'
  });

  let response;
  try {
    response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        { inlineData: { data: imageBase64, mimeType: mimeType } },
        PROMPT
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
        maxOutputTokens: 3000
      }
    });
  } catch (err) {
    console.error('parseScorecardImage: fallo llamando a Gemini', err);
    throw new HttpsError('internal', 'No se ha podido leer la captura ahora mismo. Inténtalo de nuevo en un momento.');
  }

  let parsed;
  try {
    parsed = JSON.parse(response.text);
  } catch (err) {
    console.error('parseScorecardImage: respuesta no era JSON válido', response.text);
    throw new HttpsError('internal', 'No se ha podido interpretar la captura. Prueba con otra foto (mejor luz/nitidez) o mete la ronda a mano.');
  }

  return sanitizeResult(parsed);
});
