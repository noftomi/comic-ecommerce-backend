# Setup de base de datos — PostgreSQL con Docker

## Qué se hizo

Se conectó el login del frontend con el backend configurando la base de datos PostgreSQL mediante Docker.

### Archivos creados o modificados

| Archivo | Cambio |
|---|---|
| `docker-compose.yml` | PostgreSQL 16 con volumen persistente |
| `prisma.config.ts` | URL de conexión para Prisma v7 (dotenv + defineConfig) |
| `prisma/schema.prisma` | Constraints únicos en CartItem y Review |
| `prisma/migrations/` | Dos migraciones: init + unique constraints |
| `src/controllers/authController.js` | Driver adapter PrismaPg requerido por Prisma v7 |
| `.env.example` | Plantilla de variables de entorno para el equipo |
| `README.md` | Instrucciones de setup |

### Por qué Prisma v7 necesita configuración extra

Prisma v7 separó la configuración en dos lugares:

- **`prisma.config.ts`** — lo usa el CLI (`prisma migrate`, `prisma generate`). Acá va la `DATABASE_URL`.
- **`authController.js`** — lo usa el servidor en runtime. Requiere instanciar `PrismaClient` con el adapter `PrismaPg`.

### Constraints agregados al schema

Se agregaron `@@unique([userId, comicId])` en `CartItem` y `Review` para prevenir filas duplicadas cuando se implemente el carrito (Sprint 3) y las reseñas (Sprint 2).

## Setup para nuevos devs

```bash
cp .env.example .env        # completar los valores entre < >
docker compose up -d db     # levantar PostgreSQL
npx prisma migrate dev      # crear tablas
npm run dev                 # correr el servidor
```
