// Navegación lateral compartida del módulo de administración.
import { auth } from '../auth.js';
import { obtenerSitio, pintarLogo } from '../sitio.js?v=5';

export const ADMIN_THEME_KEY = 'electronix_admin_theme';
const LOGO_SVG = '<img src="/assets/img/logo.svg" alt="Electronix" width="28" height="28" class="adm-brand-logo-img" aria-hidden="true">';
const ICONS = {
    dashboard:'<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
    productos:'<svg viewBox="0 0 24 24"><path d="m3 7 9-4 9 4-9 4Z"/><path d="m3 12 9 4 9-4M3 17l9 4 9-4"/></svg>',
    categorias:'<svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h10"/><circle cx="19" cy="18" r="2"/></svg>',
    pedidos:'<svg viewBox="0 0 24 24"><path d="M6 3h12v18H6z"/><path d="M9 7h6M9 11h6M9 15h3"/></svg>',
    usuarios:'<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><path d="M3 21v-2a6 6 0 0 1 12 0v2M17 11a3 3 0 0 0 0-6M21 21v-2a6 6 0 0 0-3-5.2"/></svg>',
    configuracion:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.4 2.4-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5v.2h-3.4v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1-2.4-2.4.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H4.3v-3.4h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 2.4-2.4.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5v-.2h3.4v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1 2.4 2.4-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.2V14h-.2a1.7 1.7 0 0 0-1.4 1Z"/></svg>',
    reportes:'<svg viewBox="0 0 24 24"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
    chat:'<svg viewBox="0 0 24 24"><path d="M20 11.5a7.5 7.5 0 0 1-9.3 7.3L5 21l1.7-5.2A7.5 7.5 0 1 1 20 11.5Z"/></svg>'
};
const LINKS = [
    { id:'dashboard', href:'/admin/dashboard.html', label:'Dashboard' }, { id:'productos', href:'/admin/productos.html', label:'Productos' },
    { id:'categorias', href:'/admin/categorias.html', label:'Categorías' }, { id:'pedidos', href:'/admin/pedidos.html', label:'Pedidos' },
    { id:'usuarios', href:'/admin/usuarios.html', label:'Usuarios' }, { id:'configuracion', href:'/admin/configuracion.html', label:'Configuración' },
    { id:'reportes', href:'/admin/reportes.html', label:'Reportes' }, { id:'chat', href:'/admin/chat.html', label:'Chat clientes', dot:true }
];
const permisosNav = { dashboard:['REPORTES_VER','PEDIDOS_GESTIONAR'], productos:['PRODUCTOS_VER','PRODUCTOS_GESTIONAR','INVENTARIO_GESTIONAR'], categorias:['CATEGORIAS_GESTIONAR'], pedidos:['PEDIDOS_GESTIONAR'], usuarios:['USUARIOS_GESTIONAR'], configuracion:['CONFIGURACION_GESTIONAR'], reportes:['REPORTES_VER'], chat:['CHAT_ATENDER'] };
function escapeHtml(value) { return String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

export function getAdminTheme() { try { const t=localStorage.getItem(ADMIN_THEME_KEY); return ['light','dark','mixed'].includes(t) ? t : 'light'; } catch { return 'light'; } }
export function setAdminTheme(theme) {
    const value=['light','dark','mixed'].includes(theme) ? theme : 'light';
    try { localStorage.setItem(ADMIN_THEME_KEY,value); } catch {}
    document.documentElement.setAttribute('data-theme',value);
    document.querySelectorAll('[data-admin-theme]').forEach(b => b.classList.toggle('is-selected',b.dataset.adminTheme===value));
    const label=document.getElementById('adm-theme-state'); if(label) label.textContent=({light:'Claro',dark:'Oscuro',mixed:'Mixto'})[value];
}

export function renderAdminShell(active) {
    const header=document.getElementById('main-navbar'); if(!header) return;
    document.body.classList.add('adm-has-sidebar');
    const user=auth.getUser(), nombre=user?.nombre || 'Administrador', email=user?.email || '', initial=nombre.charAt(0).toUpperCase(), theme=getAdminTheme();
    const nav=LINKS.filter(l=>permisosNav[l.id]?.some(p=>auth.tienePermiso(p))).map(l=>`<a href="${l.href}" class="adm-side-link ${l.id===active?'adm-active':''}">${ICONS[l.id]}<span>${l.label}</span>${l.dot?'<i class="adm-dot-live"></i>':''}</a>`).join('');
    header.innerHTML=`<button id="adm-sidebar-toggle" class="adm-sidebar-toggle" type="button" aria-label="Abrir menú">☰</button><aside class="adm-sidebar" aria-label="Navegación administrativa"><a class="adm-side-brand" href="${auth.inicioAdmin()}"><span class="adm-side-logo">${LOGO_SVG}</span><span><b class="adm-brand-name">ELECTRONIX</b><small>Panel administrativo</small></span></a><nav class="adm-side-nav">${nav}</nav><div class="adm-side-bottom"><div class="adm-side-help"><span>¿Necesitas ayuda?</span><small>Gestiona tu tienda desde aquí.</small></div><div class="adm-profile-wrap" id="adm-profile-wrap"><button id="adm-profile-btn" class="adm-side-user" aria-haspopup="true" aria-expanded="false"><span class="adm-avatar">${escapeHtml(initial)}</span><span><b>${escapeHtml(nombre)}</b><small>Administrador</small></span><span class="adm-user-chev">⌄</span></button><div id="adm-profile-menu" class="adm-profile-menu" role="menu"><div class="adm-profile-mail">Conectado como<br><strong>${escapeHtml(email || nombre)}</strong></div><a href="/index.html" class="adm-menu-btn" role="menuitem">Ir a la tienda</a>${auth.tienePermiso('APARIENCIA_GESTIONAR')?'<a href="/admin/apariencia.html" class="adm-menu-btn" role="menuitem">Ajustes de página</a>':''}<div class="adm-theme-choice"><span>Tema del panel <b id="adm-theme-state">${({light:'Claro',dark:'Oscuro',mixed:'Mixto'})[theme]}</b></span><div><button type="button" data-admin-theme="light">Claro</button><button type="button" data-admin-theme="dark">Oscuro</button><button type="button" data-admin-theme="mixed">Mixto</button></div></div><button id="adm-logout-btn" class="adm-menu-btn danger" role="menuitem">Salir</button></div></div></div></aside><div id="adm-side-overlay" class="adm-side-overlay"></div>`;
    const wrap=document.getElementById('adm-profile-wrap'), btn=document.getElementById('adm-profile-btn'), menu=document.getElementById('adm-profile-menu');
    if(menu && menu.parentElement!==document.body){document.body.appendChild(menu);menu.style.position='fixed';}
    const position=()=>{const r=btn.getBoundingClientRect();menu.style.left=Math.max(12,r.left)+'px';menu.style.bottom=Math.max(12,window.innerHeight-r.top+8)+'px';menu.style.top='auto';menu.style.minWidth='235px';};
    const close=()=>{menu?.classList.remove('adm-open');btn?.setAttribute('aria-expanded','false');};
    btn?.addEventListener('click',e=>{e.stopPropagation();position();const open=menu.classList.toggle('adm-open');btn.setAttribute('aria-expanded',open?'true':'false');});
    document.addEventListener('click',e=>{if(wrap?.contains(e.target)||menu?.contains(e.target))return;close();});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'){close();document.body.classList.remove('adm-sidebar-open');}});
    document.querySelectorAll('[data-admin-theme]').forEach(b=>b.addEventListener('click',()=>setAdminTheme(b.dataset.adminTheme)));
    document.getElementById('adm-logout-btn')?.addEventListener('click',()=>auth.logout(true));
    const toggle=()=>document.body.classList.toggle('adm-sidebar-open'); document.getElementById('adm-sidebar-toggle')?.addEventListener('click',toggle);document.getElementById('adm-side-overlay')?.addEventListener('click',toggle);
    obtenerSitio().then(cfg=>{if(!cfg)return;const logo=String(cfg['site.logo']||'').trim(), name=String(cfg['site.nombre']||'').trim();if(logo){const img=header.querySelector('.adm-brand-logo-img');if(img)pintarLogo(img,logo,name||'Electronix');}if(name){const brand=header.querySelector('.adm-brand-name');if(brand)brand.textContent=name;}}).catch(()=>{});
}
