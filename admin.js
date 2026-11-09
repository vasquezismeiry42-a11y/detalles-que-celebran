let pedidos = [];
let pedidoEditando = null;

document.addEventListener('DOMContentLoaded', async () => {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('admin-email').value;
            const password = document.getElementById('admin-password').value;

            const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
            if (error) {
                alert('Error al iniciar sesión: ' + error.message);
            } else {
                window.location.href = 'admin.html';
            }
        });
    }

    const adminPanel = document.getElementById('admin-panel');
    if (adminPanel) {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) {
            window.location.href = 'login.html';
            return;
        }

        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                await supabaseClient.auth.signOut();
                window.location.href = 'login.html';
            });
        }

        prepararEdicion();
        prepararServicios();
        await cargarServicios();
        await cargarPedidos();
    }
});

// Todo lo que escribe el cliente se muestra como texto, nunca como HTML
function celda(lineas) {
    const td = document.createElement('td');
    td.textContent = [].concat(lineas).filter(x => x !== null && x !== undefined && x !== '').join('\n');
    return td;
}
function boton(texto, clase, accion) {
    const b = document.createElement('button');
    b.className = clase;
    b.textContent = texto;
    b.addEventListener('click', accion);
    return b;
}

async function cargarPedidos() {
    const tabla = document.getElementById('tabla-pedidos-body');
    if (!tabla) return;

    try {
        const { data, error } = await supabaseClient
            .from('pedidos')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        pedidos = data;

        tabla.replaceChildren();
        data.forEach(p => {
            const tr = document.createElement('tr');

            const estado = p.estado || 'Pendiente';
            const insignia = document.createElement('span');
            insignia.className = 'badge ' + estado.toLowerCase().replace(/[^a-z]/g, '');
            insignia.textContent = estado;
            const tdEstado = document.createElement('td');
            tdEstado.append(insignia);

            const tdAcciones = document.createElement('td');
            tdAcciones.append(
                boton('Editar', 'btn-sm', () => abrirEdicion(p.id)),
                ' ',
                boton('Completar', 'btn-sm btn-success', () => window.cambiarEstado(p.id, 'Completado')),
                ' ',
                boton('Eliminar', 'btn-sm btn-danger', () => window.eliminarPedido(p.id))
            );

            tr.append(
                celda(p.id),
                celda([p.cliente, p.telefono, p.correo]),
                celda([p.servicio, p.ocasion, p.para_quien ? 'Para: ' + p.para_quien : '']),
                celda([
                    [p.fecha_entrega, fmtHora(p.hora_entrega)].filter(Boolean).join(' '),
                    p.tipo_entrega,
                    p.direccion
                ]),
                celda(p.presupuesto ? 'RD$ ' + Number(p.presupuesto).toLocaleString() : '-'),
                tdEstado,
                tdAcciones
            );
            tabla.appendChild(tr);
        });
    } catch (err) {
        console.error('Error cargando pedidos:', err.message);
    }
}

// ---- Edición de pedidos ----
const CAMPOS = ['cliente', 'telefono', 'correo', 'ocasion', 'servicio', 'para_quien', 'colores', 'tematica',
    'presupuesto', 'fecha_entrega', 'hora_entrega', 'tipo_entrega', 'direccion', 'dedicatoria', 'detalles', 'estado'];
const OBLIGATORIOS = ['cliente', 'telefono', 'servicio', 'estado'];

async function prepararEdicion() {
    const modal = document.getElementById('editar-modal');
    const form = document.getElementById('editar-form');
    const msg = document.getElementById('editar-msg');
    const selServicio = document.getElementById('editar-servicio');

    document.getElementById('editar-cancelar').addEventListener('click', () => modal.close());

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        msg.textContent = '';
        form.elements.hora_entrega.value = leerHora();
        const cambios = {};
        CAMPOS.forEach(c => {
            const v = form.elements[c].value.trim();
            if (c === 'presupuesto') cambios[c] = v ? Number(v) : null;
            else cambios[c] = v || (OBLIGATORIOS.includes(c) ? v : null);
        });

        const { error } = await supabaseClient.from('pedidos').update(cambios).eq('id', pedidoEditando);
        if (error) {
            msg.textContent = 'No se pudo guardar: ' + error.message;
            return;
        }
        modal.close();
        await cargarPedidos();
    });
}

function abrirEdicion(id) {
    const p = pedidos.find(x => x.id === id);
    if (!p) return;
    pedidoEditando = id;

    const form = document.getElementById('editar-form');
    const selServicio = document.getElementById('editar-servicio');
    if (p.servicio && ![...selServicio.options].some(o => o.value === p.servicio)) {
        selServicio.add(new Option(p.servicio, p.servicio));
    }
    CAMPOS.forEach(c => {
        let v = p[c] ?? '';
        if (c === 'hora_entrega') v = String(v).slice(0, 5);
        form.elements[c].value = v;
    });
    ponerHora(p.hora_entrega);
    document.getElementById('editar-msg').textContent = '';
    document.getElementById('editar-modal').showModal();
}

window.cambiarEstado = async function(id, nuevoEstado) {
    try {
        const { error } = await supabaseClient
            .from('pedidos')
            .update({ estado: nuevoEstado })
            .eq('id', id);

        if (error) throw error;
        await cargarPedidos();
    } catch (err) {
        alert('Error al actualizar estado: ' + err.message);
    }
};

window.eliminarPedido = async function(id) {
    if (!confirm('¿Estás seguro de eliminar este pedido?')) return;
    try {
        const { error } = await supabaseClient
            .from('pedidos')
            .delete()
            .eq('id', id);

        if (error) throw error;
        await cargarPedidos();
    } catch (err) {
        alert('Error al eliminar pedido: ' + err.message);
    }
};

// ---- Hora en formato 12 horas (AM/PM) ----
function fmtHora(t) {
    if (!t) return '';
    const [h, m] = t.split(':');
    const n = Number(h);
    return (n % 12 || 12) + ':' + m + ' ' + (n >= 12 ? 'PM' : 'AM');
}
function ponerHora(t) {
    const hh = document.getElementById('ed-hh'), hm = document.getElementById('ed-hm'), hp = document.getElementById('ed-hp');
    if (!t) { hh.value = ''; hm.value = '00'; hp.value = 'AM'; return; }
    const [h, m] = t.split(':');
    const n = Number(h);
    hh.value = String(n % 12 || 12);
    if (![...hm.options].some(o => o.value === m)) hm.add(new Option(m, m));
    hm.value = m;
    hp.value = n >= 12 ? 'PM' : 'AM';
}
function leerHora() {
    const hh = document.getElementById('ed-hh').value;
    if (!hh) return '';
    const pm = document.getElementById('ed-hp').value === 'PM';
    return String((Number(hh) % 12) + (pm ? 12 : 0)).padStart(2, '0') + ':' + document.getElementById('ed-hm').value + ':00';
}

// ---- Gestión de servicios ----
let servicios = [];
let servicioEditando = null;

function prepararServicios() {
    const modal = document.getElementById('servicio-modal');
    const form = document.getElementById('servicio-form');
    const msg = document.getElementById('servicio-msg');

    document.getElementById('servicio-nuevo').addEventListener('click', () => abrirServicio(null));
    document.getElementById('servicio-cancelar').addEventListener('click', () => modal.close());

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        msg.textContent = '';
        const datos = {
            nombre: form.elements.nombre.value.trim(),
            descripcion: form.elements.descripcion.value.trim() || null,
            precio: form.elements.precio.value ? Number(form.elements.precio.value) : null,
            orden: Number(form.elements.orden.value) || 0
        };
        if (!datos.nombre) { msg.textContent = 'El nombre es obligatorio.'; return; }

        const { error } = servicioEditando
            ? await supabaseClient.from('servicios').update(datos).eq('id', servicioEditando)
            : await supabaseClient.from('servicios').insert([datos]);
        if (error) { msg.textContent = 'No se pudo guardar: ' + error.message; return; }

        modal.close();
        await cargarServicios();
    });
}

function abrirServicio(s) {
    const form = document.getElementById('servicio-form');
    servicioEditando = s ? s.id : null;
    document.getElementById('servicio-titulo').textContent = s ? 'Editar servicio' : 'Agregar servicio';
    form.elements.nombre.value = s ? s.nombre : '';
    form.elements.descripcion.value = s ? (s.descripcion || '') : '';
    form.elements.precio.value = s && s.precio !== null ? s.precio : '';
    form.elements.orden.value = s ? s.orden : (servicios.reduce((mx, x) => Math.max(mx, x.orden || 0), 0) + 1);
    document.getElementById('servicio-msg').textContent = '';
    document.getElementById('servicio-modal').showModal();
}

async function cargarServicios() {
    const tabla = document.getElementById('tabla-servicios-body');
    if (!tabla) return;
    try {
        const { data, error } = await supabaseClient.from('servicios').select('*').order('orden', { ascending: true });
        if (error) throw error;
        servicios = data;

        tabla.replaceChildren();
        data.forEach(s => {
            const tr = document.createElement('tr');
            const tdAcc = document.createElement('td');
            tdAcc.append(
                boton('Editar', 'btn-sm', () => abrirServicio(s)),
                ' ',
                boton('Eliminar', 'btn-sm btn-danger', async () => {
                    if (!confirm('¿Eliminar el servicio "' + s.nombre + '"?')) return;
                    const { error: err } = await supabaseClient.from('servicios').delete().eq('id', s.id);
                    if (err) { alert('No se pudo eliminar: ' + err.message); return; }
                    await cargarServicios();
                })
            );
            tr.append(celda(s.orden), celda(s.nombre), celda(s.descripcion || '-'),
                celda(s.precio ? 'RD$ ' + Number(s.precio).toLocaleString() : '-'), tdAcc);
            tabla.appendChild(tr);
        });

        // Mantener al día la lista de servicios del formulario "Editar pedido"
        const sel = document.getElementById('editar-servicio');
        const actual = sel.value;
        sel.replaceChildren(...data.map(x => new Option(x.nombre, x.nombre)));
        if (actual) sel.value = actual;
    } catch (err) {
        console.error('Error cargando servicios:', err.message);
    }
}