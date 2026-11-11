document.addEventListener('DOMContentLoaded', async () => {

    // =====================================
    // CREAR ELEMENTOS DE FORMA SEGURA
    // =====================================

    const crear = (tag, texto, clase) => {
        const e = document.createElement(tag);

        if (clase) e.className = clase;

        if (texto !== undefined) {
            e.textContent = texto;
        }

        return e;
    };


    // =====================================
    // CARGAR SERVICIOS EN SERVICIOS.HTML
    // =====================================

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

            serviciosContainer.innerHTML =
                '<p class="error">No se pudieron cargar los servicios. Verifica tu conexión.</p>';

        }

    }


    // =====================================
    // MANEJAR FORMULARIO DE PEDIDOS
    // =====================================

    const pedidoForm = document.getElementById('pedido-form');

    if (pedidoForm) {

        const selectServicio = document.getElementById('servicio-select');

        const servicioParam = new URLSearchParams(window.location.search).get('servicio');


        // =====================================
        // CARGAR SERVICIOS DESDE SUPABASE
        // =====================================

        if (selectServicio) {

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


            // Seleccionar automáticamente el servicio recibido en el enlace

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


        // =====================================
        // MOSTRAR AVISO DE GLOBOS CON HELIO
        // =====================================

        const avisoHelio = document.getElementById('aviso-helio');

        const alternarHelio = () => {

            avisoHelio.hidden = !/helio/i.test(
                selectServicio ? selectServicio.value : ''
            );

        };

        if (selectServicio) {
            selectServicio.addEventListener('change', alternarHelio);
        }

        alternarHelio();


        // =====================================
        // MOSTRAR U OCULTAR DIRECCIÓN
        // =====================================

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


        // =====================================
        // VALIDACIÓN DE FECHA
        // SOLO HOY Y DÍAS FUTUROS
        // =====================================

        const fechaEntrega = document.getElementById('cliente-fecha');

        const obtenerFechaLocal = () => {

            const hoy = new Date();

            const anio = hoy.getFullYear();

            const mes = String(hoy.getMonth() + 1).padStart(2, '0');

            const dia = String(hoy.getDate()).padStart(2, '0');

            return `${anio}-${mes}-${dia}`;

        };

        fechaEntrega.min = obtenerFechaLocal();


        // =====================================
        // VALIDACIÓN DE NOMBRES
        // SOLO LETRAS
        // =====================================

        const nombreCampos = [
            'cliente-nombre',
            'para-quien'
        ];

        nombreCampos.forEach(id => {

            const campo = document.getElementById(id);

            campo.addEventListener('input', () => {

                campo.value = campo.value.replace(
                    /[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s'-]/g,
                    ''
                );

            });

        });


        // =====================================
        // VALIDACIÓN DE TELÉFONO
        // EXACTAMENTE 10 NÚMEROS
        // GUIONES AUTOMÁTICOS
        // =====================================

        const telefono = document.getElementById('cliente-telefono');

        const formatearTelefono = () => {

            const posicion = telefono.selectionStart ?? telefono.value.length;

            const digitosAntes = telefono.value
                .slice(0, posicion)
                .replace(/\D/g, '')
                .length;

            // Eliminar letras y otros caracteres.
            // Conservar solamente los primeros 10 números.

            const numeros = telefono.value
                .replace(/\D/g, '')
                .slice(0, 10);

            let formato = numeros;

            // Colocar el primer guion después de los 3 primeros números.
            // Colocar el segundo guion después de los siguientes 3.

            if (numeros.length > 6) {

                formato =
                    numeros.slice(0, 3) + '-' +
                    numeros.slice(3, 6) + '-' +
                    numeros.slice(6);

            } else if (numeros.length > 3) {

                formato =
                    numeros.slice(0, 3) + '-' +
                    numeros.slice(3);

            }

            telefono.value = formato;

            // Comprobar que tenga exactamente 10 números.

            telefono.setCustomValidity(
                numeros.length === 10
                    ? ''
                    : 'El teléfono debe contener exactamente 10 números.'
            );

            // Mantener el cursor en una posición lógica.

            let nuevaPosicion = 0;

            let digitosContados = 0;

            while (
                nuevaPosicion < formato.length &&
                digitosContados < digitosAntes
            ) {

                if (/\d/.test(formato[nuevaPosicion])) {
                    digitosContados++;
                }

                nuevaPosicion++;

            }

            if (document.activeElement === telefono) {

                telefono.setSelectionRange(
                    nuevaPosicion,
                    nuevaPosicion
                );

            }

        };

        telefono.addEventListener('input', formatearTelefono);

        telefono.addEventListener('blur', formatearTelefono);


        // =====================================
        // VALIDACIÓN DE PRESUPUESTO
        // SOLO NÚMEROS
        // =====================================

        const presupuestoCampo = document.getElementById('presupuesto');

        presupuestoCampo.addEventListener('input', () => {

            presupuestoCampo.value = presupuestoCampo.value.replace(
                /\D/g,
                ''
            );

        });


        // =====================================
        // LIMPIAR VALIDACIÓN AL REINICIAR
        // =====================================

        pedidoForm.addEventListener('reset', () => {

            telefono.setCustomValidity('');

        });


        // =====================================
        // OBTENER VALORES DE LOS CAMPOS
        // =====================================

        const valor = id =>
            document.getElementById(id).value.trim();

        const opcional = id =>
            valor(id) || null;


        // =====================================
        // ELEMENTOS DEL FORMULARIO
        // =====================================

        const aviso = document.getElementById('aviso');

        const boton = pedidoForm.querySelector('button[type="submit"]');

        const textoBoton = boton.textContent;

        const modal = document.getElementById('exito-modal');

        pedidoForm.noValidate = true;


        // =====================================
        // QUITAR ERRORES DE LOS CAMPOS
        // =====================================

        const quitarError = (grupo) => {

            grupo.classList.remove('campo-error');

            const m = grupo.querySelector('.error-campo');

            if (m) {
                m.remove();
            }

        };


        // =====================================
        // MOSTRAR AVISOS
        // =====================================

        const mostrarAviso = (texto) => {

            aviso.textContent = texto;

            aviso.hidden = false;

            aviso.classList.remove('sacudir');

            void aviso.offsetWidth;

            aviso.classList.add('sacudir');

        };


        // =====================================
        // QUITAR ERROR AL CORREGIR UN CAMPO
        // =====================================

        pedidoForm.addEventListener('input', (e) => {

            const grupo = e.target.closest('.form-group');

            if (grupo) {
                quitarError(grupo);
            }

        });


        // =====================================
        // VALIDAR TODOS LOS CAMPOS
        // =====================================

        const validar = () => {

            pedidoForm.querySelectorAll('.campo-error').forEach(quitarError);

            let primero = null;

            pedidoForm.querySelectorAll('input, select, textarea').forEach(campo => {

                if (
                    campo.closest('[hidden]') ||
                    campo.validity.valid
                ) {
                    return;
                }

                const grupo = campo.closest('.form-group');

                grupo.classList.add('campo-error');

                const m = document.createElement('small');

                m.className = 'error-campo';

                m.textContent = campo.type === 'checkbox'
                    ? 'Marca la casilla para continuar.'

                    : campo.validity.valueMissing
                    ? 'Este campo es obligatorio.'

                    : campo.validity.rangeUnderflow
                    ? 'No puedes seleccionar una fecha anterior a hoy.'

                    : campo.id === 'cliente-telefono' &&
                      (campo.validity.customError || campo.validity.patternMismatch)
                    ? 'El teléfono debe tener exactamente 10 números y el formato 809-555-0000.'

                    : (campo.id === 'cliente-nombre' ||
                       campo.id === 'para-quien') &&
                      campo.validity.patternMismatch
                    ? 'Este campo solo permite letras y separadores de nombres.'

                    : campo.id === 'presupuesto' &&
                      campo.validity.patternMismatch
                    ? 'El presupuesto solo permite números.'

                    : campo.validity.typeMismatch
                    ? 'Revisa que el formato sea correcto.'

                    : 'Revisa este campo.';

                grupo.append(m);

                if (!primero) {
                    primero = campo;
                }

            });

            return primero;

        };


        // =====================================
        // MOSTRAR CONFIRMACIÓN DEL PEDIDO
        // =====================================

        const mostrarExito = (pedido, horaTexto) => {

            const nombre = pedido.cliente.split(' ')[0];

            document.getElementById('exito-texto').textContent =
                'Gracias, ' + nombre +
                '. Recibimos tu pedido y nos pondremos en contacto contigo al ' +
                pedido.telefono + '.';


            // Formatear fecha de entrega.

            const fecha = new Date(
                pedido.fecha_entrega + 'T00:00:00'
            ).toLocaleDateString('es-DO', {
                weekday: 'long',
                day: 'numeric',
                month: 'long'
            });

            const entrega =
                fecha +
                (horaTexto ? ', ' + horaTexto : '') +
                ' · ' +
                pedido.tipo_entrega;


            // Resumen del pedido.

            const filas = [
                ['Servicio', pedido.servicio],
                ['Ocasión', pedido.ocasion],
                ['Entrega', entrega]
            ];

            document.getElementById('exito-resumen').replaceChildren(
                ...filas.map(([etiqueta, texto]) => {

                    const li = document.createElement('li');

                    const b = document.createElement('strong');

                    b.textContent = etiqueta;

                    li.append(b, texto);

                    return li;

                })
            );


            // Preparar mensaje para WhatsApp.

            const mensaje =
                'Hola, acabo de hacer un pedido en la página.\nNombre: ' +
                pedido.cliente +
                '\nServicio: ' +
                pedido.servicio +
                '\nEntrega: ' +
                entrega;

            document.getElementById('exito-wa').href =
                'https://wa.me/18092682392?text=' +
                encodeURIComponent(mensaje);

            modal.showModal();

        };


        // =====================================
        // HACER OTRO PEDIDO
        // =====================================

        document.getElementById('exito-otro').addEventListener('click', () => {

            modal.close();

            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });

        });


        // Cerrar modal al hacer clic fuera.

        modal.addEventListener('click', (e) => {

            if (e.target === modal) {
                modal.close();
            }

        });


        // =====================================
        // ENVIAR PEDIDO
        // =====================================

        pedidoForm.addEventListener('submit', async (e) => {

            e.preventDefault();

            aviso.hidden = true;


            // Validar antes de enviar.

            const invalido = validar();

            if (invalido) {

                mostrarAviso(
                    'Revisa los campos marcados en rojo para poder enviar tu pedido.'
                );

                invalido.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });

                invalido.focus({
                    preventScroll: true
                });

                return;

            }


            // =====================================
            // CONVERTIR HORA A FORMATO DE 24 HORAS
            // =====================================

            const hh = valor('hora-h');

            let hora24 = null;

            let horaTexto = '';

            if (hh) {

                const ap = valor('hora-ap');

                const mm = valor('hora-m');

                hora24 =
                    String(
                        (Number(hh) % 12) +
                        (ap === 'PM' ? 12 : 0)
                    ).padStart(2, '0') +
                    ':' +
                    mm +
                    ':00';

                horaTexto = hh + ':' + mm + ' ' + ap;

            }


            // =====================================
            // DATOS DEL PEDIDO
            // =====================================

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

                presupuesto: presupuesto
                    ? Number(presupuesto)
                    : null,

                detalles: opcional('cliente-detalles'),

                fecha_entrega: valor('cliente-fecha'),

                hora_entrega: hora24,

                tipo_entrega: valor('entrega-tipo'),

                direccion: tipoEntrega.value === 'Entrega a domicilio'
                    ? opcional('entrega-direccion')
                    : null,

                estado: 'Pendiente'

            };


            // =====================================
            // ESTADO DE ENVÍO
            // =====================================

            boton.disabled = true;

            const rueda = document.createElement('span');

            rueda.className = 'spinner';

            boton.replaceChildren(
                rueda,
                'Enviando tu pedido…'
            );


            // =====================================
            // GUARDAR PEDIDO EN SUPABASE
            // =====================================

            try {

                const { error } = await supabaseClient
                    .from('pedidos')
                    .insert([pedido]);

                if (error) throw error;


                // Mostrar confirmación.

                mostrarExito(pedido, horaTexto);


                // Reiniciar formulario.

                pedidoForm.reset();

                alternarDireccion();

                alternarHelio();


            } catch (err) {

                console.error(
                    'Error al guardar pedido:',
                    err.message
                );

                const sinRed =
                    !navigator.onLine ||
                    /fetch|network/i.test(err.message || '');

                mostrarAviso(

                    sinRed

                        ? 'No hay conexión a internet. Revisa tu conexión e inténtalo de nuevo; tus datos siguen aquí.'

                        : 'No pudimos enviar tu pedido en este momento. Inténtalo de nuevo en unos minutos o escríbenos por WhatsApp.'

                );

                aviso.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });

            } finally {

                boton.disabled = false;

                boton.textContent = textoBoton;

            }

        });

    }

});