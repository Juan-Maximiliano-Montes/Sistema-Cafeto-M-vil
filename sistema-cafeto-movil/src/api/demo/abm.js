import { coincide, limpiar, normalizar } from '../../utilidades/texto';
import { validarTextoCatalogo } from '../../utilidades/validaciones';
import { enCola, guardarColeccion, leerColeccion } from './almacen';
import { exigirPermiso } from './equipo';
import { PRODUCTOS } from './datos';
import { esperar, fallar, fallarCampos, mismoId, ordenarPorNombre, paginar } from './utilidades';

export function crearAbmDemo({
  clave,
  semilla,
  permisos,
  maximoNombre,
  articulo,
  genero,
  campoProducto,
  conActivo,
  porDefecto = {},
  mensajeBaja,
}) {
  const final = genero === 'f' ? 'a' : 'o';

  const esValido = (item) =>
    Boolean(item) && Number.isInteger(item.id) && typeof item.nombre === 'string' && typeof item.baja === 'boolean';

  const leer = () => leerColeccion(clave, () => semilla.map((item) => ({ ...porDefecto, ...item, baja: false })), esValido);

  const publico = (item) => ({
    id: item.id,
    nombre: item.nombre,
    descripcion: item.descripcion ?? null,
    ...(conActivo ? { activo: item.activo !== false } : {}),
  });

  const productosVigentes = (id) => PRODUCTOS.filter((producto) => producto[campoProducto] === id).length;

  function validar(datos, lista, idPropio) {
    const errores = {};
    const errorNombre = validarTextoCatalogo(datos.nombre, { etiqueta: 'El nombre', minimo: 2, maximo: maximoNombre });
    const errorDescripcion = validarTextoCatalogo(datos.descripcion, {
      etiqueta: 'La descripción',
      minimo: 1,
      maximo: 120,
      obligatorio: false,
    });
    if (errorNombre) errores.nombre = [errorNombre];
    if (errorDescripcion) errores.descripcion = [errorDescripcion];
    if (conActivo && typeof datos.activo !== 'boolean') errores.activo = ['Indicá si se ofrece o no.'];

    if (!errores.nombre) {
      const repetido = lista.find(
        (item) => !mismoId(item.id, idPropio) && normalizar(item.nombre) === normalizar(datos.nombre)
      );
      if (repetido) {
        errores.nombre = [
          repetido.baja
            ? `Ya existe ${articulo} con ese nombre, pero está dad${final} de baja. Reactival${final} desde la web.`
            : `Ya existe ${articulo} con ese nombre.`,
        ];
      }
    }

    if (Object.keys(errores).length > 0) throw fallarCampos(errores);
    return {
      nombre: limpiar(datos.nombre),
      descripcion: limpiar(datos.descripcion) || null,
      ...(conActivo ? { activo: datos.activo } : {}),
    };
  }

  async function listar(token, { busqueda = '', pagina = 1 } = {}) {
    await esperar();
    exigirPermiso(token, permisos.ver);
    const vigentes = (await leer()).filter((item) => !item.baja && coincide(item.nombre, busqueda));
    const pagina_ = paginar(ordenarPorNombre(vigentes), pagina);
    return { resultados: pagina_.resultados.map(publico), hay_mas: pagina_.hay_mas };
  }

  async function crear(token, datos) {
    await esperar();
    exigirPermiso(token, permisos.crear);
    const entrada = datos && typeof datos === 'object' ? datos : {};
    return enCola(clave, async () => {
      const lista = await leer();
      const limpio = validar({ ...entrada, activo: conActivo ? entrada.activo ?? true : undefined }, lista, null);
      const nuevo = {
        ...porDefecto,
        id: lista.reduce((mayor, item) => Math.max(mayor, item.id), 0) + 1,
        ...limpio,
        baja: false,
      };
      await guardarColeccion(clave, [...lista, nuevo]);
      return publico(nuevo);
    });
  }

  async function editar(token, id, datos) {
    await esperar();
    exigirPermiso(token, permisos.editar);
    const entrada = datos && typeof datos === 'object' ? datos : {};
    return enCola(clave, async () => {
      const lista = await leer();
      const actual = lista.find((item) => mismoId(item.id, id) && !item.baja);
      if (!actual) throw fallar(404, `Es${genero === 'f' ? 'a' : 'e'} ${articulo.split(' ')[1]} ya no existe.`);
      const combinado = {
        nombre: 'nombre' in entrada ? entrada.nombre : actual.nombre,
        descripcion: 'descripcion' in entrada ? entrada.descripcion : actual.descripcion,
        activo: conActivo ? ('activo' in entrada ? entrada.activo : actual.activo !== false) : undefined,
      };
      const limpio = validar(combinado, lista, actual.id);
      const editado = { ...actual, ...limpio };
      await guardarColeccion(
        clave,
        lista.map((item) => (item.id === actual.id ? editado : item))
      );
      return publico(editado);
    });
  }

  async function darDeBaja(token, id) {
    await esperar();
    exigirPermiso(token, permisos.eliminar);
    return enCola(clave, async () => {
      const lista = await leer();
      const actual = lista.find((item) => mismoId(item.id, id) && !item.baja);
      if (!actual) throw fallar(404, `Es${genero === 'f' ? 'a' : 'e'} ${articulo.split(' ')[1]} ya no existe.`);
      const cantidad = productosVigentes(actual.id);
      if (cantidad > 0) throw fallar(409, mensajeBaja(cantidad));
      await guardarColeccion(
        clave,
        lista.map((item) => (item.id === actual.id ? { ...item, baja: true } : item))
      );
      return null;
    });
  }

  return { leer, listar, crear, editar, darDeBaja };
}
