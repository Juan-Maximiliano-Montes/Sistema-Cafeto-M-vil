# API para la app móvil — contrato con el sistema Cafeto (Django)

La app móvil habla con estos endpoints. Del lado de Django están en la app `api_movil` del proyecto web, en `/api/movil/`. Este documento es el acuerdo entre las dos partes: qué recibe y qué devuelve cada endpoint, y qué reglas del sistema respeta (permisos, auditoría, baja lógica y cálculo de ofertas). Si se cambia algo de un lado, se cambia acá y del otro lado.

## Qué hace la app y qué queda en la web

| Perfil | En la app (tareas rápidas) | En la web (tareas pesadas) |
|---|---|---|
| Cualquiera, sin cuenta | Inicio con ofertas y combos del día, Productos de Cafetería y Minisuper, Beneficios, Ayuda | — |
| Cliente | Su QR real (el `qr_cliente` que escanea la caja), sus puntos, sus movimientos, sus datos | — |
| Equipo | Panel del día (igual al inicio de la web, según permisos), recibir mercadería contra la orden de compra, contar stock, cargar mermas y traspasos, cargar producción, autorizar ajustes, consultar producto (con escáner), alertas, ofertas para etiquetar, ABM liviano de Marcas y Rubros | Ventas y caja, armar y enviar órdenes de compra, pagos y egresos, precios, ABM de productos y beneficios, usuarios y permisos, reportes, impresión de etiquetas |

Los perfiles son los de Django: **Administrador** (el titular es el administrador inicial, `es_titular`), **Encargado** y **Operador**, cada uno con los permisos que tenga cargados. La app solo muestra lo que permite cada permiso, y el servidor lo vuelve a controlar en cada pedido.

## Configuración en la app

En el `.env` de la app se agrega la dirección base de la API:

```dotenv
EXPO_PUBLIC_API_URL=https://tu-tunel.trycloudflare.com/api/movil
```

- Con **Cloudflare Tunnel** (`cloudflared`), el servidor Django del local queda publicado con HTTPS válido sin requerir IP pública ni abrir puertos, funcionando desde cualquier red móvil (4G/5G) o Wi-Fi. Recordar configurar en `settings.py` de Django `SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')` además de incluir el dominio del túnel en `ALLOWED_HOSTS` y `CSRF_TRUSTED_ORIGINS`.
- Para desarrollo local directo en Expo Go sobre la misma red Wi-Fi, también se acepta `http://192.168.x.x:8000/api/movil` (nunca `localhost`).
- Después de cambiar el `.env`, reiniciar Expo con `npx expo start -c`.
- Si `EXPO_PUBLIC_API_URL` está vacía, la app informa que falta configurar la dirección del sistema Cafeto (`sinConfigurar: true`).

## Autenticación del equipo

Los empleados entran con el **mismo usuario y contraseña que en la web**. El servidor devuelve un token que la app guarda cifrado (`expo-secure-store`) y manda en cada pedido:

```
Authorization: Token <token>
```

El token es una **sesión móvil** (`SesionMovil`), aparte de la sesión web, así entrar desde el celular no cierra la web (DD-01):

- Hay una sola sesión móvil por usuario: entrar desde otro celular cierra la anterior.
- `DELETE /sesion/` la cierra en el servidor, no solo en el celular.
- Cambiar la contraseña o dar de baja al usuario corta todas sus sesiones.
- Si la sesión ya no vale, cualquier pedido responde `401` y la app vuelve a pedir usuario y contraseña.
- Lo que se carga desde el celular queda en la auditoría con el id de esa sesión móvil.

Los clientes entran con Firebase. Para sus endpoints (`/clientes/`) la app manda el token de Firebase del usuario:

```
Authorization: Firebase <id_token>
```

Django lo verifica con `firebase-admin` y exige el correo verificado. Los endpoints de `/catalogo/` son públicos.

## Reglas generales

- Todas las respuestas son JSON. Los errores llevan `detail` (texto para mostrar) o `errores` (un objeto con una lista de textos por campo).
- Las listas devuelven `{ "resultados": [...], "hay_mas": true }`, de a **20**. La app pide `pagina=2`, `pagina=3`... mientras `hay_mas` sea `true`.
- La app **no confía** en lo que llega: descarta filas sin `id` o sin `nombre`, precios negativos, ofertas que no son menores al precio y alertas de tipos desconocidos. Si el cuerpo no es JSON, muestra «El sistema Cafeto respondió algo que no esperábamos».
- Corta a los **12 segundos** sin respuesta.
- **Operaciones sin duplicados.** Todo `POST` que mueve mercadería (recepción, merma, traspaso, producción) lleva la cabecera `Idempotency-Key: <texto único>`. La app genera una clave al abrir el formulario y la repite si reintenta (por ejemplo, después de un corte de wifi). Si la clave ya se usó con éxito, el servidor responde `409` con `{ "detail": "Esa operación ya se había cargado. No se repitió." }` y no hace nada; la app lo toma como «ya estaba hecho». Es la misma idea que `nucleo/idempotencia.py`, pero guardada por usuario (tabla o caché, 24 h), porque la API no tiene sesión.
- Los errores de reglas (`ValidationError` de los servicios) van como `400` con `detail`: la app muestra el texto tal cual.
- Cuando la app tiene que hacer algo distinto según el error, además de `detail` viene `codigo`:

  | `codigo` | Estado | Dónde | Qué hace la app |
  |---|---|---|---|
  | `COSTOS_RAROS` | `409` | recibir mercadería | muestra los costos y pide confirmarlos |
  | `CORREO_REPETIDO` | `409` | clientes | pide el DNI para encontrar la ficha |
  | `DNI_NO_COINCIDE` | `409` | clientes | avisa que ese DNI no está en esas fichas |
  | `DEMASIADOS_INTENTOS` | `429` | clientes | pide esperar o acercarse a la caja |
  | `FICHA_DADA_DE_BAJA` | `404` | clientes | pide pasar por la caja (no intenta crear otra ficha) |
  | `FICHA_DE_OTRA_CUENTA` | `409` | clientes | pide pasar por la caja |
  | `FALTA_TELEFONO_O_DNI` | `400` | clientes | pide el teléfono o el DNI ahí mismo y crea la ficha |
  | `TELEFONO_DE_OTRO_CLIENTE` | `400` | clientes | explica que pida en la caja que agreguen su correo a esa ficha |
  | `DNI_DE_OTRO_CLIENTE` | `400` | clientes | lo mismo, con el DNI |
  | `CLIENTES_SIN_CONFIGURAR` | `503` | clientes | explica que el local está terminando de conectar los puntos |

- Un método que no corresponde responde `405` en JSON, con la cabecera `Allow`.
- `429` trae la cabecera `Retry-After` con los segundos que hay que esperar.
- Mensajes por estado cuando no viene `detail`: `401` sesión vencida (la app cierra la sesión del equipo), `403` sin permiso, `404` ya no existe, `409` los datos cambiaron, `429` muchos pedidos seguidos, `5xx` problema del sistema.

## Regla de secciones del catálogo

| Sección | Tipos de producto |
|---|---|
| `CAFETERIA` | `ELABORADO`, `PRODUCIDO`, `COMBO` |
| `MINISUPER` | `REVENTA` |

- Un `INSUMO` **nunca** se publica.
- Solo productos con `borrado_logico = False` y `precio_venta > 0`.
- **Oferta**: la misma regla que `stock.servicios.en_oferta()`. Se usa `producto.rebaja_vigente()` (la rebaja del producto manda sobre la del rubro). Si el lote con stock que vence primero, y todavía no venció, está dentro de esos días, va `precio_oferta` = precio con la rebaja (redondeado) y `porcentaje_oferta`.
- **Disponible**: lo que tiene stock propio (`REVENTA`, `PRODUCIDO`) está disponible si le queda stock que no esté vencido. Lo elaborado al momento y los combos, siempre.
- **Marca**: si es la genérica «Sin marca», va `null`.
- **Imagen**: cuando el producto no tiene foto va `null` y la app muestra el ícono de su rubro/sección. Cuando tiene foto (cargada desde Django o automatizada vía n8n), puede venir una URL absoluta `https://...`, una ruta relativa `/media/productos/...` (la app antepone automáticamente el origen de `EXPO_PUBLIC_API_URL`) o una URL `http://` del mismo origen en desarrollo. Para evitar caché obsoleta cuando n8n sobreescribe una imagen conservando el nombre, Django debe incluir `?v=<timestamp>` en la URL o enviar el campo `imagen_actualizada`.

## Endpoints públicos (sin token)

### `GET /salud/`

Endpoint liviano sin autenticación que devuelve `200` con `{ "ok": true }`. La pantalla `SinConexion` de la app lo consulta con `AbortController` para detectar automáticamente cuándo vuelve a estar alcanzable el servidor Cafeto.

### `GET /catalogo/destacados/`

Lo que va en el carrusel del Inicio: primero los combos y después las ofertas del día, de la rebaja más grande a la más chica, sin productos agotados. Máximo 8.

```json
{
  "resultados": [
    {
      "id": 110, "nombre": "Desayuno Cafeto", "descripcion": "Café con leche y 2 medialunas",
      "presentacion": "Combo", "precio": 4000, "precio_oferta": null, "porcentaje_oferta": null,
      "seccion": "CAFETERIA", "tipo": "COMBO", "rubro": { "id": 1, "nombre": "Cafetería" },
      "marca": null, "imagen": null, "icono": "sunny-outline", "disponible": true, "motivo": "COMBO"
    }
  ],
  "hay_mas": false
}
```

`motivo` es `COMBO` u `OFERTA`. `icono` es opcional: un nombre de Ionicons. Si no existe, la app usa uno genérico.

### `GET /catalogo/productos/?seccion=CAFETERIA&rubro=3&q=texto&pagina=1`

- `seccion` es obligatoria. Si no es `CAFETERIA` ni `MINISUPER`, devolver `400` con `{ "detail": "Elegí Cafetería o Minisuper." }`.
- `rubro` es opcional (id).
- `q` busca en nombre, descripción, marca y rubro, sin distinguir mayúsculas ni tildes.
- Mismo formato de producto que destacados, sin `motivo`. Orden por nombre.

### `GET /catalogo/rubros/?seccion=MINISUPER`

Los rubros vigentes que tienen al menos un producto publicado en esa sección (son los filtros de la pantalla Productos): `{ "resultados": [{ "id": 3, "nombre": "Lácteos" }], "hay_mas": false }`.

### `GET /catalogo/beneficios/`

Los beneficios vigentes hoy (`vigencia_desde <= hoy` y `vigencia_hasta` vacía o `>= hoy`), y las categorías del club ordenadas por puntos:

```json
{
  "categorias": [{ "nombre": "Bronze", "puntos_minimos": 0 }, { "nombre": "Platinum", "puntos_minimos": 15000 }],
  "resultados": [
    { "id": 4, "titulo": "Café con leche gratis", "detalle": "Retirás en el mostrador",
      "tipo": "CANJEABLE", "puntos": 400, "categoria": "Bronze", "icono": "cafe-outline" }
  ],
  "hay_mas": false
}
```

La app ordena los beneficios y decide qué categoría alcanza a cuál con `categorias`. Así, si el local crea una categoría nueva, la app la muestra sin cambiar el código.

| Campo | De dónde sale |
|---|---|
| `titulo` | `descripcion_beneficio` |
| `tipo` | `tipo_beneficio` |
| `puntos` | `puntos_requeridos` (0 si es automático) |
| `categoria` | `id_categoria.nombre_categoria` |
| `detalle` | armado con `modo_entrega` y `porcentaje_descuento` |

## Equipo

### `POST /sesion/` — entrar como equipo

```json
{ "usuario": "montesj", "clave": "..." }
```

`usuario` puede ser el nombre de usuario o el DNI, como en la web. La app acepta el DNI con puntos y los saca antes de mandarlo.

| Respuesta | Cuerpo |
|---|---|
| `200` | `{ "token": "...", "usuario": { "nombre": "Juan", "apellido": "Montes", "perfil": "Administrador", "es_administrador": true, "es_titular": true, "permisos": ["ver_productos", "ver_stock", "ver_marcas"] } }` |
| `401` | `{ "detail": "El usuario o la contraseña no coinciden." }` |
| `403` | El usuario está dado de baja, o tiene que cambiar la contraseña provisoria desde la web antes de entrar desde el celular. El `detail` dice cuál. |
| `429` | Muchos intentos fallidos seguidos (la misma lógica que `IntentoAcceso` de la web), con `Retry-After`. |

`permisos` trae **solo** los códigos que usa la app (`PERMISOS_MOVIL`). La app muestra cada tarea según esa lista, pero **el servidor vuelve a controlar el permiso en cada endpoint**. Si la respuesta no trae `token`, la app no entra y avisa.

### `DELETE /sesion/` — salir

`204` sin cuerpo.

### `GET /stock/productos/?q=texto&codigo=7790895000782&pagina=1` — consultar (permiso `ver_productos`)

- Si viene `codigo`, busca **exacto** por `codigo_barras` (es lo que manda el escáner).
- Si no, `q` busca en nombre, marca, rubro y código.
- Incluye insumos: es para el equipo.

Cada fila es un producto del catálogo más estos campos:

```json
{
  "codigo_barras": "7790895000782",
  "unidad": "UNIDAD", "cantidad_entera": true,
  "stock_actual": 30, "stock_minimo": 12,
  "controla_vencimiento": true,
  "proximo_vencimiento": { "fecha": "2026-11-18", "dias": 6, "cantidad": 3, "lote": "Q-0405" },
  "alertas": ["VENCIDO", "STOCK_BAJO"]
}
```

- `stock_actual` y `stock_minimo` van `null` en lo que no tiene stock propio (`ELABORADO` y `COMBO`).
- `proximo_vencimiento` es el lote con stock que vence primero y todavía no venció.
- `unidad` es `Producto.unidad_medida` (`UNIDAD`, `KG`, `G`, `L`, `ML`) y `cantidad_entera` es `Producto.exige_cantidad_entera`. La app los usa para validar las cantidades igual que `exigir_cantidad_valida`: mayor que cero, hasta 999.999, hasta 3 decimales y entera cuando corresponde.

### `GET /stock/alertas/?tipo=TODAS` — alertas (permiso `ver_stock`)

`tipo`: `TODAS`, `STOCK` (`SIN_STOCK` y `STOCK_BAJO`) o `VENCIMIENTO` (`VENCIDO` y `POR_VENCER`). Otro valor responde `400`.

| Tipo | Regla (igual que la pestaña Alertas de la web) |
|---|---|
| `SIN_STOCK` | `stock_minimo > 0` y `stock_actual <= 0` |
| `STOCK_BAJO` | `stock_minimo > 0` y `0 < stock_actual < stock_minimo` (`servicios.bajo_minimo()`) |
| `VENCIDO` | **una alerta por lote** con stock ya vencido |
| `POR_VENCER` | **una alerta por lote** con stock que vence dentro de `ParametrosNegocio.dias_aviso_vencimiento` |

```json
{
  "resultados": [
    { "id": "VENCIDO-211-7", "tipo": "VENCIDO",
      "producto": { "id": 211, "nombre": "Queso cremoso", "presentacion": "Por kg",
                    "unidad": "KG", "cantidad_entera": false, "controla_vencimiento": true,
                    "stock_actual": 3 },
      "lote": { "id": 7, "numero": "Q-0398", "cantidad": 0.5 },
      "detalle": "El lote Q-0398 venció con 0,5 en góndola. Retiralo y cargalo como merma.",
      "dias": -1, "fecha": "2026-11-11" }
  ],
  "hay_mas": false
}
```

Con el `lote`, la app abre «Cargar merma» ya completa (producto, lote, cantidad y motivo «Vencido»).

**Stock por debajo de cero.** Solo un insumo puede quedar así: una receta lo descontó antes de que se cargara la compra o el conteo. En el local el insumo está; lo que falta es registrarlo. Por eso ni la API ni la app muestran un número negativo, que se lee como «no hay»:

- el `detalle` dice `Stock a revisar: se usó 0,46 kg más de lo cargado. Falta cargar la compra o contarlo.`;
- la app usa `stock_actual` para mostrar la alerta como «A revisar» en lugar de «Sin stock», y en el resto de las pantallas escribe «a revisar» donde iría la cantidad.

Orden: `VENCIDO`, `SIN_STOCK`, `POR_VENCER`, `STOCK_BAJO`, y dentro de cada tipo por nombre.

### Marcas (permisos `ver_marcas`, `crear_marca`, `editar_marca`, `eliminar_marca`)

| Pedido | Respuesta |
|---|---|
| `GET /marcas/?q=texto&pagina=1` | `{ "resultados": [{ "id": 3, "nombre": "La Morenita", "descripcion": "Café y yerba" }], "hay_mas": true }`. Solo vigentes, por nombre. |
| `POST /marcas/` con `{ "nombre": "...", "descripcion": "..." }` | `201` con la marca creada. `400` con `{ "errores": { "nombre": ["Ya existe una marca con ese nombre."] } }` |
| `PATCH /marcas/<id>/` | `200` con la marca. `404` si no existe o está dada de baja. |
| `DELETE /marcas/<id>/` | `204` (baja lógica). `409` con `{ "detail": "No se puede dar de baja: tiene 5 producto(s) vigente(s)..." }` |

Reactivar queda en la web (`reactivar_marca`).

### Rubros (permisos `ver_rubros`, `crear_rubro`, `editar_rubro`, `eliminar_rubro`)

Igual que Marcas, en `/rubros/`, con un campo más:

```json
{ "id": 3, "nombre": "Lácteos", "descripcion": "Leches, yogures y quesos", "activo": true }
```

`activo` es «se ofrece en el alta de productos» (no es la baja): si viene algo que no es `true` o `false`, devolver `400` con `{ "errores": { "activo": ["Indicá si se ofrece o no."] } }`. La rebaja por vencimiento del rubro se edita solo en la web.

## Tareas del equipo en el celular

Cada endpoint reutiliza el **servicio** que ya usa la web, así las reglas son las mismas. La tabla dice cuál.

| Endpoint | Permiso | Servicio de Django |
|---|---|---|
| `GET /panel/` | sesión | lo mismo que `negocio/views/inicio.py` |
| `GET /stock/productos/<id>/lotes/` | alguno de `ver_productos`, `ver_stock`, `contar_stock`, `registrar_merma`, `registrar_traspaso` | `servicios.lotes_fefo(producto)` |
| `GET /stock/ofertas/` | `imprimir_ofertas` o `ver_stock` | `servicios.en_oferta()` |
| `GET /compras/ordenes/?estado=POR_RECIBIR` | `registrar_compra` | órdenes `EMITIDA` y `CON_DIFERENCIAS` |
| `GET /compras/ordenes/<id>/` | `registrar_compra` | `OrdenCompra.diferencias()` |
| `POST /compras/recepciones/` | `registrar_compra` | `compras.servicios.recepcionar(..., orden=...)` |
| `GET /stock/conteo/` | `contar_stock` | el conteo `EN_CURSO` o `PENDIENTE` |
| `POST /stock/conteo/` | `contar_stock` | `servicios.iniciar_conteo` |
| `POST /stock/conteo/renglones/` | `contar_stock` | `servicios.cargar_conteo` |
| `POST /stock/conteo/enviar/` | `contar_stock` | `servicios.enviar_conteo` |
| `POST /stock/mermas/` | `registrar_merma` | `servicios.registrar_merma` |
| `POST /stock/traspasos/` | `registrar_traspaso` | `servicios.registrar_traspaso` |
| `GET /stock/ajustes/?estado=PENDIENTE` | `autorizar_ajustes` | ajustes `PENDIENTE` |
| `POST /stock/ajustes/<id>/aprobar/` | `autorizar_ajustes` | `servicios.aprobar` (incluye `exigir_otra_persona`, DD-67) |
| `POST /stock/ajustes/<id>/rechazar/` | `autorizar_ajustes` | `servicios.rechazar` |
| `GET /stock/producibles/` | `registrar_produccion` | productos `PRODUCIDO` con receta |
| `POST /stock/producciones/` | `registrar_produccion` | `servicios.registrar_produccion` |

Las operaciones que hoy dejan auditoría en la web (`registrar_auditoria`) la tienen que dejar también desde la API (ver «Decisiones pendientes»).

### `GET /panel/`

Los mismos bloques que el inicio de la web, cada uno según su permiso:

```json
{
  "indicadores": [
    { "clave": "VENDIDO_HOY", "titulo": "Vendido hoy", "valor": 186400, "formato": "PESOS",
      "detalle": "57 tickets · el mismo día de la semana pasada: $171.900" },
    { "clave": "CAJAS_ABIERTAS", "titulo": "Cajas abiertas", "valor": 1, "formato": "NUMERO", "detalle": "Sin diferencias hoy" }
  ],
  "avisos": [
    { "tipo": "error", "texto": "1 lote(s) vencido(s) en la góndola: cargalos como merma.", "destino": "ALERTAS" },
    { "tipo": "aviso", "texto": "2 ajuste(s) de stock esperan tu autorización.", "destino": "AJUSTES" },
    { "tipo": "aviso", "texto": "1 orden(es) de compra llegaron con diferencias: revisalas con el proveedor.", "destino": "ORDENES" },
    { "tipo": "aviso", "texto": "2 pago(s) vencen en los próximos 7 días.", "destino": "WEB" }
  ]
}
```

`destino` dice a qué pantalla lleva el aviso en la app: `ALERTAS`, `AJUSTES`, `ORDENES` o `WEB` (se resuelve en la web: pagos, seguridad).

### Lotes y ofertas

- `GET /stock/productos/<id>/lotes/`: `{ "resultados": [{ "id": 7, "numero": "Q-0398", "vence": "2026-11-11", "dias": -1, "cantidad": 0.5 }], "hay_mas": false }`. Lotes con stock, del que vence primero al último, **incluidos los vencidos** (son los que se tiran).
- `GET /stock/ofertas/`: una fila por lote en oferta hoy: `{ "id": "209-12", "producto": { "id": 209, "nombre": "Yogur bebible frutilla", "presentacion": "1 L" }, "lote": { ...como arriba }, "precio": 2200, "precio_oferta": 1540, "porcentaje": 30 }`.

### Recibir mercadería

`GET /compras/ordenes/?estado=POR_RECIBIR`:

```json
{ "resultados": [{ "id": 502, "proveedor": { "id": 2, "nombre": "Lácteos del Valle" }, "fecha": "2026-11-12",
                   "estado": "EMITIDA", "renglones": 3, "total": 46600 }], "hay_mas": false }
```

`GET /compras/ordenes/<id>/` agrega el detalle, con lo ya recibido en recepciones anteriores:

```json
{ "id": 502, "...": "...",
  "renglones": [{ "producto": { "id": 209, "nombre": "Yogur bebible frutilla", "presentacion": "1 L", "tipo": "REVENTA",
                                "unidad": "UNIDAD", "cantidad_entera": true, "controla_vencimiento": true,
                                "codigo_barras": "7790...", "stock_actual": 9 },
                  "pedido": 12, "recibido": 0, "precio_unitario": 1300 }] }
```

`POST /compras/recepciones/` (con `Idempotency-Key`):

```json
{ "orden": 502, "tipo_comprobante": "REMITO", "punto_venta": 1, "numero_comprobante": 4567, "fecha_compra": "2026-11-13",
  "importe_otros_conceptos": 0,
  "renglones": [
    { "producto": 209, "cantidad": 12, "costo_unitario": 1300,
      "lotes": [{ "fecha_vencimiento": "2026-11-23", "numero_lote": "Y-1", "cantidad": 12 }] },
    { "producto": 304, "cantidad": 2, "costo_unitario": 9000 } ] }
```

- Solo van los renglones que llegaron (cantidad mayor que cero). Lo que no llegó queda como faltante.
- Las reglas son las de `recepcionar` y `_validar_renglon`: comprobante no repetido por proveedor, fecha no futura ni de más de 30 días, lotes obligatorios y que sumen la cantidad en lo que controla vencimiento, ningún lote vencido ni a más de 10 años, sin números de lote repetidos.
- Respuesta `201`: `{ "id": 15, "orden": { "id": 502, "estado": "CON_DIFERENCIAS" }, "diferencias": [{ "producto": { "id": 210, "nombre": "Leche entera larga vida" }, "pedido": 12, "recibido": 10, "diferencia": -2 }] }`.
- `409` si la orden ya no espera mercadería.
- **Costos raros.** Igual que la pantalla de recepción de la web (`costos_que_llaman_la_atencion`): si un costo es más del triple o menos de un tercio del costo que tenía el producto, no se guarda nada y responde:

  ```json
  { "codigo": "COSTOS_RAROS",
    "detail": "Hay costos muy distintos de los que venías pagando. Revisalos: si están bien, confirmalos y volvé a enviar.",
    "costos": [{ "producto": { "id": 206, "nombre": "Agua mineral" }, "anterior": 1700, "nuevo": 17000 }] }
  ```

  La app marca esos renglones y pregunta. Si quien recibe confirma, reenvía lo mismo con `"confirmo_costos": true` y la **misma** `Idempotency-Key`, que quedó libre porque no se guardó nada.

### Conteo de inventario

`GET /stock/conteo/`, `POST /stock/conteo/` (`{ "motivo": "DIFERENCIA_CONTEO" }`), `POST /stock/conteo/renglones/` y `POST /stock/conteo/enviar/` responden lo mismo:

```json
{ "conteo": { "id": 31, "estado": "EN_CURSO", "motivo": "DIFERENCIA_CONTEO", "iniciado_por": "Ariel Roldán",
              "fecha": "2026-11-13T09:12:00-03:00",
              "renglones": [{ "producto": { ...como en la orden }, "lote": { "id": 7, "numero": "Q-0398", "vence": "2026-11-11" }, "contada": 1.2 }] } }
```

- `conteo` es `null` si no hay ninguno abierto.
- `POST /stock/conteo/` responde `201` (se creó el conteo). Los demás, `200`.
- El conteo es **a ciegas**: acá no se manda el teórico. Lo ve recién quien autoriza. Mientras cuenta, la app tampoco muestra el stock en el buscador ni la cantidad de cada lote.
- Renglón: `{ "producto": 201, "contada": 27 }`, opcionalmente con `"lote": 7` o con `"nuevo_lote": { "fecha_vencimiento": "2026-12-01", "numero_lote": "Q-0420" }`. Sin lote en un producto que va por lote, se usa el que vence primero, como hace la web. Si el renglón ya estaba, se reemplaza lo contado.

### Mermas y traspasos

`POST /stock/mermas/` (con `Idempotency-Key`):

```json
{ "motivo": "VENCIMIENTO", "detalle": null, "renglones": [{ "producto": 211, "lote": 7, "cantidad": 0.5 }] }
```

`POST /stock/traspasos/` (con `Idempotency-Key`):

```json
{ "motivo": "USO_EN_CAFETERIA", "detalle": null,
  "renglones": [{ "producto": 210, "lote": 8, "cantidad": 2, "destino": 302, "cantidad_destino": 2 }] }
```

- Los motivos son los de `MOTIVOS_POR_TIPO`. `OTRO` exige `detalle` (de 3 a 120 caracteres).
- Respuesta `201`: `{ "id": 44, "tipo": "MERMA", "estado": "PENDIENTE" }`. El stock **no** se mueve hasta que se aprueba.

### Autorizar ajustes

`GET /stock/ajustes/?estado=PENDIENTE`:

```json
{ "resultados": [{ "id": 44, "tipo": "MERMA", "estado": "PENDIENTE", "motivo": "VENCIMIENTO", "detalle": null,
                   "cargado_por": "Ariel Roldán", "fecha": "2026-11-13T09:40:00-03:00",
                   "propio": false, "puede_aprobar": true,
                   "renglones": [{ "producto": { ... }, "lote": { ... }, "cantidad": 0.5,
                                   "teorica": null, "contada": null, "diferencia": null,
                                   "destino": null, "cantidad_destino": null }] }], "hay_mas": false }
```

- En los conteos, cada renglón trae `teorica`, `contada` y `diferencia`. En los traspasos, `destino` y `cantidad_destino`.
- `propio` es si lo cargó el mismo usuario. `puede_aprobar` es `false` cuando es propio y el usuario no es administrador (DD-67): la app deshabilita «Aprobar» y lo explica.
- `POST .../aprobar/` y `POST .../rechazar/` reciben `{ "observacion": "..." }` (obligatoria al rechazar) y responden `{ "id": 44, "tipo": "MERMA", "estado": "APROBADO" }`. `409` si ya se resolvió.

### Producción

`GET /stock/producibles/`:

```json
{ "resultados": [{ "producto": { "id": 108, "nombre": "Medialuna de manteca", "...": "...", "controla_vencimiento": true },
                   "receta": [{ "insumo": { "id": 303, "nombre": "Harina 000", "unidad": "KG", "stock_actual": 9.04 }, "cantidad": 0.04 }] }],
  "hay_mas": false }
```

`POST /stock/producciones/` (con `Idempotency-Key`): `{ "producto": 108, "cantidad": 24, "fecha_vencimiento": "2026-11-14", "observacion": "Tanda de la mañana" }`. Respuesta `201`: `{ "producto": { "id": 108, "nombre": "..." }, "cantidad": 24, "lote": { "id": 40, "numero": "P12", "vence": "2026-11-14", "dias": 1, "cantidad": 24 } }`.

## Clientes (con el token de Firebase)

| Pedido | Qué hace |
|---|---|
| `GET /clientes/yo/` | Devuelve la ficha del cliente vinculada a esa cuenta de Firebase (incluyendo `nombre`, `apellido`, `telefono`, `fecha_nacimiento` y `acepta_promociones` para hidratar Perfil en cualquier dispositivo). `404` **sin** `codigo` si todavía no hay ninguna: solo en ese caso la app llama a `vincular`. |
| `POST /clientes/vincular/` | Con `{ "nombre", "apellido", "telefono", "dni", "fecha_nacimiento", "acepta_promociones" }`, vincula la ficha o la crea. Responde lo mismo que `GET /clientes/yo/`. El `dni` sirve para elegir entre fichas con el mismo correo y, en el alta, en lugar del teléfono. |
| `PATCH /clientes/yo/` | Con `{ "nombre", "apellido", "telefono", "fecha_nacimiento", "acepta_promociones" }`, actualiza los datos personales de la ficha vinculada cuando el cliente los edita en `Perfil` y devuelve la cuenta actualizada (`200`). Si el teléfono ya pertenece a otra ficha, responde `400` con `codigo: "TELEFONO_DE_OTRO_CLIENTE"`. |

Cómo se encuentra la ficha:

1. Primero por `uid_firebase`: una vez vinculada, el correo ya no importa.
2. Si no hay, por `email_cliente` (sin distinguir mayúsculas, solo fichas vigentes). Si hay una sola, se le guarda el `uid_firebase`.
3. Si no hay ninguna, se crea con el mismo formulario que la web: entra por la categoría de ingreso y recibe su `qr_cliente`.
4. **Nunca** se vincula por teléfono ni por DNI solos: no están verificados, y cualquiera podría quedarse con los puntos de otra persona.

```json
{ "qr": "CAF-3F9A1C7B2E", "categoria": "Silver", "puntos_disponibles": 320, "puntos_acumulados": 1840,
  "proxima_categoria": "Gold", "puntos_proxima_categoria": 5000,
  "categorias": [{ "nombre": "Bronze", "puntos_minimos": 0, "desde": "Desde que creás tu cuenta", "tasa": "1 pto c/ $100" }],
  "movimientos": [{ "id": 9, "fecha": "12 nov", "concepto": "Compra en caja", "puntos": 38 }] }
```

- La app muestra ese `qr` en «Mi QR»: es el mismo código que lee `Cliente.identificar()` en el mostrador.
- Si `desde` no viene, la app lo arma con `puntos_minimos`.

| Respuesta | Cuándo | Qué muestra la app |
|---|---|---|
| `401` | El token de Firebase no vale o venció. | «No pudimos traer tus puntos» con «Reintentar» (Firebase renueva el token solo). |
| `403` | El correo de la cuenta no está verificado. | Que abra el enlace del correo y vuelva a probar. |
| `409` `CORREO_REPETIDO` | Hay más de una ficha vigente con ese correo. | Un campo para el DNI. Con el DNI, `POST /clientes/vincular/` elige la única ficha de esas que lo tiene. |
| `409` `DNI_NO_COINCIDE` | El DNI no es el de ninguna de esas fichas. | Que lo revise o se acerque a la caja. |
| `429` `DEMASIADOS_INTENTOS` | Más de 5 DNI probados en una hora. Trae `Retry-After`. | Que espere o se acerque a la caja. |
| `404` `FICHA_DADA_DE_BAJA` | La ficha vinculada a la cuenta está dada de baja. | Que pase por la caja. |
| `409` `FICHA_DE_OTRA_CUENTA` | La ficha que corresponde ya está vinculada a otra cuenta de la app. | Que pase por la caja. |
| `400` `FALTA_TELEFONO_O_DNI` | Al crear la ficha no vino ni el teléfono ni el DNI: es con lo que se identifica al cliente en la caja (RN-7.1.2, igual que en la web). | Un formulario ahí mismo para cargar el teléfono o el DNI. El registro de la app ya pide al menos uno. |
| `400` `TELEFONO_DE_OTRO_CLIENTE` | Al crear la ficha, el teléfono ya es de otro cliente. | Si el número es suyo, que pida en la caja que agreguen su correo a esa ficha; si se equivocó, que lo corrija en su perfil. |
| `400` `DNI_DE_OTRO_CLIENTE` | Al crear la ficha, el DNI ya es de otro cliente. | Que pida en la caja que agreguen su correo a esa ficha. |
| `400` con `errores` | Al crear la ficha falta un dato (por ejemplo, el apellido). | Qué dato completar en su perfil. |
| `503` `CLIENTES_SIN_CONFIGURAR` | El servidor no tiene la credencial de Firebase. | Que el local está terminando de conectar los puntos, y que en la caja lo buscan por DNI o teléfono. |

Para que el `503` no aparezca, el servidor necesita la credencial de servicio de Firebase (ver «Puesta en marcha de los clientes»).

### Puesta en marcha de los clientes

1. En la consola de Firebase: Configuración del proyecto, Cuentas de servicio, Generar nueva clave privada. Se descarga un archivo JSON.
2. Guardarlo en el proyecto web como `secretos/firebase.json`. La carpeta `secretos/` está en `.gitignore`: **esa clave nunca se sube al repositorio**, porque con ella cualquiera puede actuar como el servidor.
3. `docker-compose.yml` la monta como solo lectura en `/run/secrets/firebase.json` y le pasa a Django la ruta en `CAFETO_FIREBASE_CREDENCIAL`.
4. Reconstruir y levantar el contenedor, y probar con `python manage.py probar_firebase`: dice qué falta (la librería, la variable o el archivo) o que está todo bien.

## Código de referencia para Django

Este es el código de partida que se usó para empezar `api_movil`. El que vale es el del proyecto web: si hay diferencias, manda ese, y este documento se corrige.

### 1. Dejar pasar la API en el middleware

`seguridad.middleware.SeguridadMiddleware` corta todo lo que no tenga sesión web. La API trae su propio token, así que su ruta tiene que quedar exenta:

```python
if (ruta in exentas or ruta.startswith(estaticos)
        or ruta.startswith('/api/movil/')
        or (settings.DEBUG and ruta.startswith('/admin'))):
    return self.get_response(request)
```

### 2. Rutas

`cafeto/urls.py`:

```python
path('api/movil/', include('api_movil.urls')),
```

`api_movil/urls.py`:

```python
from django.urls import path
from . import views, views_catalogo

urlpatterns = [
    path('sesion/', views.sesion),
    path('marcas/', views.marcas),
    path('marcas/<int:pk>/', views.marca),
    path('catalogo/destacados/', views_catalogo.destacados),
    path('catalogo/productos/', views_catalogo.productos),
    path('catalogo/rubros/', views_catalogo.rubros),
    path('catalogo/beneficios/', views_catalogo.beneficios),
    path('stock/productos/', views_catalogo.consulta),
    path('stock/alertas/', views_catalogo.alertas),
]
```

`/rubros/` sigue el mismo modelo que `/marcas/` (`views.marcas` y `views.marca`), con el campo `activo`.

### 3. Sesión y Marcas (`api_movil/views.py`)

```python
import json

from django.core import signing
from django.core.exceptions import ValidationError
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt

from nucleo import contexto
from seguridad.models import Usuario
from stock.models import Marca

SAL = 'cafeto.api_movil'
DURACION = 60 * 60 * 12
POR_PAGINA = 20
PERMISOS_MOVIL = [
    'ver_productos', 'ver_stock', 'contar_stock', 'registrar_merma', 'registrar_traspaso',
    'registrar_produccion', 'autorizar_ajustes', 'imprimir_ofertas', 'registrar_compra',
    'ver_ventas', 'ver_caja', 'gestionar_ordenes', 'ver_egresos', 'ver_auditoria', 'ver_reportes',
    'ver_marcas', 'crear_marca', 'editar_marca', 'eliminar_marca',
    'ver_rubros', 'crear_rubro', 'editar_rubro', 'eliminar_rubro',
]
CAMPOS = {'nombre_marca': 'nombre', 'descripcion_marca': 'descripcion'}


def _cuerpo(request):
    try:
        datos = json.loads(request.body or b'{}')
    except ValueError:
        return {}
    return datos if isinstance(datos, dict) else {}


def _pagina(request):
    try:
        return min(100000, max(1, int(request.GET.get('pagina', 1))))
    except ValueError:
        return 1


def usuario_del_token(request):
    cabecera = request.headers.get('Authorization', '')
    if not cabecera.startswith('Token '):
        return None
    try:
        id_usuario = signing.loads(cabecera[6:], salt=SAL, max_age=DURACION)
    except signing.BadSignature:
        return None
    return Usuario.objects.filter(pk=id_usuario, activo=True).first()


def sin_permiso(usuario, codigo):
    if usuario is None:
        return JsonResponse({'detail': 'Tu sesión venció. Volvé a entrar.'}, status=401)
    if not usuario.tiene_permiso(codigo):
        return JsonResponse({'detail': 'Tu usuario no tiene permiso para hacer esto.'}, status=403)
    return None


def _marca(m):
    return {'id': m.id_marca, 'nombre': m.nombre_marca, 'descripcion': m.descripcion_marca}


def _errores(error):
    return {CAMPOS.get(campo, 'nombre'): mensajes for campo, mensajes in error.message_dict.items()}


@csrf_exempt
def sesion(request):
    if request.method == 'DELETE':
        return HttpResponse(status=204)
    if request.method != 'POST':
        return JsonResponse({'detail': 'Método no permitido.'}, status=405)

    datos = _cuerpo(request)
    usuario = Usuario.objects.filter(
        nombre_usuario=str(datos.get('usuario', '')).strip().lower(), activo=True).first()
    if usuario is None or not usuario.verificar_clave(str(datos.get('clave', ''))):
        return JsonResponse({'detail': 'El usuario o la contraseña no coinciden.'}, status=401)
    if usuario.debe_cambiar_clave:
        return JsonResponse({'detail': 'Tenés que cambiar tu contraseña provisoria desde la web '
                                       'antes de entrar desde el celular.'}, status=403)

    return JsonResponse({
        'token': signing.dumps(usuario.pk, salt=SAL),
        'usuario': {
            'nombre': usuario.nombre,
            'apellido': usuario.apellido,
            'perfil': usuario.perfil_efectivo.nombre,
            'es_administrador': usuario.es_administrador,
            'es_titular': usuario.es_titular,
            'permisos': [p for p in PERMISOS_MOVIL if usuario.tiene_permiso(p)],
        },
    })


@csrf_exempt
def marcas(request):
    usuario = usuario_del_token(request)

    if request.method == 'GET':
        bloqueo = sin_permiso(usuario, 'ver_marcas')
        if bloqueo:
            return bloqueo
        consulta = Marca.objects.filter(borrado_logico=False).order_by('nombre_marca')
        texto = request.GET.get('q', '').strip()
        if texto:
            consulta = consulta.filter(nombre_marca__icontains=texto)
        desde = (_pagina(request) - 1) * POR_PAGINA
        filas = list(consulta[desde:desde + POR_PAGINA + 1])
        return JsonResponse({
            'resultados': [_marca(m) for m in filas[:POR_PAGINA]],
            'hay_mas': len(filas) > POR_PAGINA,
        })

    if request.method == 'POST':
        bloqueo = sin_permiso(usuario, 'crear_marca')
        if bloqueo:
            return bloqueo
        datos = _cuerpo(request)
        nueva = Marca(nombre_marca=datos.get('nombre'), descripcion_marca=datos.get('descripcion'))
        try:
            with contexto.usar(usuario):
                nueva.full_clean()
                nueva.save()
        except ValidationError as error:
            return JsonResponse({'errores': _errores(error)}, status=400)
        return JsonResponse(_marca(nueva), status=201)

    return JsonResponse({'detail': 'Método no permitido.'}, status=405)


@csrf_exempt
def marca(request, pk):
    usuario = usuario_del_token(request)
    existente = Marca.objects.filter(pk=pk, borrado_logico=False).first()

    if request.method == 'PATCH':
        bloqueo = sin_permiso(usuario, 'editar_marca')
        if bloqueo:
            return bloqueo
        if existente is None:
            return JsonResponse({'detail': 'Esa marca ya no existe.'}, status=404)
        datos = _cuerpo(request)
        if 'nombre' in datos:
            existente.nombre_marca = datos['nombre']
        if 'descripcion' in datos:
            existente.descripcion_marca = datos['descripcion']
        try:
            with contexto.usar(usuario):
                existente.full_clean()
                existente.save()
        except ValidationError as error:
            return JsonResponse({'errores': _errores(error)}, status=400)
        return JsonResponse(_marca(existente))

    if request.method == 'DELETE':
        bloqueo = sin_permiso(usuario, 'eliminar_marca')
        if bloqueo:
            return bloqueo
        if existente is None:
            return JsonResponse({'detail': 'Esa marca ya no existe.'}, status=404)
        motivos = existente.motivos_que_impiden_la_baja()
        if motivos:
            return JsonResponse({'detail': 'No se puede dar de baja: ' + '; '.join(motivos) + '.'},
                                status=409)
        with contexto.usar(usuario):
            existente.borrado_logico = True
            existente.save()
        return HttpResponse(status=204)

    return JsonResponse({'detail': 'Método no permitido.'}, status=405)
```

### 4. Catálogo y stock (`api_movil/views_catalogo.py`)

```python
from decimal import Decimal

from django.db.models import Q
from django.http import JsonResponse
from django.utils import timezone

from fidelizacion.models import Beneficio
from negocio.models import ParametrosNegocio
from stock import servicios
from stock.models import Producto, Rubro, TIPOS_CON_STOCK, TipoProducto

from .views import POR_PAGINA, _pagina, sin_permiso, usuario_del_token

SECCIONES = {
    'CAFETERIA': [TipoProducto.ELABORADO, TipoProducto.PRODUCIDO, TipoProducto.COMBO],
    'MINISUPER': [TipoProducto.REVENTA],
}
GRAVEDAD = {'VENCIDO': 0, 'SIN_STOCK': 1, 'POR_VENCER': 2, 'STOCK_BAJO': 3}


def _seccion(tipo):
    return next((clave for clave, tipos in SECCIONES.items() if tipo in tipos), None)


def _numero(valor):
    return float(valor) if valor is not None else None


def _presentacion(p):
    if p.tipo_producto == TipoProducto.COMBO:
        return 'Combo'
    if p.fraccionable:
        return f'Por {p.get_unidad_medida_display().lower()}'
    if p.unidad_medida == 'UNIDAD':
        return 'Unidad'
    contenido = format(p.contenido.normalize(), 'f').replace('.', ',')
    return f'{contenido} {p.unidad_medida.lower()}'


def _lote_siguiente(p, hoy):
    return p.lotes.filter(stock_lote__gt=0, fecha_vencimiento__gte=hoy).order_by('fecha_vencimiento').first()


def _oferta(p, hoy):
    rebaja = p.rebaja_vigente()
    lote = _lote_siguiente(p, hoy) if rebaja else None
    if not lote or lote.dias_para_vencer(hoy) > rebaja[0]:
        return None, None
    precio = (p.precio_venta * (100 - rebaja[1]) / 100).quantize(Decimal('1'))
    return float(precio), float(rebaja[1])


def _disponible(p, hoy):
    if p.tipo_producto not in TIPOS_CON_STOCK:
        return True
    return p.stock_actual - servicios.vencido(p, hoy) > 0


def producto_publico(p, hoy, motivo=None):
    precio_oferta, porcentaje = _oferta(p, hoy)
    datos = {
        'id': p.id_producto,
        'nombre': p.nombre_producto,
        'descripcion': '',
        'presentacion': _presentacion(p),
        'precio': float(p.precio_venta),
        'precio_oferta': precio_oferta,
        'porcentaje_oferta': porcentaje,
        'seccion': _seccion(p.tipo_producto),
        'tipo': p.tipo_producto,
        'rubro': {'id': p.id_rubro_id, 'nombre': p.id_rubro.nombre_rubro},
        'marca': None if p.id_marca.nombre_marca == 'Sin marca'
        else {'id': p.id_marca_id, 'nombre': p.id_marca.nombre_marca},
        'imagen': None,
        'icono': None,
        'disponible': _disponible(p, hoy),
    }
    if motivo:
        datos['motivo'] = motivo
    return datos


def _publicables():
    return (Producto.objects
            .filter(borrado_logico=False, precio_venta__gt=0,
                    tipo_producto__in=SECCIONES['CAFETERIA'] + SECCIONES['MINISUPER'])
            .select_related('id_rubro', 'id_marca'))


def _paginar(request, consulta, convertir):
    desde = (_pagina(request) - 1) * POR_PAGINA
    filas = list(consulta[desde:desde + POR_PAGINA + 1])
    return JsonResponse({
        'resultados': [convertir(f) for f in filas[:POR_PAGINA]],
        'hay_mas': len(filas) > POR_PAGINA,
    })


def destacados(request):
    hoy = timezone.localdate()
    combos = [producto_publico(p, hoy, 'COMBO')
              for p in _publicables().filter(tipo_producto=TipoProducto.COMBO).order_by('nombre_producto')]
    ofertas = []
    for p in _publicables().filter(controla_vencimiento=True).exclude(tipo_producto=TipoProducto.COMBO):
        datos = producto_publico(p, hoy, 'OFERTA')
        if datos['precio_oferta'] is not None and datos['disponible']:
            ofertas.append(datos)
    ofertas.sort(key=lambda d: -d['porcentaje_oferta'])
    return JsonResponse({'resultados': (combos + ofertas)[:8], 'hay_mas': False})


def productos(request):
    seccion = request.GET.get('seccion', '')
    if seccion not in SECCIONES:
        return JsonResponse({'detail': 'Elegí Cafetería o Minisuper.'}, status=400)
    consulta = _publicables().filter(tipo_producto__in=SECCIONES[seccion]).order_by('nombre_producto')
    rubro = request.GET.get('rubro', '')
    if rubro.isdigit():
        consulta = consulta.filter(id_rubro_id=int(rubro))
    texto = request.GET.get('q', '').strip()
    if texto:
        consulta = consulta.filter(Q(nombre_producto__unaccent__icontains=texto)
                                   | Q(id_marca__nombre_marca__unaccent__icontains=texto)
                                   | Q(id_rubro__nombre_rubro__unaccent__icontains=texto))
    hoy = timezone.localdate()
    return _paginar(request, consulta, lambda p: producto_publico(p, hoy))


def rubros(request):
    seccion = request.GET.get('seccion', '')
    if seccion not in SECCIONES:
        return JsonResponse({'detail': 'Elegí Cafetería o Minisuper.'}, status=400)
    usados = _publicables().filter(tipo_producto__in=SECCIONES[seccion]).values('id_rubro')
    filas = Rubro.objects.filter(borrado_logico=False, id_rubro__in=usados).order_by('nombre_rubro')
    return JsonResponse({'resultados': [{'id': r.id_rubro, 'nombre': r.nombre_rubro} for r in filas],
                         'hay_mas': False})


def beneficios(request):
    hoy = timezone.localdate()
    filas = (Beneficio.objects
             .filter(borrado_logico=False, vigencia_desde__lte=hoy)
             .filter(Q(vigencia_hasta__isnull=True) | Q(vigencia_hasta__gte=hoy))
             .select_related('id_categoria')
             .order_by('id_categoria__puntos_minimos', 'puntos_requeridos'))
    resultados = []
    for b in filas:
        detalle = (f'{_numero(b.porcentaje_descuento):g}% de descuento'
                   if b.modo_entrega == 'DESCUENTO' and b.porcentaje_descuento is not None
                   else 'Retirás en el mostrador')
        resultados.append({
            'id': b.id_beneficio,
            'titulo': b.descripcion_beneficio,
            'detalle': detalle,
            'tipo': b.tipo_beneficio,
            'puntos': b.puntos_requeridos or 0,
            'categoria': b.id_categoria.nombre_categoria,
            'icono': None,
        })
    return JsonResponse({'resultados': resultados, 'hay_mas': False})


def _alertas_de(p, hoy, dias_aviso):
    alertas = []
    if p.tipo_producto in TIPOS_CON_STOCK and p.stock_minimo > 0:
        if p.stock_actual <= 0:
            alertas.append('SIN_STOCK')
        elif p.stock_actual < p.stock_minimo:
            alertas.append('STOCK_BAJO')
    lotes = list(p.lotes.filter(stock_lote__gt=0))
    if any(l.fecha_vencimiento < hoy for l in lotes):
        alertas.append('VENCIDO')
    if any(0 <= l.dias_para_vencer(hoy) <= dias_aviso for l in lotes):
        alertas.append('POR_VENCER')
    return alertas


def consulta(request):
    usuario = usuario_del_token(request)
    bloqueo = sin_permiso(usuario, 'ver_productos')
    if bloqueo:
        return bloqueo
    hoy = timezone.localdate()
    dias_aviso = ParametrosNegocio.vigentes().dias_aviso_vencimiento
    filas = Producto.objects.filter(borrado_logico=False).select_related('id_rubro', 'id_marca')
    codigo = request.GET.get('codigo', '').strip()
    texto = request.GET.get('q', '').strip()
    if codigo:
        filas = filas.filter(codigo_barras=codigo)
    elif texto:
        filas = filas.filter(Q(nombre_producto__unaccent__icontains=texto)
                             | Q(id_marca__nombre_marca__unaccent__icontains=texto)
                             | Q(id_rubro__nombre_rubro__unaccent__icontains=texto)
                             | Q(codigo_barras__icontains=texto))

    def convertir(p):
        datos = producto_publico(p, hoy)
        lote = _lote_siguiente(p, hoy)
        con_stock = p.tipo_producto in TIPOS_CON_STOCK
        datos.update({
            'codigo_barras': p.codigo_barras,
            'stock_actual': float(p.stock_actual) if con_stock else None,
            'stock_minimo': float(p.stock_minimo) if con_stock else None,
            'controla_vencimiento': p.controla_vencimiento,
            'proximo_vencimiento': {
                'fecha': lote.fecha_vencimiento.isoformat(),
                'dias': lote.dias_para_vencer(hoy),
                'cantidad': float(lote.stock_lote),
                'lote': lote.numero_lote or '',
            } if lote else None,
            'alertas': _alertas_de(p, hoy, dias_aviso),
        })
        return datos

    return _paginar(request, filas.order_by('nombre_producto'), convertir)


def alertas(request):
    usuario = usuario_del_token(request)
    bloqueo = sin_permiso(usuario, 'ver_stock')
    if bloqueo:
        return bloqueo
    tipo = request.GET.get('tipo', 'TODAS')
    hoy = timezone.localdate()
    dias_aviso = ParametrosNegocio.vigentes().dias_aviso_vencimiento
    resultados = []
    for p in Producto.objects.filter(borrado_logico=False).select_related('id_rubro'):
        for clase in _alertas_de(p, hoy, dias_aviso):
            if tipo == 'STOCK' and clase not in ('SIN_STOCK', 'STOCK_BAJO'):
                continue
            if tipo == 'VENCIMIENTO' and clase not in ('VENCIDO', 'POR_VENCER'):
                continue
            resultados.append({
                'id': f'{clase}-{p.id_producto}',
                'tipo': clase,
                'producto': {'id': p.id_producto, 'nombre': p.nombre_producto, 'presentacion': _presentacion(p)},
                'detalle': '',
                'dias': None,
                'fecha': None,
            })
    resultados.sort(key=lambda a: (GRAVEDAD[a['tipo']], a['producto']['nombre']))
    return JsonResponse({'resultados': resultados, 'hay_mas': False})
```

`__unaccent` necesita la extensión `unaccent` de PostgreSQL (`django.contrib.postgres` en `INSTALLED_APPS` y `CREATE EXTENSION unaccent;`). Si no la quieren activar, usen `__icontains` y la búsqueda va a distinguir tildes.

## Decisiones tomadas

| Tema | Qué se decidió |
|---|---|
| Sesión del celular | Una `SesionMovil` aparte de la sesión web: no cierra la web (DD-01), se puede cerrar desde el servidor y deja el id en la auditoría. Una sola por usuario. |
| Intentos fallidos | `POST /sesion/` usa la misma lógica que la web (`IntentoAcceso`) y responde `429` con `Retry-After`. |
| Claves de `Idempotency-Key` | Se guardan por usuario durante 24 h. Una operación rechazada (por ejemplo, por costos raros) no gasta la clave. |
| Auditoría | Conteos, mermas, traspasos, producciones y recepciones dejan `registrar_auditoria` igual que en la web, con la sesión móvil. |
| Credencial de Firebase | Archivo JSON fuera del repositorio, montado como solo lectura en el contenedor (ver «Puesta en marcha de los clientes»). |
| Dos fichas con el mismo correo | No se elige una al azar: se pide el DNI. Además, el alta y la edición de clientes no dejan repetir el correo entre fichas vigentes; el comando `clientes_correo_repetido` lista las que ya están repetidas, y el panel de la web avisa a quien ve clientes para que las unifique. |
| Clientes que ya existían | El cajero carga el correo en la ficha desde la web, con el cliente presente. La próxima vez que abra la app, se vincula sola. |
| Categorías del club | Vienen del servidor (`categorias`), no están fijas en la app. |
| Costos raros al recibir | Igual que la web: se piden confirmar (`COSTOS_RAROS`). |
| Conteo a ciegas | El servidor no manda el teórico y la app no muestra stock mientras se cuenta. Quien tiene permiso para consultar productos igual puede ver el stock desde «Consultar producto»: es una decisión de permisos de cada perfil, no de la app. |

## Decisiones pendientes para el equipo

1. **HTTPS.** Dentro del local, la API funciona por `http` en la red. Para usarla fuera del local, o para publicar la app, tiene que ir por HTTPS: el token viaja en cada pedido, y Android no deja que una app publicada use `http`.
2. **Fotos de productos.** `Producto` no tiene campo de imagen. Si se agrega (por ejemplo `imagen_url`), la app ya sabe mostrar una URL `https://` y, si no carga, vuelve al ícono. Depende del punto 1: Android no carga imágenes por `http` en la app publicada.
