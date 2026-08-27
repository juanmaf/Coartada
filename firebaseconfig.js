// Rellena este fichero con la configuración de TU proyecto de Firebase.
// La obtienes en la consola de Firebase: Configuración del proyecto (⚙️) → General →
// "Tus apps" → app web → "Config" (o al crear la app web por primera vez).
//
// Es un objeto público (no es un secreto): identifica tu proyecto, no da acceso por sí solo.
// El acceso real lo controlan las reglas de Firestore (ver firestore.rules).
//
// Sigue SETUP.md paso a paso para crear el proyecto y generar estos valores.

window.HCP_FIREBASE_CONFIG = {
  apiKey: "AIzaSyCcNF9fIUJVZzakEaivriI7_qFLAaftsSg",
  authDomain: "coartadagolf.firebaseapp.com",
  projectId: "coartadagolf",
  storageBucket: "coartadagolf.firebasestorage.app",
  messagingSenderId: "795795380487",
  appId: "1:795795380487:web:02a284e60eff50f974cda2"
};

// Clave pública de reCAPTCHA Enterprise para Firebase App Check (ver SETUP.md, Parte 3) —
// protege la única función de backend del proyecto ("Cargar rondas desde una captura") para
// que solo tu propia página, cargada de verdad en un navegador, pueda usarla — no sirve para
// nada más y, como el resto de este fichero, no es un secreto que haya que esconder.
// (Se llama "_V3" por el nombre de la variable, pero desde agosto de 2026 Firebase pide la
// clave de reCAPTCHA Enterprise en vez de la reCAPTCHA v3 clásica — ver SETUP.md, paso 6.)
// Mientras siga con el valor de ejemplo de abajo, la tarjeta "Cargar rondas desde una captura"
// se queda oculta sola (sin romper nada más de la app) — rellénala solo cuando hayas seguido
// la Parte 3 de SETUP.md.
window.HCP_RECAPTCHA_SITE_KEY = "6Lci9ZstAAAAANxwuweKmSAL87MhR2EhVGRhXldt";
