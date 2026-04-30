# Comic eCommerce — Backend

API REST con Node.js, Express, Prisma y PostgreSQL.

## Requisitos previos

- Node.js 20 (usar nvm)
- Docker y Docker Compose

## Setup inicial (primera vez)

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
```

Editá `.env` y reemplazá los valores entre `<...>` con los reales.

### 3. Levantar la base de datos

Desde el directorio del backend (`comic-ecommerce-backend/`):

```bash
docker compose up -d db
```

### 4. Crear las tablas

```bash
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
npx prisma migrate dev
```

### 5. Correr el servidor

```bash
npm run dev
```

El servidor corre en `http://localhost:3000`.

## Endpoints de auth

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/auth/register` | Registrar usuario |
| POST | `/api/auth/login` | Iniciar sesión |
| POST | `/api/auth/logout` | Cerrar sesión |
| GET | `/api/auth/me` | Usuario actual |

## Uso diario

La base de datos persiste entre reinicios del contenedor gracias al volumen Docker.
Si necesitás detenerla: `docker compose down` (desde el directorio del backend).
