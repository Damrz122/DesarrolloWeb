import { auth } from '/assets/js/auth.js';
        import { renderNavbar } from '/assets/js/ui/navbar.js';

        renderNavbar();

        const form = document.getElementById('login-form');
        const emailInput = document.getElementById('login-email');
        const passInput = document.getElementById('login-password');
        const rememberInput = document.getElementById('login-remember');
        const submitBtn = document.getElementById('btn-submit-login');

        const demoClientBtn = document.getElementById('demo-client-btn');
        const demoAdminBtn = document.getElementById('demo-admin-btn');

        demoClientBtn.addEventListener('click', () => {
            emailInput.value = 'cliente@tienda.com';
            passInput.value = 'cliente123';
        });

        demoAdminBtn.addEventListener('click', () => {
            emailInput.value = 'admin@tienda.com';
            passInput.value = 'admin123';
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            submitBtn.disabled = true;
            submitBtn.innerHTML = `
                <div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Ingresando...</span>
            `;

            try {
                const email = emailInput.value.trim();
                const pass = passInput.value;
                const persistir = rememberInput.checked;

                const usuario = await auth.login(email, pass, persistir);

                const params = new URLSearchParams(window.location.search);
                const redirect = params.get('redirect');

                setTimeout(() => {
                    if (redirect) {
                        window.location.href = redirect;
                    } else if (usuario.rol === 'ADMIN') {
                        window.location.href = '/admin/dashboard.html';
                    } else {
                        window.location.href = '/index.html';
                    }
                }, 700);

            } catch (err) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = `<span>Iniciar Sesión</span>`;
            }
        });
