<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Configuration

Copy `.env.example` to `.env` and set the database connection values for your
environment. `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` and
`CORS_ORIGINS` are required. `PORT` defaults to `3000` and `NODE_ENV` defaults
to `development`. The application validates these values before connecting to
PostgreSQL and before enabling CORS.

The local `.env` file is ignored by Git. Keep credentials there or in your
deployment environment, and never commit real secrets. `.env.example` is only
a template and contains no working credentials.

## Base de datos local con Docker

`docker-compose.yml` levanta PostgreSQL usando los mismos valores de `.env`
(`DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_PORT`), así que no hay que duplicar
credenciales. El puerto del contenedor se publica en el host con `DB_PORT`.

```bash
# 1. Copia el archivo de ejemplo si aún no tienes .env
$ copy .env.example .env        # PowerShell

# 2. Levanta PostgreSQL en segundo plano
$ npm run db:up

# 3. Verifica que esté saludable
$ docker compose ps            # STATE debe ser "healthy"

# 4. Arranca la API (synchronize crea las tablas en desarrollo)
$ npm run start:dev

# 5. Detener la base sin perder los datos
$ npm run db:down
```

Para borrar también los datos: `docker compose down -v` (elimina el volumen
`coursehub-pgdata`).

Si cambiaron las credenciales en `.env` y el contenedor ya existía, hay que
recrear el volumen: `docker compose down -v && npm run db:up`.

### Conexión desde DBeaver

| Campo | Valor |
| --- | --- |
| Motor | PostgreSQL |
| Host | `localhost` |
| Puerto | `DB_PORT` del `.env` (por ejemplo `5434`) |
| Base de datos | `DB_NAME` (`coursehub`) |
| Usuario | `DB_USER` (`postgres`) |
| Contraseña | `DB_PASSWORD` del `.env` |

El host escucha en `localhost`, no dentro del contenedor, por lo que DBeaver
debe conectarse a `localhost:<DB_PORT>`.

## Seguridad de la API

### CORS restringido por entorno

`CORS_ORIGINS` es obligatorio y contiene la lista separada por comas de los
orígenes exactos autorizados para el entorno actual. No se usa `*`.

```dotenv
# Desarrollo: frontend local de Vite y de Angular
CORS_ORIGINS=http://localhost:5173,http://localhost:4200
```

`src/main.ts` pasa esa lista a `app.enableCors()`. El navegador solo permite
leer la respuesta cuando el origen de la petición coincide exactamente con uno
de los valores configurados; cualquier otro origen no recibe las cabeceras
`Access-Control-*` y la petición falla en el cliente. En producción,
`CORS_ORIGINS` debe contener únicamente el dominio del frontend publicado, por
ejemplo `CORS_ORIGINS=https://app.example.com`.

### Límite de solicitudes en `/auth/login`

`ThrottlerModule` aplica un límite global de 100 solicitudes por minuto por
dirección IP. `POST /auth/login` tiene un límite más estricto de **5 intentos
por minuto por IP** mediante `@Throttle({ default: { limit: 5, ttl: 60_000 } })`
en `src/auth/auth.controller.ts`. Al superarlo, la API responde
`429 Too Many Requests` sin ejecutar la validación de credenciales.

El almacenamiento del limitador es en memoria, adecuado para una sola
instancia. Si se despliegan varias réplicas, hay que usar un almacenamiento
compartido (por ejemplo Redis). Detrás de un proxy inverso, configure
`trust proxy` para que el límite se aplique a la IP real del cliente y no a la
del proxy.

### HTTPS/TLS como requisito de producción

**En producción la API debe publicarse únicamente sobre HTTPS/TLS.** No se debe
exponer tráfico HTTP en claro ni aceptar tokens JWT por conexiones sin cifrar.
La terminación TLS se realiza en el proxy inverso o balanceador (Nginx, Caddy,
Traefik o el balanceador del proveedor), que redirige `http://` a `https://`,
presenta un certificado válido y reenvía la petición a Nest por la red interna.
En desarrollo local se permite HTTP sobre `localhost`.

Checklist mínimo de despliegue:

- Certificado TLS válido y renovación automática.
- Redirección permanente de `80` a `443`.
- HSTS habilitado en el proxy.
- `NODE_ENV=production` (desactiva `synchronize`).
- `CORS_ORIGINS` limitado al dominio real del frontend.
- Secretos (`JWT_SECRET`, `DB_PASSWORD`) fuera del repositorio.

## Evidencia Etapa 2: conexión TypeORM por entorno

TypeORM obtiene host, puerto, usuario, contraseña y base de datos desde el
`ConfigService`. `ConfigModule` valida esas variables antes de inicializar la
conexión. Las entidades se cargan con `autoLoadEntities`.

Estudiantes y matrículas usan repositorios TypeORM: al crear un registro se
persiste en PostgreSQL y queda disponible para la relación de matrícula. Una
restricción única en la base de datos y el manejo de conflictos evitan
matrículas duplicadas para el mismo estudiante y curso. La búsqueda de
matrículas usa parámetros SQL enlazados; los listados de cursos y matrículas
validan y limitan los parámetros de paginación.

| Entorno       | `synchronize` | Política                                                                                                                                          |
| ------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `development` | `true`        | Permitido para desarrollo local.                                                                                                                  |
| `production`  | `false`       | No modifica el esquema automáticamente; los cambios requieren migraciones revisadas. Configura `NODE_ENV=production` explícitamente al desplegar. |
| `test`        | `false`       | No sincroniza el esquema automáticamente.                                                                                                         |

`src/config/database.config.spec.ts` verifica los valores de `synchronize` por
entorno y la validación de las variables obligatorias sin conectarse a una base
de datos. La simulación de producción se puede realizar sobre una copia temporal
de `.env`; nunca hace falta modificar ni mostrar el archivo local. Para revisar
el proyecto, ejecuta `npm run build`, `npm test` y `npm run lint`.

No hay migraciones en el repositorio todavía; antes de desplegar cambios de
esquema en producción, hay que crearlas, revisarlas y aplicarlas de forma
controlada. No se debe habilitar `synchronize` en producción.

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Listado navegable de cursos

`GET /courses` acepta `level`, `page`, `limit`, `sortBy` y `order`. La página
predeterminada es 1, el límite predeterminado es 10 y el límite máximo es 50.
Solo se puede ordenar por `id`, `title` o `level` (en orden `ASC` o `DESC`).
La respuesta contiene `items` y metadatos de paginación.

Ejemplo:

```text
GET http://localhost:3000/courses?level=beginner&page=2&limit=5&sortBy=title&order=ASC
```

Si un parámetro no cumple las reglas (por ejemplo `page=0`, `limit=200` o
`sortBy=createdAt`), la API responde con `400 Bad Request`.

## Registro de cuentas

`POST /auth/register` recibe `email` y `password`. El DTO normaliza el correo
(trim y minúsculas), valida que sea un correo válido de hasta 150 caracteres
(el límite de la columna) y la contraseña se conserva
exactamente como se envió y debe tener entre 8 y 72 bytes, compatible con el
límite de bcrypt. El servidor guarda únicamente `password_hash`, calculado con
bcrypt y costo 12. La respuesta `201 Created` incluye `id`, `email` y
`role` y `createdAt`, nunca la contraseña ni su hash. Un correo repetido responde
`409 Conflict`; una solicitud inválida responde `400 Bad Request`.

`POST /auth/login` valida `LoginDto`, recupera explícitamente `passwordHash`
solo para esa operación y compara la contraseña con bcrypt. Solo después de
autenticar correctamente, firma un JWT y responde `200 OK` con `accessToken`
y un objeto `user` que contiene `id`, `email` y `createdAt`; nunca incluye la
contraseña ni su hash. Las credenciales inválidas responden siempre
`401 Unauthorized` con el mismo mensaje genérico y no generan token. Un DTO
inválido responde `400 Bad Request`. La respuesta del login incluye también el
rol de la cuenta.

El payload del JWT contiene `sub` (el id del usuario), su correo normalizado y
su rol. El token está firmado, no cifrado: su payload se puede decodificar, así
que no se deben incluir contraseñas, hashes ni otros datos confidenciales.
`JWT_SECRET` es obligatorio y debe tener al menos 32 caracteres; guárdalo solo
en `.env` local o en el entorno de despliegue. `JWT_EXPIRES_IN` define la
vigencia y usa `15m` por defecto. Los valores de `.env.example` son plantillas,
no secretos reales.

La estrategia `src/auth/strategies/jwt.strategy.ts` usa Passport y extrae el
token desde `Authorization: Bearer <accessToken>`, comprueba la firma y rechaza
tokens expirados. `src/auth/guards/jwt-auth.guard.ts` aplica la autenticación
en los controladores. Sin token, con otro esquema, firma inválida o expiración
responde `401 Unauthorized`. `GET /auth/me` y `POST /courses` requieren JWT;
la creación de cursos además conserva la validación global del
`CreateCourseDto` y responde `400 Bad Request` si el cuerpo es inválido. La
estrategia valida el rol firmado y expone en `req.user` `{ id, email, role }`.

### Roles y autorización

`UserRole` limita los valores a `admin`, `teacher` y `student`. Las cuentas
nuevas reciben `student`, tanto por el valor predeterminado de la columna como
porque el registro no acepta un rol enviado por el cliente. Para la práctica,
asigna los roles únicamente en la base de datos local después de identificar
cuentas concretas:

```sql
UPDATE users SET role = 'admin' WHERE email = 'admin-local@example.test';
UPDATE users SET role = 'teacher' WHERE email = 'teacher-local@example.test';
```

`@Roles()` declara la política de una ruta y `RolesGuard` la aplica después de
`JwtAuthGuard`: un token ausente, inválido o expirado responde `401`; una
identidad válida sin permiso responde `403`. `DELETE /courses/:id` exige el
rol `admin`. `PATCH /courses/:id` admite `admin` o `teacher`; además, el
servicio solo permite que el docente modifique un curso cuyo
`created_by_user_id` coincide con su id autenticado. Un administrador puede
modificar cualquier curso. El id del propietario se toma de `req.user` al crear
el curso, nunca del cuerpo enviado por el cliente. Los cursos anteriores a
esta práctica pueden no tener propietario y no se pueden editar por un
docente hasta asignarles uno de forma controlada.

La identidad mínima que debe exponer la autenticación para estas reglas es
`{ id, role }`: `id` identifica al propietario que se compara con el curso y
`role` decide si puede operar sobre cualquier recurso o si necesita ser su
propietario. Se conserva `email` para identificar la cuenta en el resto de la
API. En producción, los cambios de esquema requieren una migración revisada;
`synchronize` solo está habilitado en desarrollo.

### Tabla de rutas

| Ruta | Acceso actual |
| --- | --- |
| `GET /` | Pública |
| `GET /welcome` | Pública |
| `POST /auth/register` | Pública |
| `POST /auth/login` | Pública, límite de 5 solicitudes por minuto por IP |
| `GET /auth/me` | Requiere JWT |
| `GET /courses` | Pública |
| `GET /courses/:id` | Pública |
| `POST /courses` | Requiere JWT |
| `PATCH /courses/:id` | Administrador o docente propietario |
| `DELETE /courses/:id` | Administrador |
| `GET /students` | Pública |
| `GET /students/:id` | Pública |
| `POST /students` | Pública |
| `PATCH /students/:id` | Pública |
| `DELETE /students/:id` | Pública |
| `PATCH /students/:id/status` | Pública |
| `POST /enrollments` | Pública |
| `GET /enrollments` | Pública |
| `DELETE /enrollments/:id` | Pública |

El registro y el inicio de sesión son públicos porque deben poder usarse antes
de obtener un token. La consulta de cursos también es pública para permitir
explorar el catálogo; crear cursos requiere JWT. Las demás rutas permanecen
públicas hasta que se definan sus requisitos de autorización.

La columna `email` tiene una restricción única en PostgreSQL y `passwordHash`
se mapea a `password_hash` y se excluye de las consultas normales. La sincronización
automática del esquema solo está activa en desarrollo; antes de desplegar el
registro en producción hay que añadir y aplicar una migración revisada para la
tabla `users`.

Ejemplo:

```json
{
  "email": "persona@example.test",
  "password": "Clave-practica-2026"
}
```

Envía el cuerpo con `Content-Type: application/json` (en Postman: **Body** →
**raw** → **JSON**). La contraseña debe tener al menos ocho caracteres; una
clave de seis (`123456`) debe responder `400 Bad Request`.

## Verificación de access tokens

Para obtener un token, registra una cuenta si hace falta y llama a
`POST /auth/login`. Copia el valor `accessToken` de la respuesta en la variable
de tu cliente HTTP; no lo guardes en el código ni en Git. Un JWT válido tiene
tres secciones separadas por puntos. En Postman, configura la autorización como
**Bearer Token** para enviar `Authorization: Bearer <accessToken>`.

Verifica `GET /auth/me` con estos cinco casos: sin encabezado (401), esquema
distinto de Bearer (401), token con firma alterada (401), token expirado (401)
y token válido (200 con `id`, `email` y `role`). Para las acciones sobre cursos,
comprueba la matriz:

| Acción | Resultado |
| --- | --- |
| PATCH o DELETE sin token | 401 |
| PATCH como estudiante | 403 |
| PATCH como docente ajeno | 403 |
| PATCH como docente propietario | 200 |
| PATCH o DELETE como administrador | 200 |
| DELETE como estudiante o docente | 403 |

Para modificar un curso de docente, el propietario debe coincidir con el id del
token; un id de propietario enviado en el cuerpo no participa en la decisión.
`POST /courses` con token válido y cuerpo inválido responde `400`.

Las pruebas automatizadas de `src/auth/auth.controller.spec.ts` y
`src/courses/courses.controller.spec.ts` cubren estos casos. Para entregar
evidencia visual, captura en el cliente HTTP cada solicitud junto con su código
de respuesta y, para el caso exitoso, el cuerpo de respuesta. No incluyas
contraseñas ni tokens reales en las capturas.

Como evidencia de la sesión, toma capturas de: (1) las dependencias Passport en
`package.json`; (2) `JwtPayload` y `AuthenticatedUser`; (3) `JwtStrategy`;
(4) `JwtAuthGuard`; (5) los imports y providers de `AuthModule`; (6)
`GET /auth/me` con JWT válido; (7) `POST /courses` protegido; (8) la respuesta
de login y el token con sus tres segmentos, ocultando su valor; (9) el resultado
de la matriz de autorización de PATCH y DELETE; (10) los cinco resultados de
`/auth/me`; y (11) la tabla de rutas de esta sección. Para los casos 9 y 10, una
captura del reporte de pruebas automatizadas también muestra los resultados sin
revelar tokens.

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Observability

In production applications, observability is essential for understanding how your system behaves, detecting issues early, and maintaining reliable performance.

[NestJS Observe](https://observe.nestjs.com) automatically instruments your NestJS application, giving you deep visibility into your system with minimal setup:

- **Distributed tracing:** Follow requests across services and understand how they flow through your system.
- **Waterfall analysis:** Visualize request execution and identify slow operations, bottlenecks, and unexpected delays.
- **Performance analysis:** Analyze application performance in real time and quickly pinpoint areas that need optimization.
- **Metrics:** Track key application and infrastructure metrics to understand system health and performance trends.
- **Logging:** Centralize and correlate logs with traces and other telemetry to make debugging easier.
- **Error tracking:** Detect errors quickly and investigate their root causes with the surrounding context.
- **SLA monitoring:** Track service-level objectives and identify when your application is approaching or exceeding defined thresholds.
- **Alarms and alerts:** Set up alerts for critical errors, performance degradation, SLA violations, and other anomalies so your team can react quickly.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Auto-instrument your application with [NestJS Observer](https://observer.nestjs.com). Distributed tracing, metrics, and logging made easy. Error tracking and performance monitoring for your NestJS applications.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
