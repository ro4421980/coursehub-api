# Etapa 4 · Semana 12 — CourseHub API

## Pruebas unitarias que protegen reglas de negocio

| Campo | Valor |
| --- | --- |
| Proyecto | CourseHub API |
| Etapa | 4 — Semana 12 |
| Stack | NestJS 12 · TypeScript 6 · Vitest 4 |
| Caso de uso protegido | `UpdateCourseUseCase` |
| Adaptador protegido | `CoursesController` |
| Repositorio | `C:\Users\anco_\OneDrive\Documentos\Universidad\ServidorWeb\coursehub-api` |
| Fecha de evidencia | 23 de noviembre de 2026 |

---

## 1. Resumen ejecutivo

Se implementó y consolidó una suite unitaria para la regla de negocio más
sensible de `courses`: **quién puede actualizar un curso**. La suite demuestra
con un repositorio simulado que:

- un docente propietario puede actualizar;
- un docente ajeno **no** puede;
- un estudiante **nunca** puede, aunque su id coincida con el propietario;
- un administrador puede actualizar cualquier curso;
- un curso inexistente produce un error de recurso no encontrado;
- una actualización parcial conserva los campos no enviados;
- el `id` y el propietario no se pueden cambiar desde el cuerpo de la petición.

Además, el controlador se prueba como adaptador puro: se verifica que delega el
`id` de la ruta, el DTO y la identidad autenticada (`request.user`) al caso de
uso, y que no acepta identidad ni propiedad enviadas por el cliente.

**Resultado medido**

| Métrica | Resultado |
| --- | --- |
| Suite unitaria completa (`npm test`) | **62 pruebas · 15 archivos · 7,97 s** |
| Evidencia focalizada de la Semana 12 | **13 pruebas · 2 archivos · 3,89 s** |
| Tiempo real de las 13 pruebas | **60 ms** |
| Cobertura de `update-course.use-case.ts` | **100 % statements / 100 % lines** |
| Cobertura de `courses.controller.ts` | **100 % statements / 100 % lines** |
| PostgreSQL, Docker o red | **No usados por la suite unitaria** |
| Demostración de mutación | **1 prueba falla al debilitar la regla; se restaura y vuelve a 62/62** |

La suite es rápida, determinista y legible porque cada prueba construye su
propio estado, usa fixtures fijos y verifica decisiones de negocio: errores,
persistencia y ausencia de escrituras, no solo líneas ejecutadas.

---

## 2. Alcance obligatorio y evidencia

| Requisito de la consigna | Dónde se cumple | Estado |
| --- | --- | --- |
| Pruebas unitarias de un caso de uso de negocio con repositorio simulado | `src/courses/application/use-cases/update-course.use-case.spec.ts` con `InMemoryCourseRepository` | Cumplido |
| Incluye éxito, recurso inexistente y una regla de autorización o integridad rechazada | Éxito: “updates and persists…” · Inexistente: “reports a missing course…” · Autorización: “rejects a teacher who does not own…”, “rejects a student…” · Integridad: “cannot change the id or the owner…” | Cumplido |
| Prueba de controlador que verifica delegación de identificador, DTO e identidad autenticada | `src/courses/courses.controller.spec.ts` | Cumplido |
| Las pruebas no usan PostgreSQL ni red | Repositorio en memoria y casos de uso simulados; sin `supertest` en `src/**/*.spec.ts`; las pruebas HTTP se movieron a `test/*.e2e-spec.ts` | Cumplido |
| El README indica el comando para ejecutar las pruebas | Sección **Pruebas** del `README.md`: `npm test` y comando focalizado | Cumplido |

---

## 3. La regla que se protege

`UpdateCourseUseCase` concentra la decisión de negocio. El controlador no
decide autorización: solo traduce HTTP al caso de uso.

```ts
const isAdmin = input.actor.role === UserRole.ADMIN;
const isOwner = course.createdByUserId === input.actor.id;
const isTeacher = input.actor.role === UserRole.TEACHER;

if (!isAdmin && !(isTeacher && isOwner)) {
  throw new CourseAccessDeniedError();
}
```

Matriz de decisión:

| Rol del actor | ¿Es propietario? | ¿Puede actualizar? | Resultado esperado |
| --- | :---: | :---: | --- |
| `admin` | Sí | Sí | Actualiza y persiste |
| `admin` | No | Sí | Actualiza y persiste |
| `teacher` | Sí | Sí | Actualiza y persiste |
| `teacher` | No | **No** | `CourseAccessDeniedError`; no guarda |
| `student` | Sí | **No** | `CourseAccessDeniedError`; no guarda |
| Cualquiera | Curso inexistente | **No** | `CourseNotFoundError`; no guarda |

La regla también protege la integridad del recurso: después de autorizar, solo
se copian `title` y `level`. `id` y `createdByUserId` son datos de identidad y
no pueden modificarse con un `PATCH`, aunque un llamador omita la validación del
DTO.

---

## 4. Diseño de las pruebas del caso de uso

### 4.1 Repositorio simulado

`InMemoryCourseRepository` implementa el puerto real
`CourseRepository` con un arreglo en memoria:

- no importa TypeORM, `pg` ni Nest;
- implementa `findById`, `save`, `create`, `delete` y `findPage`;
- cada prueba crea una instancia nueva con un curso fijo;
- `save` falla si se intenta guardar un curso que no existe, lo que evita
  falsos positivos;
- `vi.spyOn(repository, 'save')` permite comprobar que una operación rechazada
  **no escribió**.

Se eligió un *fake* en memoria, y no un mock de todas las funciones, porque
permite verificar el efecto real de la regla: el estado del repositorio después
de la operación. El espía se usa solo para la garantía negativa (“no se llamó a
`save`”).

### 4.2 Casos y comportamiento protegido

| # | Prueba | Escenario | Decisión verificada |
| --- | --- | --- | --- |
| 1 | `updates and persists the course when the teacher owns it` | Docente propietario actualiza título y nivel | Éxito, `save` una vez y estado persistido |
| 2 | `keeps fields that the partial update does not mention` | Docente envía solo `title` | Actualización parcial sin borrar `level` |
| 3 | `rejects a teacher who does not own the course` | Docente ajeno intenta actualizar | `CourseAccessDeniedError`, sin escritura y estado intacto |
| 4 | `rejects a student even when the student id matches the owner` | Estudiante con el mismo id del propietario | El rol se evalúa además de la propiedad |
| 5 | `allows an admin to update a course owned by someone else` | Administrador sobre curso ajeno | Excepción legítima de la regla |
| 6 | `reports a missing course before applying the authorization rule` | Id `999` | `CourseNotFoundError` con el id correcto, sin escritura |
| 7 | `cannot change the id or the owner through the update payload` | Cuerpo hostil con `id` y `createdByUserId` | La integridad del recurso prevalece |

Las pruebas 3, 4 y 7 son las que convierten la suite en una red de seguridad de
negocio, no en una simple ejecución de líneas.

---

## 5. Prueba del controlador

El controlador se instancia directamente con casos de uso simulados. No se
levanta un servidor HTTP, no se abre un puerto y no se usa `supertest`.

| # | Prueba | Qué verifica |
| --- | --- | --- |
| 1 | `delegates the parsed route id to GetCourseUseCase` | El `id` de la ruta llega como número al caso de uso |
| 2 | `delegates the list query without rewriting it` | El DTO de consulta se delega sin transformaciones ocultas |
| 3 | `updates with the route id, the DTO and the authenticated actor` | `courseId`, `changes` y `actor` llegan exactamente al caso de uso |
| 4 | `does not let the body override identity or ownership on PATCH` | `id`, `createdByUserId` y `role` del cuerpo se descartan; manda `request.user` |
| 5 | `creates the course with the authenticated creator, not with body data` | El propietario se toma de la identidad autenticada |
| 6 | `delegates DELETE to the use case with the route id` | El `id` de la ruta se delega en el caso de uso de borrado |

La prueba 4 es la evidencia explícita de **delegación de identidad**: aunque el
cuerpo incluya `role: admin` o `createdByUserId: 999`, el controlador envía el
usuario autenticado y solo los campos permitidos del DTO. Para lograrlo de forma
defensa en profundidad, el controlador usa `pickCourseChanges()`, que copia
únicamente `title` y `level` cuando están presentes.

---

## 6. Frontera entre prueba unitaria e integración

La Semana 12 exige pruebas sin PostgreSQL ni red. Para que esa afirmación sea
verificable, la suite unitaria se separó de las pruebas HTTP:

| Tipo | Ubicación | Comando | Usa red/DB |
| --- | --- | --- | --- |
| Unitaria | `src/**/*.spec.ts` | `npm test` | No |
| Integración HTTP | `test/*.e2e-spec.ts` | `npm run test:e2e` | Red local en proceso; `app.e2e-spec.ts` puede requerir PostgreSQL |

Cambios realizados para mantener la frontera:

1. Las pruebas HTTP de `CoursesController` que estaban en
   `src/courses/courses.controller.spec.ts` se conservaron en
   `test/courses.e2e-spec.ts`.
2. Las pruebas HTTP de `AuthController` se movieron a
   `test/auth.e2e-spec.ts`.
3. El nuevo `src/courses/courses.controller.spec.ts` es unitario puro.
4. La suite unitaria ya no importa `supertest` ni arranca una aplicación Nest
   con servidor.

No se perdió cobertura: las 28 pruebas HTTP movidas siguen pasando con
`vitest --config vitest.config.e2e.ts`. Simplemente ya no cuentan como
evidencia unitaria de la Semana 12.

---

## 7. Ejecución y resultados

### 7.1 Suite unitaria completa

```powershell
PS C:\...\coursehub-api> npm test

 Test Files  15 passed (15)
      Tests  62 passed (62)
   Start at  13:29:14
   Duration  7.97s (transform 1.35s, setup 0ms, import 33.65s, tests 3.02s, environment 6ms)
```

### 7.2 Evidencia focalizada de la Semana 12

```powershell
PS C:\...\coursehub-api> npm run test:etapa4

> coursehub-api@0.0.1 test:etapa4
> vitest run src/courses/application/use-cases/update-course.use-case.spec.ts src/courses/courses.controller.spec.ts

 Test Files  2 passed (2)
      Tests  13 passed (13)
   Start at  13:34:19
   Duration  3.89s (transform 471ms, setup 0ms, import 4.68s, tests 60ms, environment 1ms)
```

Interpretación: **13 pruebas en 60 ms de ejecución real**. El tiempo restante
es el arranque de Vitest y la transformación de TypeScript, no la lógica de
negocio.

### 7.3 Cobertura de los archivos protegidos

```text
File                            | % Stmts | % Branch | % Funcs | % Lines
--------------------------------|---------|----------|---------|--------
courses.controller.ts           |     100 |       75 |     100 |     100
update-course.use-case.ts       |     100 |    91.66 |     100 |     100
```

La cobertura global de la suite unitaria es 80,66 % de statements. No se usa
como meta por sí sola: lo relevante es que las decisiones de la regla tengan
aserciones de comportamiento y que la mutación sea detectada.

---

## 8. Demostración: cambiar la regla y ver fallar la prueba

La demo está automatizada en `docs/etapa-4-demo.mjs` y se ejecuta con:

```powershell
npm run demo:etapa4
```

El script hace cinco pasos y **restaura el archivo en un bloque `finally`**:

1. ejecuta la suite completa en verde;
2. debilita temporalmente la regla de propiedad;
3. ejecuta el spec del caso de uso y exige que falle;
4. restaura el archivo original;
5. vuelve a ejecutar la suite completa y exige que pase.

### 8.1 Mutación aplicada

```diff
- if (!isAdmin && !(isTeacher && isOwner)) {
+ if (!isAdmin && !isTeacher) { // MUTACION TEMPORAL
```

La mutación elimina `isOwner`: cualquier docente pasa la autorización, sin
importar quién creó el curso.

### 8.2 Fallo observado

```text
❯ src/courses/application/use-cases/update-course.use-case.spec.ts (7 tests | 1 failed)
     × rejects a teacher who does not own the course

FAIL  UpdateCourseUseCase > rejects a teacher who does not own the course
AssertionError: promise resolved "{ id: 5, title: 'Cambio ajeno', …(2) }" instead of rejecting

- Expected
+ Received

- Error { "message": "rejected promise" }
+ {
+   "createdByUserId": 2,
+   "id": 5,
+   "level": "beginner",
+   "title": "Cambio ajeno",
+ }
```

El resultado es exactamente el peligro que se quiere evitar: el docente ajeno
(id 8) modificó el título del curso del propietario (id 2) y el repositorio
guardó el cambio.

### 8.3 Restauración

```powershell
=== 4. Regla restaurada ===
=== 5. Suite completa restaurada en verde ===

 Test Files  15 passed (15)
      Tests  62 passed (62)
   Start at  13:29:26
   Duration  7.98s
```

### 8.4 ¿Qué quedaría desprotegido si se borrara esa prueba?

Si se elimina `rejects a teacher who does not own the course`, la mutación
anterior **pasaría inadvertida**: las otras 6 pruebas del caso de uso seguirían
en verde. En concreto, quedarían sin red de seguridad:

- **Escalada horizontal de privilegios:** un docente podría editar cursos de
  otros docentes. El `RolesGuard` solo comprueba que el rol sea `teacher`; la
  decisión de propiedad vive en el caso de uso.
- **Integridad de los cursos ajenos:** títulos y niveles podrían alterarse sin
  ser el propietario, con impacto directo en el catálogo.
- **Trazabilidad:** el curso conservaría `createdByUserId` del propietario
  original, pero con contenido modificado por otra persona; la auditoría
  quedaría engañosa.
- **Regresión silenciosa:** un refactor que sustituya
  `!(isTeacher && isOwner)` por `!isTeacher`, o que elimine `isOwner`, no sería
  detectado por las demás pruebas.

La prueba no verifica “que se ejecute una línea”: verifica que **no se escriba**
en el repositorio y que el estado permanezca intacto cuando la identidad no
autoriza. Esa es la diferencia entre cobertura y protección.

---

## 9. Matriz de trazabilidad completa

| Requisito | Prueba(s) | Archivo |
| --- | --- | --- |
| Éxito del caso de uso | `updates and persists…`, `keeps fields…` | `update-course.use-case.spec.ts` |
| Recurso inexistente | `reports a missing course…` | `update-course.use-case.spec.ts` |
| Autorización rechazada | `rejects a teacher…`, `rejects a student…` | `update-course.use-case.spec.ts` |
| Integridad rechazada | `cannot change the id or the owner…` | `update-course.use-case.spec.ts` |
| Delegación de identificador | `delegates the parsed route id…`, `delegates DELETE…` | `courses.controller.spec.ts` |
| Delegación de DTO | `updates with the route id, the DTO…`, `delegates the list query…` | `courses.controller.spec.ts` |
| Identidad autenticada | `updates with…`, `does not let the body override…`, `creates…` | `courses.controller.spec.ts` |
| Sin PostgreSQL ni red | Repositorio en memoria + casos de uso simulados | Ambos specs |
| Comando en README | `npm test` y comando focalizado | `README.md` |
| Demostración de fallo | Regla mutada → 1 fallo → restauración → 62/62 | `docs/etapa-4-demo.mjs` |

---

## 10. Guion de exposición (7 minutos)

| Tiempo | Acción | Mensaje clave |
| --- | --- | --- |
| 0:00–1:00 | Muestra `src/courses/application/use-cases/update-course.use-case.ts` | “La regla de propiedad está en el caso de uso, no en el controlador”. |
| 1:00–2:30 | Abre `update-course.use-case.spec.ts` y la matriz de decisión | “Siete pruebas: éxito, parcial, docente ajeno, estudiante, admin, inexistente e integridad”. |
| 2:30–3:30 | Señala `InMemoryCourseRepository` y `vi.spyOn(save)` | “Repositorio simulado: verifico estado y también que no se escriba”. |
| 3:30–4:30 | Abre `courses.controller.spec.ts` | “El controlador delega id, DTO e identidad; no decide autorización”. |
| 4:30–5:15 | Ejecuta `npm test` | “62 pruebas en menos de 8 segundos, sin base de datos ni red”. |
| 5:15–6:30 | Ejecuta `npm run demo:etapa4` | “Al quitar `isOwner`, falla exactamente la prueba de docente ajeno; restauro y vuelve a verde”. |
| 6:30–7:00 | Cierra con la sección 8.4 | “Sin esa prueba, la escalada horizontal pasaría inadvertida”. |

No hace falta mostrar tokens, credenciales ni datos reales: toda la evidencia es
local, sintética y determinista.

---

## 11. Reproducción desde cero

Requisitos: Node.js ≥ 24.20 (definido en `package.json`) y dependencias
instaladas.

```powershell
cd C:\Users\anco_\OneDrive\Documentos\Universidad\ServidorWeb\coursehub-api
npm install

# Suite unitaria completa (sin PostgreSQL ni red)
npm test

# Solo la evidencia de la Semana 12
npm run test:etapa4

# Cobertura
npm run test:cov

# Demostración de mutación con restauración automática
npm run demo:etapa4

# Integración HTTP (Semana 13; puede requerir PostgreSQL)
npm run test:e2e
```

Verificaciones adicionales ejecutadas:

```text
npm run build  → OK
npm run lint   → OK
```

---

## 12. Limitaciones y siguiente etapa

- La suite unitaria **no** prueba transacciones, concurrencia, restricciones de
  PostgreSQL ni migraciones. Eso corresponde a la integración de la Semana 13.
- `test/app.e2e-spec.ts` arranca `AppModule` completo y puede necesitar la base
  de datos local; por eso no forma parte de `npm test`.
- La cobertura global incluye módulos antiguos con menor cobertura. La métrica
  relevante de esta entrega es la cobertura y, sobre todo, la detección de
  mutaciones en la regla protegida.
- El script de demo restaura el archivo en `finally`; no se debe interrumpir con
  `Ctrl+C` mientras la mutación está activa. Si ocurriera, basta con ejecutar
  `git checkout -- src/courses/application/use-cases/update-course.use-case.ts`.
- No se inventaron reglas nuevas (por ejemplo, rechazar un `PATCH` vacío): la
  suite protege el comportamiento definido en la Etapa 3.

---

## 13. Lista de evidencia para entregar

- [x] Spec del caso de uso con repositorio simulado.
- [x] Casos de éxito, recurso inexistente, autorización e integridad.
- [x] Spec unitario del controlador con id, DTO e identidad.
- [x] Suite unitaria sin `supertest`, PostgreSQL ni red.
- [x] Comando `npm test` documentado en el README.
- [x] Salida real de la suite completa (62/62).
- [x] Salida real de la suite focalizada (13/13).
- [x] Mutación, fallo observado y restauración (62/62).
- [x] Explicación de qué quedaría desprotegido sin la prueba.
- [x] `npm run build` y `npm run lint` sin errores.
- [ ] Capturas de pantalla para el aula virtual (opcional; el log de
  `docs/etapa-4-demo-output.txt` sirve como evidencia textual).

---

## Anexo A. Archivos modificados o creados

| Archivo | Cambio |
| --- | --- |
| `src/courses/application/use-cases/update-course.use-case.spec.ts` | Suite unitaria reescrita y ampliada a 7 casos. |
| `src/courses/courses.controller.spec.ts` | Nuevo spec unitario puro de 6 casos. |
| `src/courses/application/use-cases/update-course.use-case.ts` | Copia explícita de `title`/`level`; identidad inmutable. |
| `src/courses/courses.controller.ts` | `pickCourseChanges()` para no reenviar campos ajenos al DTO. |
| `test/courses.e2e-spec.ts` | Pruebas HTTP de cursos conservadas para la Semana 13. |
| `test/auth.e2e-spec.ts` | Pruebas HTTP de autenticación movidas fuera de la suite unitaria. |
| `docs/etapa-4-demo.mjs` | Demo reproducible de mutación con restauración. |
| `docs/etapa-4-demo-output.txt` | Salida real de la demo. |
| `docs/etapa-4.md` | Este informe en Markdown. |
| `docs/etapa-4.html` / `docs/etapa-4.pdf` | Versión formateada para entrega. |
| `README.md` | Sección de pruebas y comandos. |
| `package.json` | Script `demo:etapa4`. |

## Anexo B. Nombres completos de las pruebas de la Semana 12

**`update-course.use-case.spec.ts`**

1. `updates and persists the course when the teacher owns it`
2. `keeps fields that the partial update does not mention`
3. `rejects a teacher who does not own the course`
4. `rejects a student even when the student id matches the owner`
5. `allows an admin to update a course owned by someone else`
6. `reports a missing course before applying the authorization rule`
7. `cannot change the id or the owner through the update payload`

**`courses.controller.spec.ts`**

1. `delegates the parsed route id to GetCourseUseCase`
2. `delegates the list query without rewriting it`
3. `updates with the route id, the DTO and the authenticated actor`
4. `does not let the body override identity or ownership on PATCH`
5. `creates the course with the authenticated creator, not with body data`
6. `delegates DELETE to the use case with the route id`
