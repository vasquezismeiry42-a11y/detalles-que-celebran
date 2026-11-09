document.addEventListener('DOMContentLoaded', async () => {
    // Crea un elemento con texto seguro (nunca interpreta HTML)
    const crear = (tag, texto, clase) => {
        const e = document.createElement(tag);
        if (clase) e.className = clase;
        if (texto !== undefined) e.textContent = texto;
        return e;
    };

    // Cargar servicios en servicios.html
    const serviciosContainer = document.getElementById('servicios-container');
    if (serviciosContainer) {
        try {
            const { data, error } = await supabaseClient
                .from('servicios')
                .select('*')
                .order('orden', { ascending: true });
            
            if (error) throw error;

            serviciosContainer.replaceChildren();
            data.forEach(servicio => {
                const card = crear('div', undefined, 'servicio-card');
                const enlace = crear('a', 'Pedir ahora', 'btn-primary');
                enlace.href = 'pedido.html?servicio=' + encodeURIComponent(servicio.nombre);
                card.append(
                    crear('div', servicio.icono || '🎁', 'servicio-icon'),
                    crear('h3', servicio.nombre),
                    crear('p', servicio.descripcion || ''),
                    enlace
                );
                serviciosContainer.appendChild(card);
            });
        } catch (err) {
            console.error('Error cargando servicios:', err.message);
            serviciosContainer.innerHTML = '<p class="error">No se pudieron cargar los servicios. Verifica tu conexión.</p>';
        }
    }

    // Manejar formulario de pedidos en pedido.html
    const pedidoForm = document.getElementById('pedido-form');
    if (pedidoForm) {
        const selectServicio = document.getElementById('servicio-select');
        const servicioParam = new URLSearchParams(window.location.search).get('servicio');

        if (selectServicio) {
            // Llenar la lista con los servicios de Supabase.
            // Si falla, se queda la lista que ya trae la página.
            try {
                const { data, error } = await supabaseClient
                    .from('servicios')
                    .select('nombre')
                    .order('orden', { ascending: true });

                if (error) throw error;

                if (data && data.length) {
                    selectServicio.replaceChildren(
                        new Option('Selecciona un servicio', ''),
                        ...data.map(s => new Option(s.nombre, s.nombre))
                    );
                }
            } catch (err) {
                console.error('Error cargando la lista de servicios:', err.message);
            }

            // Marcar el servicio que viene en el enlace (servicios o galería)
            if (servicioParam) {
                const buscado = servicioParam.slice(0, 80);
                const coincide = [...selectServicio.options]
                    .find(o => o.value.toLowerCase() === buscado.toLowerCase());
                if (coincide) {
                    selectServicio.value = coincide.value;
                } else {
                    selectServicio.add(new Option(buscado, buscado));
                    selectServicio.value = buscado;
                }
            }
        }

        // Mostrar la dirección solo si la entrega es a domicilio
        // Advertencias cuando el servicio es de globos con helio
        const avisoHelio = document.getElementById('aviso-helio');
        const alternarHelio = () => { avisoHelio.hidden = !/helio/i.test(selectServicio ? selectServicio.value : ''); };
        if (selectServicio) selectServicio.addEventListener('change', alternarHelio);
        alternarHelio();

        const tipoEntrega = document.getElementById('entrega-tipo');
        const grupoDir = document.getElementById('grupo-direccion');
        const campoDir = document.getElementById('entrega-direccion');
        const alternarDireccion = () => {
            const domicilio = tipoEntrega.value === 'Entrega a domicilio';
            grupoDir.hidden = !domicilio;
            campoDir.required = domicilio;
        };
        tipoEntrega.addEventListener('change', alternarDireccion);
        alternarDireccion();
        document.getElementById('cliente-fecha').min = new Date().toISOString().slice(0, 10);

        const valor = id => document.getElementById(id).value.trim();
        const opcional = id => valor(id) || null;

        const aviso = document.getElementById('aviso');
        const boton = pedidoForm.querySelector('button[type="submit"]');
        const textoBoton = boton.textContent;
        const modal = document.getElementById('exito-modal');
        pedidoForm.noValidate = true; // los avisos los mostramos nosotros, dentro de la página

        const quitarError = (grupo) => {
            grupo.classList.remove('campo-error');
            const m = grupo.querySelector('.error-campo');
            if (m) m.remove();
        };
        const mostrarAviso = (texto) => {
            aviso.textContent = texto;
            aviso.hidden = false;
            aviso.classList.remove('sacudir');
            void aviso.offsetWidth;
            aviso.classList.add('sacudir');
        };

        // El error de cada campo desaparece en cuanto la persona lo corrige
        pedidoForm.addEventListener('input', (e) => {
            const grupo = e.target.closest('.form-group');
            if (grupo) quitarError(grupo);
        });

        const validar = () => {
            pedidoForm.querySelectorAll('.campo-error').forEach(quitarError);
            let primero = null;
            pedidoForm.querySelectorAll('input, select, textarea').forEach(campo => {
                if (campo.closest('[hidden]') || campo.validity.valid) return;
                const grupo = campo.closest('.form-group');
                grupo.classList.add('campo-error');
                const m = document.createElement('small');
                m.className = 'error-campo';
                m.textContent = campo.type === 'checkbox' ? 'Marca la casilla para continuar.'
                    : campo.validity.valueMissing ? 'Este campo es obligatorio.'
                    : campo.validity.rangeUnderflow ? 'Esa fecha ya pasó, elige otra.'
                    : campo.validity.typeMismatch ? 'Revisa que el formato sea correcto.'
                    : 'Revisa este campo.';
                grupo.append(m);
                if (!primero) primero = campo;
            });
            return primero;
        };

        const mostrarExito = (pedido, horaTexto) => {
            const nombre = pedido.cliente.split(' ')[0];
            document.getElementById('exito-texto').textContent =
                'Gracias, ' + nombre + '. Recibimos tu pedido y nos pondremos en contacto contigo al ' + pedido.telefono + '.';

            const fecha = new Date(pedido.fecha_entrega + 'T00:00:00').toLocaleDateString('es-DO', { weekday: 'long', day: 'numeric', month: 'long' });
            const entrega = fecha + (horaTexto ? ', ' + horaTexto : '') + ' · ' + pedido.tipo_entrega;
            const filas = [['Servicio', pedido.servicio], ['Ocasión', pedido.ocasion], ['Entrega', entrega]];
            document.getElementById('exito-resumen').replaceChildren(...filas.map(([etiqueta, texto]) => {
                const li = document.createElement('li');
                const b = document.createElement('strong');
                b.textContent = etiqueta;
                li.append(b, texto);
                return li;
            }));

            const mensaje = 'Hola, acabo de hacer un pedido en la página.\nNombre: ' + pedido.cliente +
                '\nServicio: ' + pedido.servicio + '\nEntrega: ' + entrega;
            document.getElementById('exito-wa').href = 'https://wa.me/18092682392?text=' + encodeURIComponent(mensaje);
            modal.showModal();
        };

        document.getElementById('exito-otro').addEventListener('click', () => {
            modal.close();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.close(); });

        pedidoForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            aviso.hidden = true;

            const invalido = validar();
            if (invalido) {
                mostrarAviso('Revisa los campos marcados en rojo para poder enviar tu pedido.');
                invalido.scrollIntoView({ behavior: 'smooth', block: 'center' });
                invalido.focus({ preventScroll: true });
                return;
            }

            // Hora en formato 12 horas (AM/PM) -> se guarda en 24 horas
            const hh = valor('hora-h');
            let hora24 = null, horaTexto = '';
            if (hh) {
                const ap = valor('hora-ap'), mm = valor('hora-m');
                hora24 = String((Number(hh) % 12) + (ap === 'PM' ? 12 : 0)).padStart(2, '0') + ':' + mm + ':00';
                horaTexto = hh + ':' + mm + ' ' + ap;
            }
            const presupuesto = valor('presupuesto');
            const pedido = {
                cliente: valor('cliente-nombre'),
                telefono: valor('cliente-telefono'),
                correo: opcional('cliente-correo'),
                ocasion: valor('ocasion-select'),
                servicio: valor('servicio-select'),
                para_quien: opcional('para-quien'),
                dedicatoria: opcional('dedicatoria'),
                colores: opcional('colores'),
                tematica: opcional('tematica'),
                presupuesto: presupuesto ? Number(presupuesto) : null,
                detalles: opcional('cliente-detalles'),
                fecha_entrega: valor('cliente-fecha'),
                hora_entrega: hora24,
                tipo_entrega: valor('entrega-tipo'),
                direccion: tipoEntrega.value === 'Entrega a domicilio' ? opcional('entrega-direccion') : null,
                estado: 'Pendiente'
            };

            boton.disabled = true;
            const rueda = document.createElement('span');
            rueda.className = 'spinner';
            boton.replaceChildren(rueda, 'Enviando tu pedido…');

            try {
                const { error } = await supabaseClient.from('pedidos').insert([pedido]);
                if (error) throw error;

                mostrarExito(pedido, horaTexto);
                pedidoForm.reset();
                alternarDireccion();
                alternarHelio();
            } catch (err) {
                console.error('Error al guardar pedido:', err.message);
                const sinRed = !navigator.onLine || /fetch|network/i.test(err.message || '');
                mostrarAviso(sinRed
                    ? 'No hay conexión a internet. Revisa tu conexión e inténtalo de nuevo; tus datos siguen aquí.'
                    : 'No pudimos enviar tu pedido en este momento. Inténtalo de nuevo en unos minutos o escríbenos por WhatsApp.');
                aviso.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } finally {
                boton.disabled = false;
                boton.textContent = textoBoton;
            }
        });
    }
});