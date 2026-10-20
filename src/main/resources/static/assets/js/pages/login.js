import { auth } from '/assets/js/auth.js';
        import { renderNavbar } from '/assets/js/ui/navbar.js';

        renderNavbar();

        const form = document.getElementById('login-form');
        const emailInput = document.getElementById('login-email');
        const passInput = document.getElementById('login-password');
        const rememberInput = document.getElementById('login-remember');
        const submitBtn = document.getElementById('btn-submit-login');
        const passwordToggle = document.getElementById('login-password-toggle');
        const passwordIcon = document.getElementById('login-password-icon');

        passwordToggle.addEventListener('click', () => {
            const visible = passInput.type === 'text';
            passInput.type = visible ? 'password' : 'text';
            passwordToggle.setAttribute('aria-pressed', String(!visible));
            passwordToggle.setAttribute('aria-label', visible ? 'Mostrar contraseña' : 'Ocultar contraseña');
            passwordToggle.title = visible ? 'Mostrar contraseña' : 'Ocultar contraseña';
            passwordIcon.innerHTML = visible
                ? `<path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12s3.5-6 9.75-6 9.75 6 9.75 6-3.5 6-9.75 6-9.75-6-9.75-6Z" /><circle cx="12" cy="12" r="2.5" />`
                : `<path stroke-linecap="round" stroke-linejoin="round" d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.2A10.8 10.8 0 0 1 12 5c6.25 0 9.75 7 9.75 7a18.4 18.4 0 0 1-3.2 3.9M6.1 6.1A18.7 18.7 0 0 0 2.25 12S5.75 19 12 19c1.25 0 2.37-.28 3.35-.72" />`;
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
                    } else if (auth.isAdmin()) {
                        window.location.href = auth.inicioAdmin();
                    } else {
                        window.location.href = '/index.html';
                    }
                }, 700);

            } catch (err) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = `<span>Iniciar Sesión</span>`;
            }
        });
