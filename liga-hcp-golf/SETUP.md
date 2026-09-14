# Poner en marcha la Liga de Hándicap (gratis, accesible para todos)

Esta versión ya no depende de Claude ni de ninguna cuenta de Anthropic: es una página
web normal que se guarda en GitHub y usa una base de datos gratuita de Google
(Firebase) para que todos los jugadores vean los mismos datos en tiempo real, desde
cualquier móvil, ordenador o cuenta. Nadie necesita instalar nada ni tener cuenta de
Claude para usarla — solo abrir el enlace.

Son dos partes, y las dos son gratuitas dentro de los límites de un grupo de amigos:

1. **Firebase** (Google) — la base de datos donde viven jugadores, campos, barras y rondas.
2. **GitHub Pages** — donde se aloja la página web (el fichero `index.html`).

## Parte 1 — Crear el proyecto de Firebase

1. Entra en <https://console.firebase.google.com> con una cuenta de Google (puede ser
   cualquiera, personal está bien) y pulsa **"Crear un proyecto"**.
2. Ponle un nombre (por ejemplo `liga-hcp-golf`) y sigue el asistente. No hace falta
   activar Google Analytics — puedes desactivarlo, es opcional.
3. Una vez creado, en el menú de la izquierda entra en **"Compilación" → "Firestore
   Database"** y pulsa **"Crear base de datos"**.
   - Elige la ubicación más cercana (por ejemplo `eur3 (Europa)`).
   - Cuando pregunte por el modo de seguridad, elige **"Modo de prueba"** (luego
     sustituiremos esas reglas por las del fichero `firestore.rules`).
4. Ve a **"Reglas"** dentro de Firestore Database, borra lo que haya y pega el
   contenido completo del fichero `firestore.rules` que te he preparado. Pulsa
   **"Publicar"**.
5. Vuelve a la página principal del proyecto (icono de casita) y pulsa el icono
   **`</>`** ("Web") para añadir una app web.
   - Ponle un apodo (por ejemplo `liga-hcp-web`). No hace falta marcar "Firebase
     Hosting".
   - Firebase te mostrará un bloque de código con `const firebaseConfig = {...}`.
     Copia esos valores.
6. Abre el fichero `firebase-config.js` que te adjunto y sustituye cada
   `"PON_AQUI_TU_API_KEY"` etc. por los valores reales que te dio Firebase. Guarda el
   fichero.

Con esto, tu base de datos ya existe y sabe aceptar conexiones desde tu web.

## Parte 2 — Subir la web a GitHub Pages

1. Entra en <https://github.com> (crea una cuenta gratuita si no tienes) y pulsa
   **"New repository"**.
   - Nombre sugerido: `liga-hcp-golf`.
   - Puede ser público (necesario para GitHub Pages gratis) — no contiene ningún dato
     sensible, solo el código de la página; los datos de las rondas viven en Firebase,
     no en este repositorio.
2. Sube estos ficheros al repositorio (botón **"Add file" → "Upload files"**,
   arrastrándolos todos juntos):
   - `index.html`
   - `seed-data.js`
   - `firebase-config.js` (con tus valores ya rellenados del paso anterior)
   - `manifest.webmanifest`, `favicon.ico`, `icon-192.png`, `icon-512.png`,
     `icon-512-maskable.png` y `apple-touch-icon.png` (el icono de la app — ver más abajo)
   - (el fichero `firestore.rules` no se sube aquí, es solo para pegar en Firebase)
3. Ve a **"Settings" → "Pages"** (menú de la izquierda del repositorio).
   - En "Source", elige **"Deploy from a branch"**.
   - Rama: `main` (o `master`), carpeta: `/ (root)`.
   - Pulsa **"Save"**.
4. Espera uno o dos minutos y recarga la página de Settings → Pages. Te mostrará la
   URL pública, algo como:

   `https://TU-USUARIO.github.io/liga-hcp-golf/`

   Ese es el enlace definitivo para compartir con todo el grupo. Funciona en
   cualquier navegador, móvil o cuenta — no depende de Claude.

## Parte 3 — "Cargar rondas desde una captura" (opcional, 27/8/2026)

Esta parte es **opcional y aparte de todo lo anterior**: si no la haces, el resto de
la app funciona exactamente igual. Es solo para activar la tarjeta "Cargar rondas
desde una captura" en la pestaña Rondas (subir una foto del marcador de una partida y
que la app proponga las rondas de cada jugador para que las apruebes). Es la única
parte de todo el proyecto que necesita algo más que Firebase + GitHub Pages, porque
leer una foto con IA necesita una pieza de servidor — mientras no hagas esta parte,
esa tarjeta se queda oculta sola y no rompe nada más.

1. **Pasar tu proyecto Firebase al plan Blaze** (pago por uso — sigue siendo gratis
   en la práctica para un grupo de amigos: Google da 2 millones de llamadas gratis al
   mes a las Cloud Functions, y por este uso no deberíais acercaros ni de lejos).
   Firebase Console → icono de la rueda dentada → "Uso y facturación" → "Modificar
   plan" → Blaze. Pide una tarjeta de pago, pero solo se cobra si de verdad se supera
   la capa gratuita.
2. **Activar la API de Vertex AI** en Google Cloud Console (el mismo proyecto que tu
   Firebase). Ojo: Google renombró este producto a mitad de 2026 — en el buscador de
   arriba de la consola ya no aparece como "Vertex AI", sino como **"Agent Platform
   API"** (o, si buscas por el nombre del servicio, `aiplatform`). Es la misma API de
   siempre por debajo, solo cambió el nombre visible. Búscala y pulsa "Habilitar".
3. **Instalar Node.js** (si no lo tienes) y luego **Firebase CLI**:
   ```
   npm install -g firebase-tools
   firebase login
   ```
   En Windows, si `npm` da un error de que la ejecución de scripts está deshabilitada,
   abre PowerShell como tú (no hace falta administrador) y ejecuta una vez:
   `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` — es el ajuste normal y seguro
   para poder usar herramientas de desarrollo, luego `npm` funciona sin más.
4. **Instalar las dependencias de la función** — antes de desplegar, entra en la
   carpeta `functions/` y ejecuta una vez:
   ```
   cd functions
   npm install
   cd ..
   ```
5. **Desplegar la función**: desde la carpeta donde tienes estos ficheros (con la
   carpeta `functions/` y el fichero `firebase.json` dentro — ambos ya vienen
   incluidos, `firebase.json` es lo que le dice a este comando dónde está la función),
   ```
   firebase use --add        (elige tu proyecto, p. ej. coartadagolf)
   firebase deploy --only functions
   ```
   La primera vez, el propio comando te puede pedir permiso para activar algunas APIs
   adicionales (Cloud Build, Artifact Registry, Eventarc) — acepta, son necesarias
   para poder desplegar cualquier función y no tienen coste por sí solas.
6. **Dar permiso a la función para usar Vertex AI**: Google Cloud Console → "IAM y
   administración" → "IAM". Busca en la lista la cuenta de servicio que termina en
   `@PROYECTO.iam.gserviceaccount.com` o `-compute@developer.gserviceaccount.com`
   (es la identidad con la que corre la función) → lápiz de editar → "Añadir otro rol"
   → busca `aiplatform.user` y elige **"Usuario de Agent Platform"** (mismo rol de
   siempre, "Vertex AI User", con el nombre visible actualizado) → Guardar.
7. **Activar App Check** (la protección para que solo tu propia web pueda llamar a la
   función, no cualquier bot): Firebase Console → "compilación" → "App Check" →
   registra tu app web. Desde agosto de 2026 Firebase solo ofrece **reCAPTCHA
   Enterprise** como proveedor (ya no aparece la v3 clásica) — la clave se crea aparte,
   en Google Cloud Console → "Seguridad" → "reCAPTCHA Enterprise" → "Crear clave",
   tipo **"Sitio web" · Score** (es el equivalente a la v3 de siempre), con el dominio
   de GitHub Pages (`TU-USUARIO.github.io`) en la lista de dominios permitidos. Esa
   pantalla te da un **ID de clave** (site key), un valor público que empieza distinto
   cada vez — vuelve a Firebase App Check y termina el registro con esa clave.
8. **Pegar esa clave** en `firebase-config.js`, sustituyendo
   `"PON_AQUI_TU_CLAVE_DE_RECAPTCHA_V3"` por el valor real (cópiala siempre directamente
   de la consola de Google, nunca de un texto pegado en otro sitio — un solo carácter
   mal copiado, p. ej. una "S" en vez de un "5", hace que la función falle con un error
   de "API key not valid" que cuesta de detectar a simple vista). Vuelve a subir el
   fichero a GitHub. Si lo subes reemplazando el fichero descargado del chat, comprueba
   que el nombre siga siendo exactamente `firebase-config.js` con guion — algunos
   navegadores lo guardan sin el guion al descargarlo, y entonces GitHub acaba creando
   un fichero nuevo (`firebaseconfig.js`) en vez de sustituir el que la web carga de
   verdad; si pasa eso, edita el fichero correcto directamente con el lápiz de GitHub
   en vez de volver a subirlo.
9. **Poner un tope de gasto real** (no solo una alerta), por tranquilidad (dos
   minutos, gratis): Google Cloud Console → "Facturación" → "Presupuestos y alertas"
   → "Crear presupuesto" → elige como ámbito tu proyecto + el servicio "Gemini
   API"/"Vertex AI" → periodo "Mensual" → pon un importe pequeño (por ejemplo 1€) →
   activa el interruptor de **"Tope de gasto" (spend cap)**, no solo la alerta.
   Repite el mismo proceso eligiendo el servicio "Cloud Run functions". A diferencia
   de una alerta normal (que solo avisa), esto bloquea de verdad cualquier uso nuevo
   de ese servicio en cuanto se llega al importe, hasta que tú mismo lo reactives a
   mano desde la consola — el margen de retraso en detectarlo es mínimo, y con el
   coste real de esto (fracciones de céntimo por captura) nunca vais a acercaros ni
   de lejos a 1€ en un mes normal.
10. **Probar**: abre la web, identifícate, ve a la pestaña Rondas — debería aparecer ya
    la tarjeta "Cargar rondas desde una captura". Súbele una foto del marcador de una
    partida: primero te pregunta, de forma simple, si el campo, la barra y la fecha
    detectados son correctos (los puedes corregir ahí mismo); solo después de confirmar
    eso aparece la lista de jugadores, ya en formato compacto (una fila por jugador, con
    un icono ⚠️ si hay posible duplicado y un botón ✓ para aprobar cada uno). Cada fila
    intenta emparejar el nombre detectado con alguien ya registrado (tolera tildes y
    apellidos incompletos, p. ej. "Mario Bedialauneta" reconoce a "Mario Bedia" ya
    existente); si no reconoce a nadie parecido, marca sola el icono 🆕 de "jugador
    nuevo" con el nombre precargado — revisa cada fila antes de aprobarla y, si el
    emparejamiento se equivoca, puedes marcar o desmarcar ese icono a mano.

Nada de esto necesita tocar `firestore.rules` otra vez — la función nueva no lee ni
escribe en las colecciones de siempre (`players`, `rounds`, etc.), solo en una
colección propia de contador (`_screenshotImportUsage`) que ya queda bloqueada para
cualquiera que no sea la propia función, por las mismas reglas que ya tienes.

## El icono al añadir la web a la pantalla de inicio del móvil

Desde el 26/8/2026, la página lleva su propio icono (una bandera de golf sobre fondo verde,
a juego con los colores de la app) para cuando alguien la añade a la pantalla de inicio del
móvil en vez de dejarla como una pestaña más del navegador:

- **Android / Chrome**: al entrar en la web, el navegador suele ofrecer solo "Instalar
  app" o, en el menú (⋮), "Añadir a pantalla de inicio" — aparece ya con este icono.
- **iPhone / Safari**: menú compartir (el icono del cuadrado con la flecha hacia arriba) →
  "Añadir a pantalla de inicio". Verás el mismo icono en la vista previa antes de confirmar.

No hace falta ninguna configuración adicional: basta con que los 6 ficheros de icono
(`manifest.webmanifest`, `favicon.ico`, `icon-192.png`, `icon-512.png`,
`icon-512-maskable.png`, `apple-touch-icon.png`) estén subidos junto a `index.html` en el
mismo repositorio (paso 2 de la Parte 2). Si en el futuro quieres cambiar el diseño del
icono, basta con generar de nuevo esos mismos 6 ficheros (mismos nombres y tamaños) y
volver a subirlos — no hace falta tocar nada más en `index.html`.

## Primer uso

La primera vez que alguien abra el enlace con la base de datos vacía, la app carga
automáticamente todo el historial que ya tenías (tu ficha de jugador, los campos, las
barras y las 155 rondas). A partir de ahí, cada persona que entra elige su nombre (o
crea el suyo si es nuevo) y ya puede añadir sus rondas.

El PIN de administrador sigue siendo `2026` (lo puedes cambiar más adelante desde la
pestaña Admin si quieres). Como novedad, cuando entras en modo administrador, el
importador de CSV te deja elegir **para qué jugador** se importa cada historial — útil
para cargar el histórico de varios amigos reales de una vez, no solo el tuyo.

Desde el 25/8/2026, entrar con el PIN de administrador también hace aparecer una
pestaña **Ryder** más en el menú (solo la ves tú, mientras tengas el PIN metido en ese
dispositivo/navegador) para preparar la Ryder Pucela Cup: monta los dos equipos con
jugadores de la app (su hándicap sube solo del ranking) o invitados sueltos con
hándicap a mano, mete el CR/Slope/Par del campo del torneo, y la app calcula el
hándicap de juego de cada uno y los golpes concedidos en Fourball, Foursome, Greensome
e Individual — los porcentajes de cada formato son editables. Es solo la calculadora de
emparejamientos (como el Excel que preparabais a mano); anotar resultados hoyo a hoyo y
una clasificación en directo queda para una futura actualización.

## Actualizar la web más adelante

Si en el futuro quieres cambiar algo del código (`index.html`), basta con subir la
nueva versión del fichero a GitHub (sustituyendo al anterior) — GitHub Pages la
publica sola en un par de minutos. Los datos (jugadores, rondas, campos) no se ven
afectados, porque viven en Firebase, no en el fichero.

Desde agosto de 2026, `index.html` comprueba solo (cada pocos minutos y al volver a
la pestaña) si hay una versión más nueva publicada, y se recarga sola cuando no hay
nada sin guardar en el formulario de ronda — para evitar que un dispositivo se quede
con código viejo abierto y calcule algo mal, como pasó una vez con Entrepinos. Esto
funciona comparando la constante `APP_VERSION` de dentro del fichero: **si subes tú
mismo/a un cambio a `index.html` sin pasar por mí, acuérdate de cambiar esa línea**
(por ejemplo a la fecha del día) para que los demás dispositivos detecten que hay
algo nuevo.

## Las reglas de Firestore (`firestore.rules`) también pueden cambiar

Si alguna vez sustituyo o amplío `firestore.rules`, hay que volver a copiar su
contenido completo en Firebase → Firestore Database → Reglas → pegar → Publicar
(paso 4 de la Parte 1). No pasa nada si no lo haces enseguida — mientras tanto
seguirán activas las reglas anteriores — pero conviene no dejarlo pasar mucho si el
cambio es por seguridad.

## Sobre el aviso de "secreto expuesto" de GitHub

Si subes este repositorio a GitHub y te avisa de un "possible secret" en
`firebase-config.js`, es el valor `apiKey`. No es un fallo ni hay que sacarlo del
código: las claves web de Firebase están pensadas para ir en el navegador de quien
use la app (así funciona cualquier web con Firebase, no solo esta), y por sí sola no
da acceso a nada — quien de verdad decide qué se puede leer y escribir son las
reglas de Firestore (`firestore.rules`). Puedes marcar ese aviso en GitHub como "Used
in tests" / "Revisado, no es sensible" sin miedo. Si aun así quieres reducir su
utilidad fuera de esta web, puedes ir a Google Cloud Console → APIs y servicios →
Credenciales, abrir esa clave y restringirla por "Referentes HTTP" a tu dominio de
GitHub Pages (`https://TU-USUARIO.github.io/*`) — así, aunque alguien la copie, no
podrá usarla desde otro sitio.

## Si algo no carga

- Si la página se queda en blanco o aparece un aviso de conexión, revisa que
  `firebase-config.js` tenga los valores reales (no los de ejemplo) y que las reglas
  de Firestore se hayan publicado correctamente (paso 4 de la Parte 1).
- Firestore tiene una capa gratuita muy generosa (miles de lecturas/escrituras al día);
  para un grupo de 25-40 amigos no debería suponer ningún coste.
