# Integration

Qué habla MiUcha con el exterior, y las APIs propias. El motivo de cada operación está en [Funcional](./Funcional.docx). Lo que queda guardado está en [DataBase](./DataBase.md).

No hay banco ni pasarela. La entrega de plata ocurre fuera de la aplicación. El banquero la confirma aquí.

Toda ruta propia comprueba en el servidor la sesión, la familia y el rol. Un identificador de otra familia no devuelve datos. Los montos se validan antes de tocar un saldo.

## Clerk

| | |
| --- | --- |
| Para qué | Identidad del superusuario, del banquero y de los auditores. Código por email |
| Base URL | La API de Clerk, vía `@clerk/nextjs` y `@clerk/backend` |
| Autenticación | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` y `CLERK_SECRET_KEY` |
| Dónde vive el secreto | `.env.local` en local. Variables de Vercel en el despliegue |

El niño no pasa por Clerk.

| Operación | Cuándo |
| --- | --- |
| Crear usuario | `setup:admin` para el superusuario. Alta del banquero al crear la familia. Alta de un auditor |
| Iniciar sesión | El adulto pide el código a su correo y entra por `/sign-in` |
| Borrar usuario | Baja de un auditor, o de un banquero si el superusuario cierra esa puerta |

La membresía y el rol viven en MiUcha, no en atributos editables de Clerk.

## MongoDB Atlas

| | |
| --- | --- |
| Para qué | Toda la información de las familias |
| Base URL | `MONGODB_URI` |
| Autenticación | Usuario y clave dentro de esa URI |
| Dónde vive el secreto | `.env.local` y variables de Vercel |

El nombre de la base es `MONGODB_DB_NAME`. Atlas tiene que aceptar transacciones de varios documentos. El modelo está en [DataBase](./DataBase.md).

## Vercel Cron

| | |
| --- | --- |
| Para qué | Una vez al día: ocurrencias de Tips, y el interés el último día del mes |
| Ruta | `GET /api/cron/daily` |
| Autenticación | Cabecera `Authorization: Bearer <CRON_SECRET>` |
| Dónde vive el secreto | `CRON_SECRET` en Vercel. La ruta responde 401 sin ese valor |

El cron no aprueba tareas ni entrega plata.

## API de MiUcha

### Sesión

| Operación | Método y ruta | Quién | Qué entra | Qué sale |
| --- | --- | --- | --- | --- |
| Entrar, adulto | `POST /api/auth/dev-login` | Solo local, con el bypass del arquetipo acceso | Correo | Cookie de desarrollo |
| Entrar, niño | `POST /api/child-auth/login` | Niño | Nombre de la familia y PIN | Cookie de sesión |
| Salir, niño | `POST /api/child-auth/logout` | Niño | La cookie | Sesión revocada |
| Quién soy | `GET /api/me` | Cualquier sesión | — | Persona, familia y rol |

El adulto en producción entra por Clerk, no por `dev-login`.

### Familia

| Operación | Método y ruta | Quién | Qué entra | Qué sale |
| --- | --- | --- | --- | --- |
| Crear familia | `POST /api/families` | Superusuario | Nombre y correo del banquero. Con `mine`, el banquero es el propio superusuario | Familia y banquero creado en Clerk |
| Renombrar en la tarjeta | `PATCH /api/families/:id` | Superusuario | Nombre de la familia, único, y nombre del banquero | Esos dos nombres |
| Ver parámetros | `GET /api/families/current` | Banquero | — | Nombre, porcentajes, tasa, niños y auditores |
| Guardar parámetros | `PATCH /api/families/current` | Banquero | Nombre único, porcentajes y `interestPercent` | El nombre y los tres porcentajes, si suman 100 |
| Crear niño | `POST /api/children` | Banquero | Nombre, nacimiento, nombre en la casa, PIN | Niño y tres Uchas en cero |
| Modificar niño | `PATCH /api/children/:id` | Banquero | Nombre, nacimiento, nombre en la casa y PIN si cambia | El niño |
| Dar de baja niño | `PATCH /api/children/:id` | Banquero | `active: false` | El niño ya no entra. El libro sigue |
| Restablecer PIN | `POST /api/children/:id/pin` | Banquero | PIN nuevo | PIN reemplazado |
| Crear auditor | `POST /api/auditors` | Banquero | Nombre y correo | Auditor creado en Clerk |
| Modificar auditor | `PATCH /api/auditors/:id` | Banquero | Nombre y correo | El auditor |
| Dar de baja auditor | `DELETE /api/auditors/:id` | Banquero | — | Baja en la familia y en Clerk |

### Tips

| Operación | Método y ruta | Quién | Qué entra | Qué sale |
| --- | --- | --- | --- | --- |
| Listar catálogo | `GET /api/tips` | Banquero, o el niño ve los suyos | — | Definiciones |
| Guardar la lista | `PUT /api/tips` | Banquero | Nombre, precio y si está marcada | Las tareas de esa familia |
| Agregar tarea | `POST /api/tips` con `custom` | Banquero | Nombre y precio | La tarea nueva |
| Eliminar tarea | `POST /api/tips/dismiss` | Banquero | Clave de la tarea | Ya no aparece en esa familia |
| Editar o desactivar | `PATCH /api/tips/:id` | Banquero | Campos del catálogo | Definición. No cambia ocurrencias ya creadas |
| Mis ocurrencias | `GET /api/tip-occurrences` | Niño, banquero o auditor | — | Las de su alcance |
| Marcar «¡Listo!» | `POST /api/tip-occurrences/:id/submit` | Niño | — | Estado `submitted` |
| Aprobar o pedir mejora | `POST /api/tip-occurrences/:id/review` | Banquero o auditor | `approved` o `needs_improvement`, nota opcional | Si aprueba: tres asientos y tres saldos |

### Uchas y plata

| Operación | Método y ruta | Quién | Qué entra | Qué sale |
| --- | --- | --- | --- | --- |
| Ver Uchas | `GET /api/wallets` | Niño las suyas. Banquero y auditor, las de la familia | `childId` si es adulto | Saldos y disponible |
| Transferir | `POST /api/transfers` | Niño | Ucha origen, Ucha destino, monto | Dos asientos |
| Pedir plata | `POST /api/withdrawals` | Niño | Ucha, monto, nota opcional | Pedido `pending`, sin débito |
| Entregar | `POST /api/withdrawals/:id/complete` | Banquero | — | `completed` y un débito |
| Cancelar pedido | `POST /api/withdrawals/:id/cancel` | Niño o banquero | — | `cancelled`. El saldo no se tocó |
| Movimientos | `GET /api/movements` | Niño los suyos. Adultos, los de la familia | Filtro por niño y mes | Libro |
| Mi mes | `GET /api/monthly-summary` | Niño, o adulto de esa familia | Mes | Ganado, reparto, interés, retiros, transferencias |

### Novedades y cron

| Operación | Método y ruta | Quién | Qué entra | Qué sale |
| --- | --- | --- | --- | --- |
| Portada | `GET /api/news` | La sesión | — | Por hacer, y lo que pasó |
| Marcar vista | `POST /api/news/:id/read` | El destinatario | — | Queda vista. Si era una tarea, sigue pendiente |
| Día | `GET /api/cron/daily` | Vercel, con `CRON_SECRET` | — | Ocurrencias creadas y, si es el último día, intereses abonados |
