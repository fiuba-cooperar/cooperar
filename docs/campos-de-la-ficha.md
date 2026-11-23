# Campos de la ficha y su privacidad

Propuesta implementada para la #3 y la #14, **pendiente de validar con la SEU**. La definición vive en el backend (`Organization` y `OrganizationProfileResponse`): el cliente no puede cambiar el nivel de un campo, solo elegir la visibilidad de los configurables.

Niveles: **público** (cualquier visitante y la API pública), **privado** (solo la cooperativa y el observatorio) y **configurable** (lo elige la cooperativa; entre paréntesis, el valor inicial).

| Sección | Campo | En el código | Tipo y validación | Obligatorio | Visibilidad |
|---|---|---|---|---|---|
| Identificación | Nombre | `name` | Texto, hasta 200 | Sí | Público |
| | Razón social | `legalName` | Texto, hasta 200 | Sí | Configurable (privado) |
| | Tipo (cooperativa o ERT) | `type` | Lista cerrada; lo valida el observatorio en el alta y no se edita | Sí | Público |
| | CUIT | `cuit` | 11 dígitos con dígito verificador; no se edita | Sí | Privado |
| Actividad | Rubros | `sectors` | Lista cerrada, uno o más | Sí | Público |
| | Qué ofrecen | `activityTypes` | Trabajo, servicio o producto, uno o más | Sí | Público |
| | Descripción | `description` | Texto, hasta 1.500 | No | Público |
| | Año de inicio | `startYear` | Entre 1800 y el año actual (en una ERT, el de la recuperación) | No | Público |
| | Cantidad de trabajadores | `workerCount` | Entero mayor que cero | No | Configurable (público) |
| Ubicación | Nombre de la dirección principal | `addresses[].name` (la de tipo `MAIN`) | Texto, hasta 50 («planta», «local») | No | Público |
| | Provincia, partido y localidad | `addresses[].address.province`, `district`, `locality` | Lista cerrada y texto | Sí | Público |
| | Calle y número | `addresses[].address.street` | Texto, hasta 200 | Sí | Configurable (público) |
| | Referencias para llegar | `addresses[].address.additionalReferences` | Texto, hasta 300 | No | Sigue a la calle: se muestran solo si la calle es pública |
| | Punto en el mapa | `addresses[].point` | Punto WGS84; se geocodifica desde la dirección o lo mueve la cooperativa | No | Exacto si la calle es pública; si no, redondeado a la zona (unos 1 km) |
| | Otras direcciones | `addresses[]` (las que no son `MAIN`) | Hasta 10, cada una con su tipo (por ahora solo «Secundaria»), un nombre opcional de hasta 50 caracteres («sucursal», «depósito») y los mismos campos que la principal: provincia, partido, localidad, calle, referencias y punto en el mapa | No | Las mismas reglas que la principal, cada una con su propia visibilidad de la calle |
| Contacto | Teléfono | `phone` | Texto, hasta 50 | No | Configurable (público) |
| | WhatsApp | `whatsapp` | Texto, hasta 50 | No | Configurable (público) |
| | Email de contacto | `email` | Email, hasta 200 | No | Configurable (público) |
| | Sitio web | `website` | URL `http(s)://`, hasta 300 | No | Público |
| | Redes sociales | `socialMedia` | Texto libre, hasta 200 | No | Público |
| | Horarios de atención | `openingHours` | Texto libre, hasta 200 | No | Público |
| | Tiempo estimado de respuesta | `responseTime` | En el día, 24 horas, 48 horas o una semana | No | Público |
| Fotos | Logo | `logo` | JPEG, PNG o WebP de hasta 5 MB, validado por su contenido; uno solo, uno nuevo reemplaza al anterior | No | Público |
| | Foto de portada | `cover` | Igual que el logo | No | Público |
| | Galería | `photos` | Hasta 10 fotos como las anteriores, en el orden que elige la cooperativa | No | Público |

Datos del alta que no son parte de la ficha: el rol de quien registró la entidad (`registrantRole`) y la cuenta que la registró, visibles solo para el observatorio.
