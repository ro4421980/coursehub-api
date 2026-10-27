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
environment. `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` and `DB_PASSWORD` are
required. `PORT` defaults to `3000` and `NODE_ENV` defaults to `development`.
The application validates these values before connecting to PostgreSQL.

The local `.env` file is ignored by Git. Keep credentials there or in your
deployment environment, and never commit real secrets. `.env.example` is only
a template and contains no working credentials.

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
`createdAt`, nunca la contraseña ni su hash. Un correo repetido responde
`409 Conflict`; una solicitud inválida responde `400 Bad Request`.

`POST /auth/login` valida `LoginDto`, recupera explícitamente `passwordHash`
solo para esa operación y compara la contraseña con bcrypt. Solo después de
autenticar correctamente, firma un JWT y responde `200 OK` con `accessToken`
y un objeto `user` que contiene `id`, `email` y `createdAt`; nunca incluye la
contraseña ni su hash. Las credenciales inválidas responden siempre
`401 Unauthorized` con el mismo mensaje genérico y no generan token. Un DTO
inválido responde `400 Bad Request`.

El payload del JWT contiene únicamente `sub` (el id del usuario) y su correo
normalizado. El token está firmado, no cifrado: su payload se puede decodificar,
así que no se deben incluir contraseñas, hashes ni otros datos confidenciales.
`JWT_SECRET` es obligatorio y debe tener al menos 32 caracteres; guárdalo solo
en `.env` local o en el entorno de despliegue. `JWT_EXPIRES_IN` define la
vigencia y usa `15m` por defecto. Los valores de `.env.example` son plantillas,
no secretos reales. En esta etapa aún no se protegen otras rutas con Bearer
tokens.

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

`GET /auth/me` requiere `Authorization: Bearer <accessToken>`. El servidor
verifica firma y vencimiento antes de responder con `id` y `email`; un
encabezado ausente o un token alterado responde `401 Unauthorized`. Esta
demostración no aplica autenticación a las demás rutas.

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
