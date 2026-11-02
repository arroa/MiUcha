# MiHucha

Los niños ganan plata haciendo cosas de la casa. Los adultos la guardan de verdad.

Las ideas están en `Specs/`.

## Arrancar

1. Copia `.env.example` a `.env.local` y completa Mongo, el correo del superusuario y un `DEV_SESSION_SECRET`.
2. `npm run db:indexes` (crea índices; no corre en cada request de usuario)
3. `npm run setup:admin`
4. `npm run dev`
5. Entra en `/sign-in` con el correo del superusuario y crea la primera familia.

Salud Mongo: `GET /api/health` (sin datos sensibles).
