import { api } from '/assets/js/api.js';
        import { auth } from '/assets/js/auth.js';
        import { ChatClient } from '/assets/js/chat.js';
        import { renderAdminShell } from '/assets/js/ui/adminShell.js?v=2';
        import { showToast } from '/assets/js/ui/toast.js';

        // NOTA: las referencias DOM van ANTES del init (evita TDZ: el módulo
        // moriría si init tocara un const aún no inicializado).
        const convsLista = document.getElementById('conversaciones-lista');
        const btnRefrescar = document.getElementById('btn-refrescar-convs');
        const messagesContainer = document.getElementById('admin-chat-messages');
        const chatForm = document.getElementById('admin-chat-form');
        const chatInput = document.getElementById('admin-chat-input');
        const chatSend = document.getElementById('admin-chat-send');

        const clienteNombre = document.getElementById('chat-cliente-nombre');
        const clienteAvatar = document.getElementById('chat-cliente-avatar');
        const clienteEstado = document.getElementById('chat-cliente-estado');

        let chatClient = null;
        let conversacionSeleccionada = null;
        let autoRefreshTimer = null;

        renderAdminShell('chat');

        if (!auth.protegerRutaAdmin()) {
            // Redirige al login
        } else {
            initChatAdmin();
        }

        function esc(value) {
            return String(value ?? '')
                .replace(/&/g, '&amp;').replace(/</g, '&lt;')
                .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

        function initChatAdmin() {
            cargarConversaciones();

            btnRefrescar.addEventListener('click', () => {
                cargarConversaciones();
            });

            chatForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const texto = chatInput.value.trim();
                if (!texto || !chatClient || !conversacionSeleccionada) return;

                if (chatClient.enviarMensaje(texto)) {
                    chatInput.value = '';
                }
            });

            // Auto-refresca la lista cada 25 s sin perder la selección
            autoRefreshTimer = setInterval(() => {
                if (document.hidden) return;
                cargarConversaciones(true);
            }, 25000);
        }

        function pintarCargando() {
            convsLista.innerHTML = '<div class="adm-msg-placeholder">Cargando conversaciones…</div>';
        }

        function pintarError(mensaje) {
            convsLista.innerHTML = `
                <div class="adm-msg-placeholder">
                    <div class="adm-chat-error-titulo">No se pudo cargar el chat</div>
                    <div class="adm-chat-error-detalle">${esc(mensaje)}</div>
                    <button id="btn-reintentar-convs" class="adm-btn adm-btn-primary adm-btn-sm">Reintentar</button>
                </div>`;
            const btn = document.getElementById('btn-reintentar-convs');
            if (btn) btn.addEventListener('click', () => cargarConversaciones());
        }

        async function cargarConversaciones(silencioso = false) {
            if (!silencioso) pintarCargando();

            // Timeout: la lista nunca debe quedarse colgada en "Cargando"
            const ctrl = new AbortController();
            const timer = setTimeout(() => ctrl.abort(), 12000);

            try {
                console.info('[admin-chat] GET /api/chat/conversaciones');
                const res = await api.request('/api/chat/conversaciones', { method: 'GET', signal: ctrl.signal });
                console.info('[admin-chat] respuesta:', res && res.exito ? `${(res.datos || []).length} conversaciones` : res);

                if (!res || !res.exito) {
                    throw new Error((res && res.mensaje) || 'Respuesta inválida del servidor');
                }

                const lista = Array.isArray(res.datos) ? res.datos : [];
                convsLista.innerHTML = '';

                if (lista.length === 0) {
                    convsLista.innerHTML = '<div class="adm-msg-placeholder">Aún no hay conversaciones.<br/>Aparecerán aquí cuando un cliente abra el chat.</div>';
                    return;
                }

                lista.forEach(conv => {
                    const item = document.createElement('div');
                    const sel = conversacionSeleccionada && conversacionSeleccionada.id === conv.id;
                    item.className = 'adm-conv' + (sel ? ' adm-sel' : '');
                    item.dataset.convId = conv.id;
                    item.innerHTML = `
                        <span class="adm-conv-avatar">${esc(conv.clienteNombre ? conv.clienteNombre.charAt(0).toUpperCase() : 'C')}</span>
                        <span class="adm-conv-body">
                            <span class="adm-conv-name-row">
                                <span class="adm-conv-name">${esc(conv.clienteNombre || 'Cliente')}</span>
                                <span class="adm-conv-state">${esc(conv.estado || '')}</span>
                            </span>
                            <span class="adm-conv-prev">${esc(conv.ultimoMensaje || 'Sin mensajes')}</span>
                        </span>
                        ${(conv.mensajesNoLeidos && conv.mensajesNoLeidos > 0)
                            ? `<span class="adm-conv-unread" title="${conv.mensajesNoLeidos} mensaje${conv.mensajesNoLeidos > 1 ? 's' : ''} sin leer">${conv.mensajesNoLeidos > 9 ? '9+' : conv.mensajesNoLeidos}</span>`
                            : ''}
                    `;
                    item.addEventListener('click', () => seleccionarConversacion(conv));
                    convsLista.appendChild(item);
                });
            } catch (err) {
                console.error('[admin-chat] error cargando conversaciones:', err);
                if (silencioso) return; // no pisar la lista en refrescos automáticos
                const msg = err && err.name === 'AbortError'
                    ? 'La petición tardó demasiado (timeout 12 s). Revisa tu conexión.'
                    : (err.message || 'Error desconocido');
                pintarError(msg);
            } finally {
                clearTimeout(timer);
            }
        }

        async function seleccionarConversacion(conv) {
            conversacionSeleccionada = conv;
            clienteNombre.textContent = conv.clienteNombre || 'Cliente';
            clienteAvatar.textContent = conv.clienteNombre ? conv.clienteNombre.charAt(0).toUpperCase() : 'C';
            clienteEstado.textContent = `Sala #${conv.id} — ${conv.estado || 'Activa'} · en tiempo real`;

            document.querySelectorAll('#conversaciones-lista .adm-conv').forEach(el => {
                el.classList.toggle('adm-sel', String(el.dataset.convId) === String(conv.id));
            });

            chatInput.disabled = false;
            chatSend.disabled = false;
            chatInput.focus();

            if (chatClient) {
                chatClient.desconectar();
                chatClient = null;
            }

            messagesContainer.innerHTML = '<div class="adm-msg-placeholder">Cargando historial…</div>';

            try {
                const resHistorial = await api.get(`/api/chat/conversaciones/${conv.id}/mensajes`);
                messagesContainer.innerHTML = '';

                const historial = resHistorial && resHistorial.datos ? resHistorial.datos : [];
                if (historial.length === 0) {
                    messagesContainer.innerHTML = '<div class="adm-msg-placeholder">Sin mensajes todavía. ¡Saluda al cliente!</div>';
                } else {
                    historial.forEach(m => agregarMensajeUI(m));
                }

                chatClient = new ChatClient();
                await chatClient.conectar(conv.id, (nuevoMensaje) => {
                    agregarMensajeUI(nuevoMensaje);
                });

                // Refresca la lista para marcar la conversación como leída/seleccionada
                cargarConversaciones(true);
            } catch (err) {
                console.error('[admin-chat] error abriendo conversación:', err);
                messagesContainer.innerHTML = `<div class="adm-msg-placeholder adm-chat-error-linea">Error al abrir la conversación: ${esc(err.message)}</div>`;
                showToast('Error al conectar con la conversación', 'error');
            }
        }

        function agregarMensajeUI(m) {
            const user = auth.getUser();
            const esMio = user && m.remitenteId === user.id;

            const div = document.createElement('div');
            div.className = `adm-row ${esMio ? 'mine' : 'theirs'}`;

            const hora = m.fechaEnvio ? new Date(m.fechaEnvio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
            const quien = m.remitenteNombre ? `${m.remitenteNombre}${m.remitenteRol ? ' · ' + m.remitenteRol : ''}` : '';

            div.innerHTML = `
                ${quien ? `<div class="adm-bubble-meta">${esc(quien)}</div>` : ''}
                <div class="adm-bubble">${esc(m.contenido)}</div>
                ${hora ? `<div class="adm-bubble-time">${esc(hora)}</div>` : ''}
            `;

            // Quita el placeholder si existe
            const ph = messagesContainer.querySelector('.adm-msg-placeholder');
            if (ph) ph.remove();

            messagesContainer.appendChild(div);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
