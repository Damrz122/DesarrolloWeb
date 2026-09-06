// chat.js - Cliente STOMP sobre SockJS para chat en tiempo real

import { api } from './api.js';
import { auth } from './auth.js';
import { showToast } from './ui/toast.js';

export class ChatClient {
    constructor() {
        this.stompClient = null;
        this.conversacionId = null;
        this.subscription = null;
        this.onMessageReceivedCallback = null;
    }

    async conectar(conversacionId, onMessageReceived) {
        this.conversacionId = conversacionId;
        this.onMessageReceivedCallback = onMessageReceived;

        return new Promise((resolve, reject) => {
            if (typeof SockJS === 'undefined' || typeof Stomp === 'undefined') {
                console.error('SockJS o StompJS no están cargados en el DOM');
                reject(new Error('Librerías WebSocket no disponibles'));
                return;
            }

            const socket = new SockJS('/ws-chat');
            this.stompClient = Stomp.over(socket);
            this.stompClient.debug = null; // Silenciar logs excesivos en consola

            this.stompClient.connect({}, (frame) => {
                console.log('[WebSocket] Conectado exitosamente');

                // Suscripción al canal de la conversación
                const topic = `/topic/chat/${this.conversacionId}`;
                this.subscription = this.stompClient.subscribe(topic, (mensajeFrame) => {
                    try {
                        const mensaje = JSON.parse(mensajeFrame.body);
                        if (this.onMessageReceivedCallback) {
                            this.onMessageReceivedCallback(mensaje);
                        }
                    } catch (e) {
                        console.error('Error al parsear mensaje de chat:', e);
                    }
                });

                resolve(frame);
            }, (error) => {
                console.error('[WebSocket] Error de conexión:', error);
                reject(error);
            });
        });
    }

    enviarMensaje(contenido) {
        if (!this.stompClient || !this.stompClient.connected) {
            showToast('El chat no está conectado en este momento', 'error');
            return false;
        }

        const usuario = auth.getUser();
        if (!usuario) {
            showToast('Debes iniciar sesión para chatear', 'warning');
            return false;
        }

        const payload = {
            conversacionId: this.conversacionId,
            remitenteId: usuario.id,
            contenido: contenido.trim()
        };

        this.stompClient.send('/app/chat.enviar', {}, JSON.stringify(payload));
        return true;
    }

    desconectar() {
        if (this.subscription) {
            this.subscription.unsubscribe();
        }
        if (this.stompClient && this.stompClient.connected) {
            this.stompClient.disconnect();
        }
    }
}

// Widget flotante para la experiencia de compra del cliente.
// Usa solo clases elx-* (output.css): las utilidades Tailwind no están
// compiladas en output.css y el CDN no carga en todas las páginas.
export function initFloatingChat() {
    // Si ya existe el widget, no duplicar
    if (document.getElementById('floating-chat-container')) return;

    const user = auth.getUser();
    // No mostrar el widget en vistas de admin
    if (window.location.pathname.includes('/admin/')) return;

    const widgetHTML = `
        <div id="floating-chat-container" class="elx-chat-float">
            <button id="chat-toggle-btn" class="elx-chat-toggle" aria-label="Abrir soporte en vivo">
                <svg width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                </svg>
            </button>

            <div id="chat-window" class="elx-chat-window elx-hidden" role="dialog" aria-label="Soporte en vivo">
                <div class="elx-chat-header">
                    <div class="elx-chat-header-info">
                        <div class="elx-chat-status-dot"></div>
                        <div>
                            <h3 class="elx-chat-title">Soporte en Vivo</h3>
                            <p class="elx-chat-subtitle">Respondemos al instante</p>
                        </div>
                    </div>
                    <button id="chat-close-btn" class="elx-chat-close" aria-label="Cerrar chat">
                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                <div id="chat-messages" class="elx-chat-messages">
                    <div class="elx-chat-hint">Iniciando conversación...</div>
                </div>

                <div class="elx-chat-footer">
                    <form id="chat-form" class="elx-chat-form">
                        <input id="chat-input" type="text" placeholder="Escribe tu mensaje..." class="elx-chat-input" autocomplete="off" />
                        <button type="submit" class="elx-chat-send" aria-label="Enviar mensaje">
                            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                        </button>
                    </form>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', widgetHTML);

    const toggleBtn = document.getElementById('chat-toggle-btn');
    const closeBtn = document.getElementById('chat-close-btn');
    const chatWindow = document.getElementById('chat-window');
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const messagesContainer = document.getElementById('chat-messages');

    let chatClient = null;
    let conversacionActiva = null;

    toggleBtn.addEventListener('click', async () => {
        if (!auth.isAuthenticated()) {
            showToast('Inicia sesión para chatear con soporte', 'warning');
            setTimeout(() => {
                window.location.href = '/login.html?redirect=' + encodeURIComponent(window.location.pathname);
            }, 800);
            return;
        }

        const isHidden = chatWindow.classList.toggle('elx-hidden');
        if (!isHidden && !chatClient) {
            try {
                // Obtener o crear conversación con la API
                const res = await api.get('/api/chat/mi-conversacion');
                if (res.exito && res.datos) {
                    conversacionActiva = res.datos;
                    chatClient = new ChatClient();

                    // Cargar historial
                    const historialRes = await api.get(`/api/chat/conversaciones/${conversacionActiva.id}/mensajes`);
                    messagesContainer.innerHTML = '';
                    if (historialRes.exito && historialRes.datos) {
                        historialRes.datos.forEach(m => agregarBurbujaMensaje(m, messagesContainer));
                    }

                    // Conectar STOMP
                    await chatClient.conectar(conversacionActiva.id, (nuevoMensaje) => {
                        agregarBurbujaMensaje(nuevoMensaje, messagesContainer);
                    });
                }
            } catch (err) {
                console.error('Error al abrir chat flotante:', err);
                messagesContainer.innerHTML = '<div class="elx-chat-error">No se pudo conectar al chat.</div>';
            }
        }
    });

    closeBtn.addEventListener('click', () => {
        chatWindow.classList.add('elx-hidden');
    });

    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const texto = chatInput.value.trim();
        if (!texto || !chatClient) return;

        chatClient.enviarMensaje(texto);
        chatInput.value = '';
    });
}

function escapeChatHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function agregarBurbujaMensaje(mensaje, container) {
    const user = auth.getUser();
    const esMio = user && mensaje.remitenteId === user.id;

    const div = document.createElement('div');
    div.className = `elx-chat-row${esMio ? ' elx-mine' : ''}`;

    const hora = mensaje.fechaEnvio ? new Date(mensaje.fechaEnvio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

    div.innerHTML = `
        <div class="elx-chat-sender">${escapeChatHtml(mensaje.remitenteNombre)}</div>
        <div class="elx-chat-bubble">${escapeChatHtml(mensaje.contenido)}</div>
        <div class="elx-chat-time">${escapeChatHtml(hora)}</div>
    `;

    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}
