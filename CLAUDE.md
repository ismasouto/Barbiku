# Barbiku × Refloresta — Instrucciones del proyecto para Claude Code

> Proyecto de hackathon. Lee este documento entero antes de escribir código.
> Las marcas **Barbiku** (aseguradora de mascotas) y **Refloresta** (ONG de reforestación) son **ficticias**: no uses logos, colores ni textos de marcas reales.

---

## 1. Qué estamos construyendo

Una app móvil en **Expo** llamada **Barbiku**, que simula la app de una aseguradora de salud para mascotas. Funciona así:

1. El cliente da de alta un seguro médico para su mascota (p. ej. "Luna").
2. Justo después del alta, la app le muestra una oferta **muy llamativa**: plantar un árbol en honor a su mascota con Refloresta pagando **20 € + comisión de Stripe**.
3. Como ventaja exclusiva por comprar, el cliente recibe una **chapa para el collar hecha con materiales ecológicos, con el nombre de su mascota grabado**.
4. El pago es una **compra única gestionada con RevenueCat**, que cobra a través de **Stripe** (RevenueCat Web Billing).
5. Después de comprar, el cliente ve un **mensaje de agradecimiento emotivo** que le haga sentir que está ayudando.
   **Nunca se le muestra información sobre el estado del árbol** (ni "pendiente", ni "plantado", ni ubicación, ni seguimiento).
6. Cada compra genera un pedido en una base de datos (Supabase). Hay un panel interno sencillo donde el equipo de Barbiku ve qué chapas grabar y enviar, y Refloresta ve qué nombres poner en las placas de los árboles.

**Quién gana qué:**
- **Refloresta** recibe 20 € netos por árbol.
- **Barbiku** gana reputación y fidelización de sus clientes.
- **El cliente** se queda con la chapa y la satisfacción de haber ayudado.
- **RevenueCat** gestiona la compra, el entitlement y los eventos.

---

## 2. Alcance

### Dentro del alcance (MVP)
- App Expo (TypeScript) con un flujo simulado de la aseguradora: login falso, mis mascotas y alta de seguro.
- Pantalla de oferta tras el alta, con vista previa en vivo de la chapa.
- Compra única `refloresta` mediante RevenueCat + Stripe (modo test).
- Comprobación del entitlement `refloresta` y desbloqueo del encargo de la chapa.
- Pantalla de agradecimiento con tarjeta compartible.
- Estado de la **chapa** visible para el cliente (recibido → grabando → enviado). La chapa sí tiene estado; el árbol no.
- Webhook de RevenueCat → función de Supabase que marca el pedido como pagado.
- Panel interno (ruta protegida) con dos pestañas: **Chapas** (Barbiku) y **Árboles** (Refloresta).

### Fuera del alcance
- Pagos reales (todo en modo test o sandbox).
- Lógica real de seguros (precios, coberturas y pólizas son datos de mentira).
- Seguimiento del árbol para el cliente (**prohibido por requisito**, ver §9).
- Varias compras por mascota y reembolsos parciales.

---

## 3. Stack

| Capa | Tecnología |
|---|---|
| App | Expo (SDK actual) + TypeScript + Expo Router |
| Estilos | StyleSheet o NativeWind (elige uno y sé consistente) |
| Animaciones | `react-native-reanimated` + `lottie-react-native` (o animaciones propias si Lottie da problemas) |
| Pagos | `react-native-purchases` (RevenueCat) + RevenueCat Web Billing con Stripe |
| Navegador in-app | `expo-web-browser` + `expo-linking` (deep link de vuelta) |
| Compartir | `react-native-view-shot` + `expo-sharing` |
| Backend | Supabase (Postgres + Edge Functions) |
| Estado local | Zustand o React Context + `@react-native-async-storage/async-storage` |

> **Importante:** antes de implementar la integración con RevenueCat, consulta la documentación oficial actual (o el MCP/skills del RevenueCat AI Toolkit si están instalados) para confirmar los nombres exactos de métodos, eventos de webhook y el formato de los Web Purchase Links. Si algo de este documento contradice la documentación oficial, manda la documentación, y avísanos del cambio.

---

## 4. Por qué Stripe y no App Store / Google Play

Lo que se compra es un **servicio del mundo real** (plantar un árbol) y un **objeto físico** (la chapa). Las tiendas de apps no permiten cobrar bienes físicos con su sistema de compras integrado, así que el cobro va por **RevenueCat Web Billing (Stripe)**. Así además evitamos la comisión del 15–30 % de las tiendas.

### Cálculo del precio (20 € netos para Refloresta)

Tarifa de Stripe supuesta para tarjetas estándar del EEE: **1,5 % + 0,25 €**. **Hay que verificarla en la cuenta de Stripe** y dejarla como constantes configurables.

```
precio = (20 + 0,25) / (1 − 0,015) = 20,558… → 20,56 €
comprobación: 20,56 × 0,015 + 0,25 = 0,558 € de comisión → 20,00 € netos
```

- Precio del producto: **20,56 €** (EUR).
- RevenueCat es gratis hasta 2.500 $ de ingresos mensuales, así que no afecta en el hackathon.
- Crea `src/config/pricing.ts` con `NET_AMOUNT = 20`, `STRIPE_PCT = 0.015`, `STRIPE_FIXED = 0.25` y una función `grossPrice()`. En la UI muestra "20,56 €" con el desglose "20 € para Refloresta + 0,56 € de gestión del pago".
  El precio real que se cobra lo define el producto en RevenueCat/Stripe; la constante sirve para mostrar el desglose y debe coincidir.

---

## 5. Configuración externa (la hace el equipo; tú documenta los pasos en el README)

### RevenueCat
1. Proyecto "Barbiku" con una app de tipo **Web (Web Billing)** conectada a Stripe en **modo test**.
2. Producto de compra única (non-consumable / one-time): identificador `refloresta`, nombre visible "Refloresta", precio **20,56 €**.
3. Entitlement con identificador **`refloresta`** asociado a ese producto.
4. Offering `default` con un package que contenga el producto.
5. Crear un **Web Purchase Link** para esa offering.
6. Webhook apuntando a la Edge Function `revenuecat-webhook` de Supabase, con una cabecera de autorización secreta.

### Supabase
1. Crear el proyecto, ejecutar `supabase/migrations/001_init.sql` (ver §8) y desplegar las Edge Functions.

### Variables de entorno (`.env`, con un `.env.example` en el repo)
```
EXPO_PUBLIC_REVENUECAT_API_KEY=        # clave pública de la app Web Billing
EXPO_PUBLIC_RC_WEB_PURCHASE_LINK=      # URL base del Web Purchase Link
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_APP_SCHEME=barbiku
# Solo en Edge Functions (secrets de Supabase, nunca en la app):
RC_WEBHOOK_AUTH=
ADMIN_PASSCODE=
SUPABASE_SERVICE_ROLE_KEY=
```

---

## 6. Estructura del proyecto

```
barbiku/
├─ app/                          # Expo Router
│  ├─ _layout.tsx
│  ├─ index.tsx                  # login falso
│  ├─ (tabs)/home.tsx            # mis mascotas + banner de recuerdo
│  ├─ (tabs)/perfil.tsx
│  ├─ alta/index.tsx             # formulario de alta del seguro
│  ├─ alta/confirmado.tsx        # póliza creada → abre la oferta
│  ├─ refloresta/oferta.tsx      # pantalla de marketing (modal pantalla completa)
│  ├─ refloresta/envio.tsx       # confirmar grabado + dirección
│  ├─ refloresta/procesando.tsx  # espera del entitlement tras volver de Stripe
│  ├─ refloresta/gracias.tsx     # agradecimiento + tarjeta compartible
│  ├─ mascota/[id].tsx           # ficha de la mascota (insignia + estado de la chapa)
│  └─ admin/index.tsx            # panel interno con código de acceso
├─ src/
│  ├─ components/ (ChapaPreview, ArbolAnimado, CTAButton, ShareCard…)
│  ├─ lib/revenuecat.ts          # configure, getCustomerInfo, openPurchaseLink, hasRefloresta
│  ├─ lib/supabase.ts
│  ├─ lib/engraving.ts           # validación y normalización del nombre grabado
│  ├─ config/pricing.ts
│  ├─ store/ (usuario, mascotas, pólizas)
│  └─ data/mock.ts
├─ supabase/
│  ├─ migrations/001_init.sql
│  └─ functions/ (revenuecat-webhook, admin-orders, admin-update-order)
├─ .env.example
└─ README.md
```

---

## 7. Flujo y pantallas en detalle

### 7.1 Login falso (`app/index.tsx`)
- Campo de email y botón "Entrar". No hay autenticación real.
- Al entrar, genera o recupera un `appUserId` estable (UUID guardado en AsyncStorage) y llama a `Purchases.configure({ apiKey, appUserID })`.
- Botón oculto (mantener pulsado el logo) para "Reiniciar demo": borra AsyncStorage y genera un usuario nuevo.

### 7.2 Alta del seguro (`app/alta/index.tsx`)
- Campos: nombre de la mascota, especie (perro/gato), raza, fecha de nacimiento y plan:
  - **Barbiku 80**: reembolso del 80 %, hasta 3.000 €/año. Precio ficticio: 29,90 €/mes.
  - **Barbiku Ilimitado**: reembolso del 80 % sin límite anual. Precio ficticio: 39,90 €/mes.
- "Contratar" crea la póliza **en local** (store + AsyncStorage) y navega a `alta/confirmado`.

### 7.3 Confirmación → oferta (`alta/confirmado.tsx` → `refloresta/oferta.tsx`)
- Muestra "✅ Luna ya está protegida" durante ~1,5 s con una animación breve.
- Después abre automáticamente `refloresta/oferta` como **modal de pantalla completa**.

### 7.4 Pantalla de oferta — MARKETING AGRESIVO (`refloresta/oferta.tsx`)
La pantalla más importante de la demo. Tiene que impactar.

**Composición, de arriba abajo:**
1. **Hero animado:** un brote que crece hasta convertirse en árbol (Lottie o Reanimated), con el nombre de la mascota apareciendo en las hojas o en una placa.
2. **Titular grande y personalizado:**
   > **"Luna merece dejar huella en el planeta 🌳"**
3. **Subtítulo emocional:**
   > "Planta hoy un árbol autóctono en su honor con Refloresta. Solo una vez, para siempre."
4. **Etiqueta de oferta de bienvenida** (destacada, color de acento):
   > "🎁 EXCLUSIVO AL DAR DE ALTA · Chapa ecológica grabada con su nombre GRATIS"
5. **Vista previa en vivo de la chapa** (`ChapaPreview`): chapa circular con textura de madera o corcho, el nombre de la mascota grabado (en mayúsculas) y una hojita. Debe girar suavemente o tener un brillo animado.
6. **Lista de beneficios** con iconos:
   - 🌱 Un árbol autóctono plantado en honor a Luna
   - 🏷️ Chapa para collar de materiales ecológicos con su nombre grabado
   - 💚 El 100 % de los 20 € va a Refloresta
   - 📸 Tarjeta "Luna ha plantado un árbol" para compartir
7. **Contador de prueba social:** "🌍 Ya se han plantado X árboles por mascotas Barbiku".
   **X debe salir de la base de datos** (número de pedidos pagados + una base inicial configurable para la demo, `SOCIAL_PROOF_BASE` en config). No te inventes cifras en el código fuera de esa constante.
8. **Precio claro:** "**20,56 €** · pago único" con el desglose pequeño debajo.
9. **CTA principal** grande, ancho completo, color verde intenso, con un pulso sutil:
   > **"🌳 Plantar el árbol de Luna"**
10. **Opción secundaria** visible pero discreta: "Ahora no".

**Límites (obligatorios, el marketing agresivo no puede ser engañoso):**
- El botón "Ahora no" siempre está visible y es pulsable. Nada de ocultar el cierre ni de retrasar su aparición.
- Sin cuentas atrás falsas ni escasez inventada ("solo quedan 3"). La urgencia legítima es que la chapa de regalo es exclusiva del momento del alta.
- Sin frases que culpabilicen al que dice que no ("No, no me importa el planeta").
- El precio total se ve antes de pagar.

**Si el cliente dice "Ahora no":**
- Se cierra el modal.
- Durante 7 días aparece en `home` un banner de recuerdo: "🌱 Luna aún no tiene su árbol. ¿Lo plantamos?". Se puede cerrar con una X y no vuelve a salir para esa mascota.

### 7.5 Confirmar grabado y envío (`refloresta/envio.tsx`)
- **Nombre a grabar:** viene prerrellenado con el nombre de la mascota y se puede editar. Reglas en `src/lib/engraving.ts`:
  - Máximo 12 caracteres; se guarda en MAYÚSCULAS.
  - Solo letras (incluidas Ñ y tildes), números, espacio y guion.
  - Filtro básico de palabras ofensivas (lista local en español). Si salta: "Ese nombre no se puede grabar, prueba con otro".
  - La vista previa de la chapa se actualiza mientras se escribe.
- **Dirección de envío:** nombre, calle, CP, ciudad y provincia. Prerrellena con datos ficticios del perfil.
- Al pulsar "Continuar al pago":
  1. Inserta en Supabase un pedido con `status = 'pending_payment'` (ver §8).
  2. Abre el Web Purchase Link de RevenueCat con `expo-web-browser`, añadiendo el `appUserId` según el formato oficial y, si se admite, una URL de vuelta con deep link `barbiku://refloresta/procesando`.

### 7.6 Procesando (`refloresta/procesando.tsx`)
- Se muestra al volver de Stripe, ya sea por deep link o porque se cerró el navegador.
- Llama a `Purchases.getCustomerInfo()` (invalidando la caché si hace falta) y comprueba:
  ```ts
  customerInfo.entitlements.active["refloresta"] !== undefined
  ```
- Reintenta cada 2 s durante un máximo de 30 s, con la animación del árbol de fondo y el texto "Plantando la semilla…".
- **Si se activa el entitlement:** marca la mascota como "Guardiana del Bosque" en el store local y navega a `gracias`.
- **Si no se activa en 30 s:** "No hemos podido confirmar el pago. Si se ha completado, se activará en unos minutos." Botones: "Reintentar" y "Volver".
- El pedido lo marca como pagado **el webhook**, no la app (ver §10). La app solo lee.

### 7.7 Agradecimiento (`refloresta/gracias.tsx`)
Objetivo: que el cliente **sienta que ha ayudado**. **Sin ningún dato sobre el estado del árbol.**

1. Confeti de hojas y el árbol completamente crecido con la placa "LUNA".
2. Titular: **"¡Gracias! Luna acaba de hacer el mundo un poco más verde 💚"**
3. Texto: "Gracias a ti, Refloresta plantará un árbol autóctono en honor a Luna. Es un regalo que seguirá creciendo durante años, mucho después de hoy."
4. Bloque de impacto **cualitativo** (sin cifras inventadas): "Tu árbol dará sombra y refugio a la fauna, protegerá el suelo y ayudará a recuperar nuestros bosques."
5. Tarjeta de la chapa: "🏷️ Tu chapa ecológica con **LUNA** grabado ya está en camino. La recibirás en 7–10 días."
6. **Tarjeta compartible** (`ShareCard`, capturada con view-shot): foto o avatar de la mascota, "Luna ha plantado un árbol 🌳", logos ficticios de Barbiku y Refloresta. Botón "Compartir".
7. Botón "Volver a mi mascota".

**Prohibido en esta pantalla y en toda la app:** "árbol pendiente", "árbol plantado el…", mapas, coordenadas, fotos del árbol real, barras de progreso del árbol o cualquier "seguimiento".

### 7.8 Ficha de la mascota (`mascota/[id].tsx`)
- Insignia **"🌳 Guardiana del Bosque"** si tiene el entitlement (o el flag local de esa mascota).
- Sección "Tu chapa": estado `Recibido → Grabando → Enviado`, leído de Supabase con el `order_id` de esa mascota. Es lo único con estado visible.
- Volver a ver o compartir la tarjeta de agradecimiento.
- **No hay ninguna sección sobre el árbol** salvo la insignia y el mensaje de que plantó uno.

### 7.9 Panel interno (`admin/index.tsx`)
- Acceso con un código (`ADMIN_PASSCODE`) validado por la Edge Function `admin-orders`. Nunca uses la service role key desde la app.
- **Pestaña Chapas (equipo Barbiku):** lista de pedidos `paid` con nombre a grabar, dirección y estado de la chapa; botones para pasar a "Grabando" y a "Enviado" (`admin-update-order`).
- **Pestaña Árboles (Refloresta):** lista de pedidos `paid` mostrando **solo** el nombre de la placa, la especie de la mascota, la provincia y la fecha. Sin email ni dirección completa del cliente, por privacidad. Botón "Marcar plantado", que es **solo interno** y nunca se refleja en la app del cliente.
- Totales arriba: árboles financiados y € para Refloresta (pagados × 20 €).

---

## 8. Modelo de datos (`supabase/migrations/001_init.sql`)

```sql
create table refloresta_orders (
  id uuid primary key default gen_random_uuid(),
  app_user_id text not null,              -- appUserID de RevenueCat
  pet_local_id text not null,             -- id de la mascota en la app
  pet_name text not null,
  pet_species text not null check (pet_species in ('perro','gato')),
  engraving_text text not null check (char_length(engraving_text) <= 12),
  ship_name text not null,
  ship_street text not null,
  ship_postal_code text not null,
  ship_city text not null,
  ship_province text not null,
  amount_gross numeric(10,2) not null default 20.56,
  amount_net_refloresta numeric(10,2) not null default 20.00,
  status text not null default 'pending_payment'
    check (status in ('pending_payment','paid','refunded','cancelled')),
  chapa_status text not null default 'recibido'
    check (chapa_status in ('recibido','grabando','enviado')),
  tree_planted boolean not null default false,   -- SOLO uso interno
  rc_transaction_id text unique,                 -- idempotencia del webhook
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

-- Un pedido pagado por mascota
create unique index one_paid_order_per_pet
  on refloresta_orders (app_user_id, pet_local_id)
  where status = 'paid';

create table webhook_events (
  id text primary key,          -- id del evento de RevenueCat
  type text not null,
  payload jsonb not null,
  received_at timestamptz not null default now()
);

-- Vista para el contador de prueba social (sin datos personales)
create view public_stats as
  select count(*)::int as trees_funded
  from refloresta_orders where status = 'paid';
```

**RLS:**
- `anon` puede hacer **insert** en `refloresta_orders` solo con `status = 'pending_payment'`, y **select** solo de las columnas que necesita la app (`id, pet_local_id, chapa_status, status`) filtrando por su `app_user_id`. Para la demo vale pasar el `app_user_id` como filtro; documenta que en producción iría con autenticación real.
- **Nadie desde la app** puede leer `tree_planted` ni actualizar `status`.
- `public_stats` es legible por `anon`.

---

## 9. Requisitos de producto innegociables

1. **Cero información del estado del árbol para el cliente.** Ni en la UI, ni en notificaciones, ni en la API que consume la app (la columna `tree_planted` no se expone a `anon`).
2. El cliente **sí** ve el estado de la **chapa**.
3. El alta del seguro **nunca** depende del pago de Refloresta: si el pago falla, la póliza sigue creada.
4. Una compra de Refloresta por mascota.
5. Todo el texto de la UI va en **español de España**.
6. El marketing es agresivo **pero honesto** (§7.4).

---

## 10. Webhook de RevenueCat (`supabase/functions/revenuecat-webhook`)

1. Comprueba la cabecera `Authorization` contra `RC_WEBHOOK_AUTH`. Si no coincide, responde 401.
2. Guarda el evento en `webhook_events`. Si el `id` ya existe, responde 200 y no hagas nada más (idempotencia).
3. Si el evento es una compra única del producto `refloresta` (confirma el tipo exacto en la documentación; previsiblemente `NON_RENEWING_PURCHASE`, y también `INITIAL_PURCHASE` por si acaso):
   - Busca el pedido más reciente con `app_user_id = event.app_user_id` y `status = 'pending_payment'`.
   - Actualízalo a `status = 'paid'`, `paid_at = now()`, `rc_transaction_id = event.transaction_id`.
   - Si no hay pedido pendiente, registra el aviso en logs y responde 200 igualmente.
4. Si es un reembolso o cancelación de ese producto (`CANCELLATION` u otro tipo equivalente; verifícalo): pasa el pedido a `status = 'refunded'`.
5. Responde siempre 200 cuando el evento se haya procesado o descartado conscientemente, para que RevenueCat no reintente sin fin.

Para pruebas locales, añade el script `scripts/send-test-webhook.ts`, que manda un payload de ejemplo a la función.

---

## 11. Diseño visual

- **Paleta:** verde bosque `#1F6F43`, verde brote `#7BC96F`, crema `#FFF8EC`, tierra `#8B5E3C` y un acento cálido para las etiquetas de oferta (`#FF7A45`).
- **Tipografía:** sans redondeada y amable (p. ej. Nunito o Poppins con `expo-font`). Titulares grandes, en negrita.
- **Chapa:** círculo de unos 120 px, con degradado de madera o corcho, borde con anilla y texto grabado (sombra interior para simular el grabado).
- Microanimaciones en botones, en la entrada de pantallas y en el árbol. Todo debe verse bien en un iPhone y en un Android de tamaño medio.
- Respeta la accesibilidad: contraste suficiente, `accessibilityLabel` en los botones de icono y que las animaciones no impidan pulsar.

---

## 12. Casos límite

| Caso | Comportamiento |
|---|---|
| El usuario cierra Stripe sin pagar | `procesando` agota el tiempo y muestra el mensaje con "Reintentar"; el pedido queda en `pending_payment` |
| Ya pagó por esta mascota | En la oferta, el CTA cambia a "Luna ya tiene su árbol 💚" y queda desactivado |
| Nombre ofensivo o demasiado largo | Error en línea y no deja continuar |
| Webhook duplicado | Se ignora por el `id` del evento |
| El webhook llega antes de volver a la app | Sin problema: la app solo lee el entitlement |
| Sin conexión | Mensaje claro; el alta del seguro (local) funciona igual |
| Reembolso | El pedido pasa a `refunded`; la insignia desaparece si el entitlement deja de estar activo |

---

## 13. Datos de demo

- `src/data/mock.ts`: usuario "Lucía", una mascota ya asegurada ("Toby", perro) sin árbol, para enseñar el banner de recuerdo.
- `SOCIAL_PROOF_BASE = 1240` en config (base de demo para el contador; documenta que es ficticia).
- Tarjeta de prueba de Stripe: `4242 4242 4242 4242`.

### Guion de la demo (2 minutos)
1. Login → home con Toby y el banner de recuerdo.
2. Alta de "Luna" → "Luna ya está protegida" → se abre la oferta a pantalla completa.
3. Enseñar la chapa con LUNA en vivo y el contador → "Plantar el árbol de Luna".
4. Confirmar el grabado → Stripe test → volver → "Plantando la semilla…" → gracias, con confeti → compartir la tarjeta.
5. Ficha de Luna: insignia y chapa "Recibido".
6. Panel admin: el pedido aparece en Chapas y en Árboles; pasar la chapa a "Grabando" y ver que se refleja en la app. Marcar el árbol como plantado y comprobar que **no** cambia nada para el cliente.

---

## 14. Orden de trabajo sugerido

1. Esqueleto de Expo + Router + tema visual + datos mock.
2. Login falso, home y alta de seguro (flujo completo sin pagos).
3. Pantalla de oferta con `ChapaPreview` y animaciones (con datos mock).
4. Pantallas de envío y gracias (simulando la compra con un flag de desarrollo `DEV_FAKE_PURCHASE=true`).
5. Supabase: migración, RLS y lectura del contador.
6. RevenueCat: `configure`, apertura del Web Purchase Link, `procesando` con comprobación del entitlement.
7. Edge Function del webhook + script de prueba.
8. Panel admin + Edge Functions de admin.
9. Pulido, casos límite y README con todos los pasos de configuración.

## 15. Criterios de aceptación

- [ ] Se puede completar el guion de la demo de principio a fin con Stripe en modo test.
- [ ] `entitlements.active["refloresta"]` desbloquea la insignia y el estado de la chapa.
- [ ] El webhook pasa el pedido de `pending_payment` a `paid` y es idempotente.
- [ ] Ninguna pantalla, texto ni respuesta de API para el cliente revela el estado del árbol.
- [ ] El precio mostrado (20,56 €) coincide con el del producto en RevenueCat y deja 20 € netos según `pricing.ts`.
- [ ] La pantalla de oferta tiene un "Ahora no" siempre visible y no usa urgencia falsa.
- [ ] README con instalación, variables de entorno y configuración de RevenueCat, Stripe y Supabase paso a paso.
- [ ] `npx tsc --noEmit` sin errores.
