# Etapa 3 · Semana 11 — CourseHub API

Avance de arquitectura mantenible y comportamiento transversal.

## 1. Alcance obligatorio y dónde está

| Requisito                                                          | Implementación                                                                                                   |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| Middleware de registro que no guarda secretos ni cuerpos sensibles | `src/common/middleware/request-logger.middleware.ts`                                                             |
| Errores con forma consistente y sin trazas internas                | `src/common/filters/all-exceptions.filter.ts`                                                                    |
| Caso de uso separado del controlador                               | `src/courses/application/use-cases/update-course.use-case.ts` (y los demás casos de `courses`)                   |
| Contrato de repositorio pequeño + adaptador TypeORM                | `src/courses/application/ports/course.repository.ts` y `src/courses/infrastructure/typeorm-course.repository.ts` |
| Autorización de propiedad junto a la regla de negocio              | `UpdateCourseUseCase.execute()`                                                                                  |
| Componentes transversales aplicados una sola vez                   | `src/app.module.ts` (`APP_FILTER` y `configure()`)                                                               |

## 2. Dónde vive cada responsabilidad

```text
src/courses/
├── courses.controller.ts                 # HTTP: rutas, pipes, guards, DTOs
├── courses.module.ts                     # composición: puerto -> adaptador
├── application/
│   ├── ports/
│   │   └── course.repository.ts          # contrato pequeño (5 operaciones)
│   └── use-cases/
│       ├── list-courses.use-case.ts
│       ├── get-course.use-case.ts
│       ├── create-course.use-case.ts
│       ├── update-course.use-case.ts     # regla de negocio + propiedad
│       └── delete-course.use-case.ts
├── domain/
│   ├── course.ts                         # modelo sin TypeORM ni HTTP
│   └── course.errors.ts                  # errores de negocio
└── infrastructure/
    └── typeorm-course.repository.ts      # adaptador TypeORM

src/entity/course.entity.ts               # mapeo TypeORM (detalle de persistencia)
```

Flujo de una petición `PATCH /courses/:id`:

```text
HTTP request
  -> RequestLoggerMiddleware        (metadatos, sin body ni secretos)
  -> JwtAuthGuard / RolesGuard      (identidad y rol)
  -> ParseIntPipe / ValidationPipe  (id y DTO)
  -> CoursesController              (traduce a llamada de caso de uso)
  -> UpdateCourseUseCase            (busca, valida propiedad, actualiza)
  -> CourseRepository (puerto)      (contrato de aplicación)
  -> TypeOrmCourseRepository        (SQL/TypeORM)
  -> AllExceptionsFilter            (traduce errores a la forma común)
```

El caso de uso no importa Express ni TypeORM; solo conserva los decoradores de
inyección de dependencias de NestJS. Se puede leer y probar con un repositorio
en memoria, como hace
`src/courses/application/use-cases/update-course.use-case.spec.ts`.

## 3. Contrato de error

Todas las respuestas de error tienen esta forma:

```json
{
  "statusCode": 404,
  "error": "Not Found",
  "message": "Course 999999 not found",
  "path": "/courses/999999",
  "timestamp": "2026-11-21T20:04:35.637Z",
  "requestId": "demo-no-existe"
}
```

Reglas:

- Los errores de validación conservan el arreglo de mensajes de
  `ValidationPipe`.
- Los errores de negocio (`COURSE_NOT_FOUND`, `COURSE_ACCESS_DENIED`) se
  traducen a `404` y `403` únicamente en el filtro global.
- Cualquier `5xx` responde siempre `"message": "Internal server error"`.
- La traza (`stack`) se escribe solo en el log del servidor; nunca en la
  respuesta HTTP.
- `requestId` se toma de `x-request-id` (si es seguro) o se genera con UUID.

## 4. Registro seguro

Ejemplo real de una línea de log:

```json
{
  "event": "http_request",
  "requestId": "demo-prohibido",
  "method": "PATCH",
  "path": "/courses/4",
  "statusCode": 403,
  "durationMs": 4
}
```

El middleware registra únicamente método, ruta sin query string, estado,
duración y `requestId`. No lee ni escribe:

- cuerpos de solicitud o respuesta;
- cabeceras (`Authorization`, cookies, etc.);
- query string;
- contraseñas, tokens o datos personales.

## 5. Demostración (máximo 8 minutos)

### Preparación

1. Configura `.env` y arranca la API:

   ```powershell
   npm run start:dev
   ```

2. Registra tres cuentas de práctica con `POST /auth/register`:

   | Correo                       | Rol final |
   | ---------------------------- | --------- |
   | `owner.teacher@example.test` | `teacher` |
   | `other.teacher@example.test` | `teacher` |
   | `admin.etapa3@example.test`  | `admin`   |

   Si las cuentas ya existen, el registro responde `409 Conflict`; en ese caso
   continúa directamente con el inicio de sesión. La contraseña de práctica
   usada en la guía es `CourseHub-2026!`.

   Las cuentas nuevas se crean como `student`. Asigna los roles en la base
   local antes de la demo:

   ```sql
   UPDATE users SET role = 'teacher' WHERE email = 'owner.teacher@example.test';
   UPDATE users SET role = 'teacher' WHERE email = 'other.teacher@example.test';
   UPDATE users SET role = 'admin'   WHERE email = 'admin.etapa3@example.test';
   ```

3. Inicia sesión con las tres cuentas y guarda sus `accessToken`. Con el token
   del docente propietario crea un curso:

   ```text
   POST /courses
   Authorization: Bearer <ownerToken>
   Content-Type: application/json

   { "title": "Arquitectura mantenible", "level": "advanced" }
   ```

   Anota el `id` devuelto (por ejemplo `4`).

### Las cuatro solicitudes

| #   | Caso                   | Solicitud                                                          | Resultado esperado                                                             |
| --- | ---------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| 1   | Correcta               | `PATCH /courses/4` con `ownerToken` y `{ "title": "Actualizado" }` | `200 OK` con el curso actualizado                                              |
| 2   | Identificador inválido | `PATCH /courses/abc` con `ownerToken`                              | `400 Bad Request`, `message: "Validation failed (numeric string is expected)"` |
| 3   | Recurso inexistente    | `PATCH /courses/999999` con `ownerToken`                           | `404 Not Found`, `message: "Course 999999 not found"`                          |
| 4   | Prohibida              | `PATCH /courses/4` con `otherToken`                                | `403 Forbidden`, `message: "You can only update your own courses"`             |

Las cuatro respuestas de error deben mostrar exactamente los mismos campos
(`statusCode`, `error`, `message`, `path`, `timestamp`, `requestId`) y ninguna
propiedad `stack`.

Respuestas observadas con la API en ejecución:

```text
1. 200 OK
{"id":4,"title":"Arquitectura mantenible (actualizado)","level":"advanced","createdByUserId":6}

2. 400 Bad Request
{"statusCode":400,"error":"Bad Request","message":"Validation failed (numeric string is expected)","path":"/courses/abc","timestamp":"2026-11-21T20:04:35.662Z","requestId":"demo-id-invalido"}

3. 404 Not Found
{"statusCode":404,"error":"Not Found","message":"Course 999999 not found","path":"/courses/999999","timestamp":"2026-11-21T20:04:35.637Z","requestId":"demo-no-existe"}

4. 403 Forbidden
{"statusCode":403,"error":"Forbidden","message":"You can only update your own courses","path":"/courses/4","timestamp":"2026-11-21T20:04:35.707Z","requestId":"demo-prohibido"}
```

El identificador de cada respuesta también aparece en la cabecera
`x-request-id` y en la línea de log correspondiente.

También puedes usar `docs/etapa-3.http` desde VS Code (extensión REST Client) o
Postman. En PowerShell, evita comillas anidadas guardando el cuerpo JSON en un
archivo y usando `--data-binary "@archivo.json"` con `curl.exe`.

### Recorrido de código para la exposición

1. **HTTP**: `src/courses/courses.controller.ts` — solo rutas, guards, pipes y
   traducción al caso de uso.
2. **Regla de negocio**: `src/courses/application/use-cases/update-course.use-case.ts`
   — búsqueda, `CourseNotFoundError`, comparación de propietario y rol, y
   actualización.
3. **Persistencia**: `src/courses/infrastructure/typeorm-course.repository.ts`
   — `findAndCount`, `findOneBy`, `save`, `delete` y el mapeo TypeORM. La
   entidad `src/entity/course.entity.ts` también es un detalle de persistencia.
4. **Contrato**: `src/courses/application/ports/course.repository.ts` — la
   interfaz que el caso de uso conoce.
5. **Transversal**: `src/app.module.ts` — middleware y filtro registrados una
   sola vez.

## 6. Verificación

```powershell
npm run build
npm test
npm run lint
```

La suite incluye pruebas de:

- el middleware (no registra body, cabeceras, query string ni secretos);
- el filtro (forma común, `404`/`403` de negocio y `500` sin traza);
- el caso de uso de actualización con un repositorio en memoria (propietario,
  docente ajeno, estudiante, administrador y curso inexistente);
- el controlador con los cuatro casos de la demo y la forma del error.

## 7. Limpieza de los datos de práctica

Las cuentas y el curso usados en la demo son datos locales. Si quieres
eliminarlos después de la exposición:

```sql
DELETE FROM courses WHERE id = 4;
DELETE FROM users
WHERE email IN (
  'owner.teacher@example.test',
  'other.teacher@example.test',
  'admin.etapa3@example.test'
);
```

