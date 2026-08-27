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

// Widget flotante para la experiencia de compra del cliente
export function initFloatingChat() {
    // Si ya existe el widget, no duplicar
    if (document.getElementById('floating-chat-container')) return;

    const user = auth.getUser();
    // No mostrar el widget en vistas de admin
    if (window.location.pathname.includes('/admin/')) return;

    const widgetHTML = `
        <div id="floating-chat-container" class="fixed bottom-6 right-6 z-40">
            <button id="chat-toggle-btn" class="w-14 h-14 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-xl flex items-center justify-center transition-all duration-300 transform hover:scale-110 focus:outline-none">
                <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                </svg>
            </button>

            <div id="chat-window" class="hidden absolute bottom-16 right-0 w-80 sm:w-96 h-[460px] bg-slate-900/95 backdrop-blur-xl border border-slate-700/70 rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300">
                <div class="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 text-white flex items-center justify-between">
                    <div class="flex items-center space-x-3">
                        <div class="w-3 h-3 bg-emerald-400 rounded-full animate-pulse"></div>
                        <div>
                            <h3 class="font-semibold text-sm">Soporte en Vivo</h3>
                            <p class="text-xs text-indigo-100">Respondemos al instante</p>
                        </div>
                    </div>
                    <button id="chat-close-btn" class="text-white/80 hover:text-white">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                <div id="chat-messages" class="flex-1 p-4 overflow-y-auto space-y-3 text-sm">
                    <div class="text-center text-xs text-slate-400 my-2">Iniciando conversación...</div>
                </div>

                <div class="p-3 border-t border-slate-800 bg-slate-950/60">
                    <form id="chat-form" class="flex items-center space-x-2">
                        <input id="chat-input" type="text" placeholder="Escribe tu mensaje..." class="flex-1 bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors" autocomplete="off" />
                        <button type="submit" class="bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-xl transition-colors">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
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

        const isHidden = chatWindow.classList.toggle('hidden');
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
                messagesContainer.innerHTML = '<div class="text-rose-400 text-xs text-center">No se pudo conectar al chat.</div>';
            }
        }
    });

    closeBtn.addEventListener('click', () => {
        chatWindow.classList.add('hidden');
    });

    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const texto = chatInput.value.trim();
        if (!texto || !chatClient) return;

        chatClient.enviarMensaje(texto);
        chatInput.value = '';
    });
}

function agregarBurbujaMensaje(mensaje, container) {
    const user = auth.getUser();
    const esMio = user && mensaje.remitenteId === user.id;

    const div = document.createElement('div');
    div.className = `flex flex-col ${esMio ? 'items-end' : 'items-start'}`;

    const hora = mensaje.fechaEnvio ? new Date(mensaje.fechaEnvio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

    div.innerHTML = `
        <div class="text-[11px] text-slate-400 mb-1 px-1">${mensaje.remitenteNombre}</div>
        <div class="max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-md ${
            esMio 
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-br-none' 
                : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-none'
        }">
            ${mensaje.contenido}
        </div>
        <div class="text-[10px] text-slate-500 mt-1 px-1">${hora}</div>
    `;

    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}
