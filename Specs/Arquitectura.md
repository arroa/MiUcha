# Arquitectura

Cómo está hecha MiUcha. El detalle de cada API está en [Integration](./Integration.md). El modelo de datos está en [DataBase](./DataBase.md). Lo que la aplicación hace por las personas está en [Funcional](./Funcional.docx).

## Stack

| Pieza | Elección |
| --- | --- |
| Framework | Next.js (App Router) y React, en TypeScript |
| UI | Tailwind. Teléfono primero para el niño. También se usa en escritorio |
| Base de datos | MongoDB Atlas, con el driver oficial. Sin ORM |
| Dónde corre | Vercel. La PWA se instala desde el navegador |
| Adultos | Clerk, código por email |
| Niños | Identificador y PIN de 6 dígitos, sesión propia de MiUcha |
| Plata | Pesos enteros. Mes e interés en `America/Santiago` |

Una sola aplicación. Las familias no se mezclan: toda lectura y toda escritura filtra por `familyId` en el servidor.

## Arquetipos heredados

| Arquetipo | Qué aporta aquí |
| --- | --- |
| Acceso | La puerta de los adultos: Clerk, bypass local y las dos barreras de rutas |
| Usuarios | El script `setup:admin` crea al superusuario en Clerk. Alta y baja de banquero y auditores también pasan por Clerk |

La puerta del niño no viene de un arquetipo. El PIN no sirve para un adulto, y un niño no tiene usuario en Clerk.

## Quién existe

| Persona | Cómo entra | Qué hace |
| --- | --- | --- |
| Superusuario | Clerk. Lo nombra `SUPER_ADMIN_EMAIL` | Crea la familia y a su banquero |
| Banquero | Clerk. Uno por familia | Guarda la plata, toca los parámetros, crea niños, auditores y Tips, entrega la plata y también puede aprobar un Tip |
| Auditor | Clerk. Lo crea el banquero | Dice si la tarea quedó bien |
| Niño | Identificador + PIN | Marca «¡Listo!», mueve entre Uchas y pide plata |

Dar de baja a un auditor lo borra de la familia y de Clerk. Desactivar a un niño le cierra la entrada. Su libro de movimientos se conserva. El superusuario no se da de baja desde la aplicación.

## Dos puertas

```text
Adulto                         Niño
  /sign-in                       /entrar
  Clerk, arquetipo acceso        identificador + PIN
  cookie de Clerk                cookie propia, HttpOnly
        \                       /
         \                     /
          Next.js  /api
          familia, rol y permiso en cada operación
                    |
              MongoDB Atlas
                    ^
            Vercel Cron, una vez al día
```

El middleware deja pasar `/sign-in`, `/entrar` y el cron. En el resto pide sesión. Cada API vuelve a mirar quién es, de qué familia es y si ese rol puede hacer la operación. Un niño solo toca sus datos.

## Plata

Los saldos los mueve un solo servicio. Las pantallas no escriben la base por su cuenta.

Estas tres operaciones van en una transacción de MongoDB. Si un paso falla, no queda nada a medias.

| Operación | Qué queda escrito |
| --- | --- |
| Aprobar un Tip | La ocurrencia pasa a ganada, tres asientos, tres saldos, una novedad |
| Transferir entre Uchas | Un débito y un crédito del mismo monto |
| Entregar la plata | El pedido pasa a entregado y se debita esa Ucha |

Pedir plata no debita. El pedido pendiente reserva el monto para que no se pida dos veces el mismo saldo. El débito ocurre cuando el banquero marca que entregó el billete.

Cada operación lleva un `operationId` fijo. Un reintento, un doble clic o un cron repetido no abona dos veces. El libro no se edita ni se borra. Una corrección es un asiento al revés.

El reparto usa los porcentajes de ese momento. Lo ya abonado no se recalcula. El residuo de pesos, si el reparto no cae entero, va a Gasto.

El interés corre el último día del mes. Es la tasa de la familia aplicada a lo ahorrado en Inversión durante ese mes. Lo ahorrado es lo que entró menos lo que salió. Si no quedó ahorro, el interés es cero. Se trunca al peso.

## Cron

`/api/cron/daily` no es público. Lo llama Vercel con un secreto.

Hace dos trabajos, en hora de Santiago:

- Crea las ocurrencias de Tips diarios y semanales que correspondan.
- El último día del mes, abona el interés de cada niño, una vez.

No aprueba Tips ni entrega plata. Eso lo hace una persona.

## PWA

Se puede instalar. Sin red, las pantallas ya abiertas pueden verse con lo último que cargaron. Una acción de plata o de auditoría no se guarda para después y no muestra un éxito falso.

## Integraciones

| Sistema | Para qué se usa |
| --- | --- |
| Clerk | Identidad de superusuario, banquero y auditor |
| MongoDB Atlas | Todos los datos de MiUcha |
| Vercel Cron | Ocurrencias de Tips e interés mensual |

No hay pasarela de pago ni banco. La plata física la entrega el banquero.
