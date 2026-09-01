# Contexto del proyecto: NonFap

## Objetivo

NonFap es una web privada/informal para un reto entre amigos llamado **“Septiembre sin Fap 2026”**.

La aplicación debe ser simple, fácil de desplegar y mantener.

No queremos incorporar frameworks innecesarios.

## Stack actual

Frontend:

* HTML
* CSS
* JavaScript vanilla

Backend/BaaS:

* Supabase

Supabase se utiliza para:

* Authentication
* PostgreSQL
* Row Level Security
* Storage para fotos de perfil

No existe un backend Node.js desplegado.

El proyecto debe seguir pudiendo desplegarse como una web estática en:

* Vercel
* Netlify
* GitHub Pages

Evitar agregar React, Vue, Next.js, Express o NestJS salvo que exista una razón muy fuerte y se solicite explícitamente.

---

# Concepto de la aplicación

El reto consiste en pasar todo septiembre de 2026 sin masturbarse.

Todos los participantes comienzan como activos.

Si un participante pierde el reto, puede registrar su caída indicando:

* fecha
* motivo/descripción
* link opcional

Al registrar una caída deja de aparecer entre los participantes activos y pasa a la sección:

**Soldados caídos**

La información es compartida entre todos los usuarios mediante Supabase.

---

# Participantes

Actualmente existen 18 participantes:

1. Bistocco
2. Ruben
3. Dromuegue
4. El León 🦁 Salvaje
5. Pancho
6. Pelado
7. Negro
8. Gordo Alejo
9. Machi
10. Fefi
11. Tutu
12. Oso
13. Gringo
14. Pablaca
15. Flavio
16. Tomite
17. Maxi
18. Yuyo

Los participantes son creados inicialmente mediante:

`seed-users.mjs`

El seed debe ser idempotente:

* si un usuario ya existe, no debe duplicarlo;
* debe continuar con los siguientes;
* debe poder ejecutarse nuevamente cuando se agreguen nuevos participantes.

---

# Autenticación

Cada participante tiene:

* username fijo
* contraseña
* display_name editable
* avatar/foto editable

Ejemplo:

username:
`bistocco`

display_name:
`Bistocco`

El username funciona como identidad permanente del usuario.

NO debe poder modificarse desde la aplicación.

El `display_name` sí puede modificarse.

Aunque Supabase Auth utiliza email internamente, la aplicación oculta este detalle.

Ejemplo interno:

`bistocco@nonfap.local`

El usuario solamente ve:

Usuario:
`bistocco`

Contraseña:
`********`

---

# Permisos

## Usuario no autenticado

Puede:

* ver ranking
* ver participantes activos
* ver soldados caídos
* ver nombres
* ver fotos de perfil
* ver información pública de una caída

No puede:

* modificar perfiles
* registrar caídas
* cambiar contraseña
* subir fotografías

## Usuario autenticado

Puede modificar únicamente su propia cuenta.

Puede:

* registrar su propia caída
* cambiar su display_name
* cambiar su contraseña
* subir/cambiar su avatar
* cerrar sesión

No puede:

* modificar otros usuarios
* registrar una caída para otro usuario
* cambiar fotos de otros
* cambiar nombres de otros

Estas restricciones deben estar garantizadas mediante **Supabase RLS**, no solamente mediante validaciones del frontend.

Nunca confiar únicamente en JavaScript para autorización.

---

# Modelo conceptual de datos

## profiles

Representa información pública del participante.

Campos esperados similares a:

* id / user_id
* username
* display_name
* avatar_url
* created_at

`user_id` debe estar relacionado con `auth.users.id`.

---

## falls

Representa una caída en el reto.

Campos similares a:

* id
* user_id
* fall_date
* reason
* link
* created_at

Un usuario solamente debe poder crear/modificar registros correspondientes a su propio `user_id`.

Para Septiembre Sin Fap debería existir conceptualmente una única caída principal por usuario.

Si se implementan futuros retos, considerar extender el modelo con algo como:

`challenge_id`

pero NO hacerlo todavía salvo que una feature lo necesite.

---

# Supabase Storage

Existe o debe existir un bucket destinado a avatars.

Los usuarios:

* pueden leer avatars
* solamente pueden subir/modificar su propia foto

Evitar usar service_role desde el navegador.

---

# Seguridad

NUNCA exponer:

`SUPABASE_SERVICE_ROLE_KEY`

en:

* app.js
* supabase-config.js
* HTML
* repositorio público
* Vercel frontend
* Netlify frontend

La service role solamente puede utilizarse localmente en scripts administrativos como:

`seed-users.mjs`

La frontend solamente utiliza:

* Supabase URL
* Publishable/Anon Key

Las operaciones deben estar protegidas mediante RLS.

---

# Diseño

Mantener el diseño actual.

Identidad:

* nombre: NonFap
* estética negra + naranja
* inspiración visual similar a PornHub
* humorística pero usable
* responsive

Priorizar mobile-first porque probablemente la mayoría acceda desde celular.

No rediseñar completamente la UI sin solicitarlo.

---

# Secciones principales

La página actualmente debe mantener conceptos similares a:

## Header

NonFap

Septiembre sin Fap 2026

Indicador del día actual del reto.

---

## Ranking / Sobrevivientes

Lista de participantes que todavía no registraron una caída.

Idealmente mostrar:

* posición
* avatar
* display_name
* días sobrevividos

---

## Soldados caídos

Participantes que perdieron.

Mostrar:

* avatar
* display_name
* fecha de caída
* día del reto
* motivo/descripción
* link si existe

---

## Login

Login mediante:

* username
* password

No pedir email al usuario.

---

## Mi perfil

Visible solamente estando autenticado.

Permite:

* cambiar display_name
* subir/cambiar avatar
* cambiar contraseña

No permite cambiar username.

---

## Registrar caída

Visible solamente para el usuario autenticado.

Campos:

* fecha
* motivo/descripción
* link opcional

Debe registrar la caída solamente para el usuario autenticado.

---

# Comportamiento temporal

El reto corresponde a:

1 de septiembre de 2026
hasta
30 de septiembre de 2026

El sistema puede calcular automáticamente:

* día actual del reto
* días sobrevividos
* día de caída

Ejemplo:

1 septiembre = Día 1
2 septiembre = Día 2
...
30 septiembre = Día 30

Evitar hardcodear estados individuales de los usuarios en el frontend.

El estado debe derivarse de los datos de Supabase.

---

# Archivos relevantes

El proyecto puede contener aproximadamente:

`index.html`
`styles.css`
`app.js`
`supabase-config.js`
`seed-users.mjs`
`supabase-setup.sql`
`claves-iniciales.txt`
`README.md`

Respetar esta estructura simple en la medida de lo posible.

No crear una estructura de build compleja para cambios pequeños.

---

# Filosofía para nuevas features

Antes de implementar una nueva feature:

1. Revisar cómo funciona actualmente el proyecto.
2. Identificar los archivos afectados.
3. Mantener JavaScript vanilla.
4. Reutilizar Supabase cuando sea necesario.
5. Preservar RLS.
6. Evitar romper datos existentes.
7. Mantener compatibilidad mobile.
8. No agregar dependencias salvo necesidad real.
9. No modificar el diseño general si la feature no lo necesita.
10. Mantener el README actualizado si cambia configuración, DB o despliegue.

---

# Forma de trabajar esperada

Cuando te pida una feature:

1. Analiza primero el código existente.
2. Explica brevemente qué vas a modificar.
3. Implementa el cambio directamente.
4. Si requiere cambios SQL, crea una migración o bloque SQL separado.
5. No reemplaces toda la aplicación innecesariamente.
6. Conserva las features existentes.
7. Verifica errores básicos y sintaxis.
8. Si introduces una nueva configuración, documentala en README.
9. Si hay implicaciones de seguridad con Supabase/RLS, indícalas.

Priorizar cambios pequeños, incrementales y mantenibles.

---

# Posibles features futuras

Estas son ideas, NO deben implementarse automáticamente:

* comentarios sobre soldados caídos
* reacciones/emojis
* timeline de eventos
* estadísticas del reto
* cantidad de sobrevivientes
* porcentaje de supervivencia
* ranking por días sobrevividos
* achievements
* perfil público
* historial de ediciones
* admin
* confirmación de caída
* recuperación de contraseña
* distintos retos por mes/año
* invitaciones
* modo espectador
* compartir resultados
* contador hasta finalizar septiembre

Implementarlas solamente cuando sean solicitadas.

---

# Regla principal

El proyecto debe seguir siendo:

**simple + divertido + seguro + fácil de desplegar.**

No sobrearquitecturar.


---

# Reglas vigentes para futuras features

* Las features nuevas no deben romper la funcionalidad existente de usuarios.
* Si una feature requiere cambios en DB, hacerlos de forma compatible con datos existentes:
  * usar migraciones idempotentes cuando sea posible;
  * preferir columnas nullable para datos nuevos opcionales;
  * evitar cambios destructivos o renombres directos sin plan;
  * mantener RLS como fuente real de autorizacion.
* Para Storage, separar responsabilidades cuando cambian permisos, tamanos o tipos permitidos.
  Ejemplo actual: `avatars` para fotos de perfil y `covers` para portadas con GIF.
* Mantener una seccion `Novedades` para anunciar cambios visibles a los usuarios.
* El tono de la web puede ser adulto, privado, absurdo y guarango/rioplatense, sin copiar literalmente el estilo de ningun creador real.
