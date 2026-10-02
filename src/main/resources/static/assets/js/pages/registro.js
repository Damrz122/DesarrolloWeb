import { auth } from '/assets/js/auth.js';
        import { renderNavbar } from '/assets/js/ui/navbar.js';

        renderNavbar();

        const form = document.getElementById('register-form');
        const nombresInput = document.getElementById('reg-nombres');
        const paternoInput = document.getElementById('reg-paterno');
        const maternoInput = document.getElementById('reg-materno');
        const tipoDocInput = document.getElementById('reg-tipodoc');
        const numDocInput = document.getElementById('reg-numdoc');
        const emailInput = document.getElementById('reg-email');
        const passInput = document.getElementById('reg-pass');
        const submitBtn = document.getElementById('btn-submit-reg');

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            submitBtn.disabled = true;
            submitBtn.innerHTML = `
                <div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Creando cuenta...</span>
            `;

            try {
                const datos = {
                    nombres: nombresInput.value.trim(),
                    apellidoPaterno: paternoInput.value.trim(),
                    apellidoMaterno: maternoInput.value.trim() || null,
                    tipoDocumento: tipoDocInput.value,
                    numeroDocumento: numDocInput.value.trim(),
                    email: emailInput.value.trim(),
                    password: passInput.value
                };

                await auth.registro(datos);

                setTimeout(() => {
                    window.location.href = '/index.html';
                }, 800);

            } catch (err) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = `<span>Registrarse</span>`;
            }
        });
