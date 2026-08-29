
(() => {
  'use strict';

  const PANEL_URL = `${location.origin}/admin`;
  const RECOVERY_URL = `${location.origin}/admin?recovery=1`;

  function esc(v='') {
    return String(v).replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
    }[c]));
  }

  function statusBox(message, type='info') {
    return `<div class="notice ${type}">${esc(message)}</div>`;
  }

  function injectForgotPassword() {
    const form = document.querySelector('#login-form');
    if (!form || document.querySelector('#forgot-password')) return;

    const actions = form.querySelector('.login-actions');
    if (!actions) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'forgot-password';
    btn.className = 'btn-admin secondary';
    btn.textContent = 'Esqueci minha senha';
    actions.appendChild(btn);

    btn.addEventListener('click', async () => {
      const email = String(form.querySelector('[name="email"]')?.value || '').trim();
      if (!email) {
        alert('Informe o e-mail da conta administrativa.');
        return;
      }

      btn.disabled = true;
      const old = btn.textContent;
      btn.textContent = 'Enviando...';

      try {
        const { error } = await sb.auth.resetPasswordForEmail(email, {
          redirectTo: RECOVERY_URL
        });
        if (error) throw error;
        alert('Enviamos um link de recuperação para esse e-mail. Abra a mensagem e siga o link para escolher uma nova senha.');
      } catch (err) {
        alert(err?.message || 'Não foi possível enviar o e-mail de recuperação.');
      } finally {
        btn.disabled = false;
        btn.textContent = old;
      }
    });
  }

  function recoveryModal() {
    if (document.querySelector('#password-recovery-modal')) return;

    const overlay = document.createElement('div');
    overlay.id = 'password-recovery-modal';
    overlay.style.cssText = [
      'position:fixed','inset:0','z-index:99999','display:grid','place-items:center',
      'padding:20px','background:rgba(15,23,42,.72)'
    ].join(';');

    overlay.innerHTML = `
      <div style="width:min(460px,100%);background:#fff;border-radius:20px;padding:24px;box-shadow:0 25px 70px rgba(0,0,0,.25)">
        <small style="font-weight:900;color:#0798d2;letter-spacing:.08em">SBATLETISMO</small>
        <h2 style="margin:6px 0 8px;color:#1f286f">Criar nova senha</h2>
        <p style="color:#667085;font-size:.85rem;line-height:1.5">Escolha uma nova senha para o painel administrativo.</p>
        <form id="password-recovery-form">
          <label class="field">
            <span>NOVA SENHA</span>
            <input class="input" type="password" name="password" minlength="6" required autocomplete="new-password">
          </label>
          <label class="field">
            <span>CONFIRMAR NOVA SENHA</span>
            <input class="input" type="password" name="confirm" minlength="6" required autocomplete="new-password">
          </label>
          <div id="recovery-feedback"></div>
          <div class="form-actions">
            <button class="btn-admin" type="submit">Salvar nova senha</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('#password-recovery-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      const password = String(fd.get('password') || '');
      const confirm = String(fd.get('confirm') || '');
      const feedback = overlay.querySelector('#recovery-feedback');
      const submit = e.currentTarget.querySelector('button[type="submit"]');

      if (password.length < 6) {
        feedback.innerHTML = statusBox('A senha precisa ter pelo menos 6 caracteres.', 'err');
        return;
      }
      if (password !== confirm) {
        feedback.innerHTML = statusBox('As duas senhas precisam ser iguais.', 'err');
        return;
      }

      submit.disabled = true;
      submit.textContent = 'Salvando...';

      const { error } = await sb.auth.updateUser({ password });
      if (error) {
        feedback.innerHTML = statusBox(error.message, 'err');
        submit.disabled = false;
        submit.textContent = 'Salvar nova senha';
        return;
      }

      feedback.innerHTML = statusBox('Senha alterada com sucesso.', 'ok');
      history.replaceState({}, '', PANEL_URL);
      setTimeout(() => overlay.remove(), 1200);
    });
  }

  let recoveryChecks = 0;
  async function checkRecovery() {
    const wantsRecovery = new URLSearchParams(location.search).get('recovery') === '1';
    if (!wantsRecovery) return;

    recoveryChecks += 1;
    const { data: { session } } = await sb.auth.getSession();
    if (session) {
      recoveryModal();
      return;
    }
    if (recoveryChecks < 12) setTimeout(checkRecovery, 500);
  }

  function injectAdminNav() {
    const nav = document.querySelector('.admin-nav');
    if (!nav || document.querySelector('#administrators-nav')) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'administrators-nav';
    btn.textContent = 'Administradores';
    nav.appendChild(btn);

    btn.addEventListener('click', renderAdministrators);
  }

  async function renderAdministrators() {
    const content = document.querySelector('.admin-content');
    if (!content) return;

    document.querySelectorAll('.admin-nav button').forEach(b => b.classList.remove('active'));
    document.querySelector('#administrators-nav')?.classList.add('active');
    const title = document.querySelector('.admin-top h2');
    if (title) title.textContent = 'Administradores';

    content.innerHTML = `
      <section class="panel">
        <div class="panel-head">
          <div>
            <h3>Acessos administrativos</h3>
            <p>Autorize responsáveis a criarem a própria conta e senha.</p>
          </div>
        </div>
        <div class="notice info">
          O responsável autorizado deve abrir <strong>${esc(PANEL_URL)}</strong>, informar o e-mail autorizado e usar <strong>Criar primeiro acesso</strong>.
        </div>
        <form id="authorize-admin-form">
          <div class="form-grid">
            <label class="field full">
              <span>E-MAIL DO NOVO ADMINISTRADOR</span>
              <input class="input" type="email" name="email" placeholder="responsavel@exemplo.com" required>
            </label>
          </div>
          <div id="admin-access-feedback"></div>
          <div class="form-actions">
            <button class="btn-admin" type="submit">Autorizar e-mail</button>
          </div>
        </form>
      </section>
      <section class="panel">
        <div class="panel-head">
          <div>
            <h3>Administradores autorizados</h3>
            <p>Contas e e-mails que podem administrar o site.</p>
          </div>
        </div>
        <div id="authorized-admin-list">${statusBox('Carregando acessos...', 'info')}</div>
      </section>
    `;

    content.querySelector('#authorize-admin-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = String(new FormData(e.currentTarget).get('email') || '').trim().toLowerCase();
      const feedback = content.querySelector('#admin-access-feedback');
      const submit = e.currentTarget.querySelector('button[type="submit"]');

      if (!email) return;
      submit.disabled = true;
      submit.textContent = 'Autorizando...';

      const { error } = await sb.rpc('admin_add_authorized_email', { p_email: email });
      if (error) {
        feedback.innerHTML = statusBox(error.message, 'err');
      } else {
        feedback.innerHTML = statusBox('E-mail autorizado. Agora essa pessoa pode criar o primeiro acesso no painel.', 'ok');
        e.currentTarget.reset();
        await loadAuthorizedAdmins();
      }

      submit.disabled = false;
      submit.textContent = 'Autorizar e-mail';
    });

    await loadAuthorizedAdmins();
  }

  async function loadAuthorizedAdmins() {
    const list = document.querySelector('#authorized-admin-list');
    if (!list) return;

    const { data, error } = await sb.rpc('admin_list_authorized_emails');
    if (error) {
      list.innerHTML = statusBox(error.message, 'err');
      return;
    }

    if (!data?.length) {
      list.innerHTML = statusBox('Nenhum administrador autorizado.', 'info');
      return;
    }

    list.innerHTML = `<div class="admin-list">${data.map(item => `
      <div class="admin-row">
        <div>
          <h4>${esc(item.email)}</h4>
          <p>${item.has_account ? 'Conta criada e disponível' : 'Autorizado — aguardando primeiro acesso'}</p>
        </div>
        <div class="row-actions">
          <button class="btn-admin danger small" type="button" data-remove-admin="${esc(item.email)}">Remover acesso</button>
        </div>
      </div>
    `).join('')}</div>`;

    list.querySelectorAll('[data-remove-admin]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const email = btn.dataset.removeAdmin;
        if (!confirm(`Remover o acesso administrativo de ${email}?`)) return;

        btn.disabled = true;
        const { error } = await sb.rpc('admin_remove_authorized_email', { p_email: email });
        if (error) {
          alert(error.message);
          btn.disabled = false;
          return;
        }
        await loadAuthorizedAdmins();
      });
    });
  }

  function augment() {
    injectForgotPassword();
    injectAdminNav();
  }

  const observer = new MutationObserver(() => augment());
  observer.observe(document.documentElement, { childList: true, subtree: true });

  sb.auth.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY') recoveryModal();
    setTimeout(augment, 0);
  });

  augment();
  checkRecovery();
})();
