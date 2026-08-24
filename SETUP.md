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
2. Sube estos 4 ficheros al repositorio (botón **"Add file" → "Upload files"**,
   arrastrándolos):
   - `index.html`
   - `seed-data.js`
   - `firebase-config.js` (con tus valores ya rellenados del paso anterior)
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

## Primer uso

La primera vez que alguien abra el enlace con la base de datos vacía, la app carga
automáticamente todo el historial que ya tenías (tu ficha de jugador, los campos, las
barras y las 155 rondas). A partir de ahí, cada persona que entra elige su nombre (o
crea el suyo si es nuevo) y ya puede añadir sus rondas.

El PIN de administrador sigue siendo `2026` (lo puedes cambiar más adelante desde la
pestaña Admin si quieres). Como novedad, cuando entras en modo administrador, el
importador de CSV te deja elegir **para qué jugador** se importa cada historial — útil
para cargar el histórico de varios amigos reales de una vez, no solo el tuyo.

## Actualizar la web más adelante

Si en el futuro quieres cambiar algo del código (`index.html`), basta con subir la
nueva versión del fichero a GitHub (sustituyendo al anterior) — GitHub Pages la
publica sola en un par de minutos. Los datos (jugadores, rondas, campos) no se ven
afectados, porque viven en Firebase, no en el fichero.

## Si algo no carga

- Si la página se queda en blanco o aparece un aviso de conexión, revisa que
  `firebase-config.js` tenga los valores reales (no los de ejemplo) y que las reglas
  de Firestore se hayan publicado correctamente (paso 4 de la Parte 1).
- Firestore tiene una capa gratuita muy generosa (miles de lecturas/escrituras al día);
  para un grupo de 25-40 amigos no debería suponer ningún coste.
