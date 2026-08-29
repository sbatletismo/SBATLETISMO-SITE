import { supabase } from './config.js';

const app = document.querySelector('#admin-app');
const esc = (v = '') => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const slugify = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const fmt = v => v ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(v + (String(v).length === 10 ? 'T12:00:00' : ''))) : '—';
const state = { session: null, view: 'dashboard', edit: null, msg: '', err: '', counts: {}, settings: null, rows: [] };

const documentCategories = [
  ['institucional', 'Institucional / Estatuto'],
  ['emendas', 'Parcerias e Termos de Fomento'],
  ['planos', 'Planos de Trabalho'],
  ['contas', 'Prestação de Contas'],
  ['relatorios', 'Relatórios de Atividades'],
  ['balancos', 'Financeiro, Balanços e Certidões'],
  ['editais', 'Editais e Chamamentos'],
  ['outros', 'Outros documentos']
];
const documentCategoryLabels = Object.fromEntries(documentCategories);

const defs = {
  news: {
    label: 'Notícias', singular: 'notícia', table: 'news_posts', titleKey: 'title',
    fields: [
      ['title', 'Título', 'text', true],
      ['excerpt', 'Resumo', 'textarea'],
      ['body', 'Texto da notícia', 'textarea'],
      ['cover_image_url', 'Imagem de capa', 'image'],
      ['status', 'Publicação', 'select', [['draft', 'Rascunho — não aparece no site'], ['published', 'Publicado — aparece no site']]],
      ['published_at', 'Data de publicação', 'datetime-local']
    ]
  },
  projects: {
    label: 'Projetos', singular: 'projeto', table: 'projects', titleKey: 'title',
    fields: [
      ['title', 'Nome do projeto', 'text', true],
      ['summary', 'Resumo', 'textarea'],
      ['body', 'Descrição completa', 'textarea'],
      ['image_url', 'Imagem', 'image'],
      ['active', 'Exibir no site', 'checkbox'],
      ['display_order', 'Ordem de exibição', 'number', false, true]
    ]
  },
  events: {
    label: 'Eventos', singular: 'evento', table: 'events', titleKey: 'title',
    fields: [
      ['title', 'Nome do evento', 'text', true],
      ['description', 'Descrição', 'textarea'],
      ['event_date', 'Data e hora', 'datetime-local'],
      ['location', 'Local', 'text'],
      ['image_url', 'Imagem', 'image'],
      ['registration_url', 'Link de inscrição', 'url'],
      ['status', 'Situação', 'select', [['draft', 'Rascunho'], ['published', 'Publicado'], ['cancelled', 'Cancelado']]]
    ]
  },
  athletes: {
    label: 'Atletas', singular: 'atleta', table: 'athletes', titleKey: 'name',
    fields: [
      ['name', 'Nome', 'text', true],
      ['category', 'Categoria', 'text'],
      ['specialty', 'Prova / Especialidade', 'text'],
      ['bio', 'Apresentação', 'textarea'],
      ['photo_url', 'Foto', 'image'],
      ['featured', 'Destacar na página inicial', 'checkbox'],
      ['active', 'Exibir no site', 'checkbox'],
      ['display_order', 'Ordem de exibição', 'number', false, true]
    ]
  },
  team: {
    label: 'Equipe', singular: 'membro da equipe', table: 'team_members', titleKey: 'name',
    fields: [
      ['name', 'Nome', 'text', true],
      ['role', 'Cargo / Função', 'text'],
      ['bio', 'Apresentação', 'textarea'],
      ['photo_url', 'Foto', 'image'],
      ['active', 'Exibir no site', 'checkbox'],
      ['display_order', 'Ordem de exibição', 'number', false, true]
    ]
  },
  gallery: {
    label: 'Galeria', singular: 'foto', table: 'gallery_items', titleKey: 'caption',
    fields: [
      ['image_url', 'Foto', 'image', true],
      ['caption', 'Legenda', 'text'],
      ['event_name', 'Evento relacionado', 'text'],
      ['event_date', 'Data', 'date'],
      ['active', 'Exibir no site', 'checkbox'],
      ['display_order', 'Ordem de exibição', 'number', false, true]
    ]
  },
  partners: {
    label: 'Parceiros', singular: 'parceiro', table: 'partners', titleKey: 'name',
    fields: [
      ['name', 'Nome', 'text', true],
      ['partner_type', 'Tipo', 'select', [['sponsor', 'Patrocinador'], ['supporter', 'Apoiador'], ['institutional', 'Parceiro institucional']]],
      ['logo_url', 'Logo', 'image'],
      ['website_url', 'Site do parceiro', 'url'],
      ['active', 'Exibir no site', 'checkbox'],
      ['display_order', 'Ordem de exibição', 'number', false, true]
    ]
  },
  documents: {
    label: 'Transparência', singular: 'documento', table: 'documents', titleKey: 'title',
    fields: [
      ['title', 'Título do documento', 'text', true],
      ['category', 'Categoria', 'select', documentCategories],
      ['file_url', 'Arquivo', 'file', true],
      ['document_date', 'Data de referência', 'date'],
      ['is_published', 'Exibir no Portal da Transparência', 'checkbox'],
      ['display_order', 'Ordem de exibição', 'number', false, true]
    ]
  }
};

const defaults = {
  news: { status: 'draft' },
  projects: { active: true, display_order: 0 },
  events: { status: 'published' },
  athletes: { active: true, featured: false, display_order: 0 },
  team: { active: true, display_order: 0 },
  gallery: { active: true, display_order: 0 },
  partners: { partner_type: 'sponsor', active: true, display_order: 0 },
  documents: { category: 'outros', is_published: true, display_order: 0 }
};

const statusLabels = {
  draft: 'Rascunho', published: 'Publicado', cancelled: 'Cancelado',
  sponsor: 'Patrocinador', supporter: 'Apoiador', institutional: 'Parceiro institucional'
};

function notice() {
  return `${state.err ? `<div class="notice err">${esc(state.err)}</div>` : ''}${state.msg ? `<div class="notice ok">${esc(state.msg)}</div>` : ''}`;
}
function clearNotice() { state.err = ''; state.msg = ''; }
function setBusy(form, busy, text = 'Salvando…') {
  const btn = form?.querySelector('button[type="submit"]');
  if (!btn) return;
  if (busy) { btn.dataset.original = btn.textContent; btn.textContent = text; btn.disabled = true; }
  else { btn.textContent = btn.dataset.original || btn.textContent; btn.disabled = false; }
}

function renderLogin() {
  app.innerHTML = `<div class="login-shell"><div class="login-card"><img class="login-logo" src="assets/logo-sbatletismo.svg" alt="SBAtletismo"><h1>Área administrativa</h1><p>Atualize o site da associação de forma simples e segura.</p>${notice()}<form id="login-form"><label class="field"><span>E-mail</span><input class="input" name="email" type="email" value="sbatletismo@gmail.com" required autocomplete="email"></label><label class="field"><span>Senha</span><input class="input" name="password" type="password" required minlength="6" autocomplete="current-password"></label><div class="login-actions"><button class="btn-admin" type="submit">Entrar</button><button class="btn-admin secondary" id="first-access" type="button">Criar primeiro acesso</button></div></form><div class="notice info">Use apenas uma conta autorizada da associação.</div><p style="margin-top:18px"><a href="index.html" style="color:#2c3091;font-weight:800">← Voltar ao site</a></p></div></div>`;
  bindLogin();
}
function bindLogin() {
  document.querySelector('#login-form')?.addEventListener('submit', async e => {
    e.preventDefault(); clearNotice(); setBusy(e.currentTarget, true, 'Entrando…');
    const f = new FormData(e.currentTarget);
    const { error } = await supabase.auth.signInWithPassword({ email: String(f.get('email')).trim(), password: String(f.get('password')) });
    if (error) { state.err = 'Não foi possível entrar. Confira o e-mail e a senha.'; renderLogin(); return; }
    await enterAdmin();
  });
  document.querySelector('#first-access')?.addEventListener('click', async () => {
    clearNotice(); const form = document.querySelector('#login-form'); const f = new FormData(form);
    const email = String(f.get('email')).trim(), password = String(f.get('password'));
    if (!email || password.length < 6) { state.err = 'Informe o e-mail e uma senha com pelo menos 6 caracteres.'; renderLogin(); return; }
    const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: new URL('admin.html', location.href).href } });
    if (error) { state.err = error.message; renderLogin(); return; }
    if (data.session) { await enterAdmin(); return; }
    state.msg = 'Acesso criado. Confira o e-mail para confirmar a conta e depois entre com a senha escolhida.'; renderLogin();
  });
}
async function claimAndCheck() {
  const { data } = await supabase.from('admin_users').select('id').eq('id', state.session.user.id).maybeSingle();
  return !!data;
}
async function enterAdmin() {
  const { data: { session } } = await supabase.auth.getSession(); state.session = session;
  if (!session) { renderLogin(); return; }
  const ok = await claimAndCheck();
  if (!ok) { await supabase.auth.signOut(); state.session = null; state.err = 'Este e-mail não está autorizado para administrar o site.'; renderLogin(); return; }
  state.view = 'dashboard'; state.edit = null; await loadView();
}

function navButton(view, label) { return `<button data-view="${view}" class="${state.view === view ? 'active' : ''}">${label}</button>`; }
function shell(content, title = 'Painel administrativo') {
  app.innerHTML = `<div class="admin-shell"><aside class="admin-side"><div class="admin-brand"><img src="assets/logo-sbatletismo.svg" alt="SBAtletismo"></div><nav class="admin-nav">${navButton('dashboard', 'Início')}${navButton('settings', 'Dados do site')}${navButton('news', 'Notícias')}${navButton('projects', 'Projetos')}${navButton('events', 'Eventos')}${navButton('athletes', 'Atletas')}${navButton('team', 'Equipe')}${navButton('gallery', 'Fotos')}${navButton('partners', 'Parceiros')}${navButton('documents', 'Transparência')}</nav><div class="admin-side-footer"><small>${esc(state.session?.user?.email || '')}</small><button id="logout" class="btn-admin secondary small">Sair</button><a class="btn-admin secondary small" href="index.html" target="_blank">Abrir site ↗</a></div></aside><main class="admin-main"><header class="admin-top"><div><small>SBATLETISMO</small><h2>${esc(title)}</h2></div><div class="admin-top-actions"><a class="btn-admin secondary small" href="transparencia.html" target="_blank">Ver transparência ↗</a><a class="btn-admin secondary small" href="index.html" target="_blank">Ver site ↗</a></div></header><div class="admin-content">${notice()}${content}</div></main></div>`;
  bindShell();
}
function bindShell() {
  document.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', async () => { clearNotice(); state.view = b.dataset.view; state.edit = null; await loadView(); }));
  document.querySelector('#logout')?.addEventListener('click', async () => { await supabase.auth.signOut(); state.session = null; renderLogin(); });
}

async function loadCounts() {
  const pairs = [['news', 'news_posts'], ['projects', 'projects'], ['athletes', 'athletes'], ['documents', 'documents']];
  await Promise.all(pairs.map(async ([key, table]) => {
    const { count } = await supabase.from(table).select('*', { count: 'exact', head: true }); state.counts[key] = count || 0;
  }));
}
async function renderDashboard() {
  await loadCounts();
  shell(`<section class="admin-hero"><small>GERENCIAMENTO DO SITE</small><h1>Olá! O que você quer atualizar?</h1><p>Escolha uma área abaixo. Você não precisa mexer em código, GitHub, Vercel ou Supabase.</p></section><div class="quick-grid"><button class="quick-card quick-action" data-jump="news"><strong>＋</strong><span>Nova notícia</span><small>Publique novidades da associação</small></button><button class="quick-card quick-action" data-jump="gallery"><strong>＋</strong><span>Adicionar fotos</span><small>Atualize a galeria</small></button><button class="quick-card quick-action" data-jump="documents"><strong>＋</strong><span>Enviar documento</span><small>Portal da Transparência</small></button><button class="quick-card quick-action" data-jump="settings"><strong>⚙</strong><span>Dados do site</span><small>Textos, contatos e redes sociais</small></button></div><section class="panel"><div class="panel-head"><div><h3>Resumo</h3><p>Quantidade de conteúdo cadastrado.</p></div></div><div class="quick-grid compact"><div class="quick-card"><strong>${state.counts.news || 0}</strong><span>Notícias</span></div><div class="quick-card"><strong>${state.counts.projects || 0}</strong><span>Projetos</span></div><div class="quick-card"><strong>${state.counts.athletes || 0}</strong><span>Atletas</span></div><div class="quick-card"><strong>${state.counts.documents || 0}</strong><span>Documentos</span></div></div></section><div class="notice info"><strong>Dica:</strong> quando uma opção estiver marcada como “Exibir no site” ou “Publicado”, ela ficará visível para o público.</div>`, 'Início');
  document.querySelectorAll('[data-jump]').forEach(b => b.addEventListener('click', async () => { state.view = b.dataset.jump; state.edit = null; await loadView(); }));
}

function input(name, label, value = '', type = 'text', extra = '', placeholder = '') {
  if (type === 'textarea') return `<label class="field ${extra}"><span>${esc(label)}</span><textarea class="textarea" name="${name}" placeholder="${esc(placeholder)}">${esc(value || '')}</textarea></label>`;
  return `<label class="field ${extra}"><span>${esc(label)}</span><input class="input" name="${name}" type="${type}" value="${esc(value || '')}" placeholder="${esc(placeholder)}"></label>`;
}
function filePicker(name, label, accept = 'image/*', current = '') {
  return `<label class="field"><span>${esc(label)}</span><div class="upload-box">${current ? `<img src="${esc(current)}" alt="Imagem atual" class="settings-preview">` : ''}<input name="${name}" type="file" accept="${accept}"><small>${current ? 'A imagem atual será mantida se você não escolher outra.' : 'Escolha uma imagem do aparelho.'}</small></div></label>`;
}
async function renderSettings() {
  const { data, error } = await supabase.from('site_settings').select('*').eq('id', 1).single();
  if (error) { state.err = error.message; shell('', 'Dados do site'); return; }
  state.settings = data; const f = data || {};
  shell(`<section class="panel"><div class="panel-head"><div><h3>Informações principais</h3><p>Esses dados aparecem automaticamente no site.</p></div></div><form id="settings-form"><div class="form-grid">${input('organization_name', 'Nome da associação', f.organization_name)}${input('tagline', 'Slogan', f.tagline)}${input('hero_title', 'Título da página inicial', f.hero_title)}${input('hero_subtitle', 'Frase de destaque', f.hero_subtitle, 'textarea', 'full')}${input('about_text', 'Sobre a associação', f.about_text, 'textarea', 'full')}${filePicker('hero_upload', 'Imagem principal', 'image/*', f.hero_image_url)}<div class="field admin-field-note"><span>Imagem principal</span><p>Envie uma nova imagem apenas quando quiser substituir a atual.</p></div></div><div class="form-divider"><span>Contato e redes sociais</span></div><div class="form-grid">${input('contact_email', 'E-mail', f.contact_email, 'email')}${input('contact_phone', 'WhatsApp', f.contact_phone, 'text', '', '(19) 99999-9999')}${input('address', 'Localização exibida', f.address, 'text', '', "Santa Bárbara d'Oeste - SP")}${input('instagram_url', 'Instagram (@perfil ou link)', f.instagram_url)}${input('facebook_url', 'Facebook (opcional)', f.facebook_url)}${input('youtube_url', 'YouTube (opcional)', f.youtube_url)}${input('registration_url', 'Link de inscrição (opcional)', f.registration_url, 'url')}</div><div class="form-actions"><button class="btn-admin" type="submit">Salvar dados do site</button></div></form></section>`, 'Dados do site');
  document.querySelector('#settings-form').addEventListener('submit', saveSettings);
}

async function upload(file, bucket, folder) {
  if (!file || !file.size) return '';
  const safe = file.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '-');
  const path = `${folder}/${Date.now()}-${crypto.randomUUID()}-${safe}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type || undefined, upsert: false });
  if (error) throw error;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}
function normalizeInstagram(v) {
  const s = String(v || '').trim(); if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  return `https://www.instagram.com/${s.replace(/^@/, '').replace(/\/$/, '')}/`;
}
async function saveSettings(e) {
  e.preventDefault(); clearNotice(); setBusy(e.currentTarget, true);
  try {
    const fd = new FormData(e.currentTarget);
    const payload = {
      organization_name: String(fd.get('organization_name') || '').trim() || null,
      tagline: String(fd.get('tagline') || '').trim() || null,
      hero_title: String(fd.get('hero_title') || '').trim() || null,
      hero_subtitle: String(fd.get('hero_subtitle') || '').trim() || null,
      about_text: String(fd.get('about_text') || '').trim() || null,
      hero_image_url: state.settings?.hero_image_url || null,
      contact_email: String(fd.get('contact_email') || '').trim() || null,
      contact_phone: String(fd.get('contact_phone') || '').trim() || null,
      address: String(fd.get('address') || '').trim() || null,
      instagram_url: normalizeInstagram(fd.get('instagram_url')),
      facebook_url: String(fd.get('facebook_url') || '').trim() || null,
      youtube_url: String(fd.get('youtube_url') || '').trim() || null,
      registration_url: String(fd.get('registration_url') || '').trim() || null
    };
    const file = fd.get('hero_upload'); if (file?.size) payload.hero_image_url = await upload(file, 'site-media', 'settings');
    const { error } = await supabase.from('site_settings').update(payload).eq('id', 1); if (error) throw error;
    state.msg = 'Dados do site salvos com sucesso.'; await renderSettings();
  } catch (err) { state.err = err.message || String(err); await renderSettings(); }
}

function fieldHtml(field, row) {
  const [name, label, type, opts] = field;
  const val = row?.[name] ?? defaults[state.view]?.[name] ?? '';
  const req = opts === true ? 'required' : '';
  if (type === 'textarea') return `<label class="field full"><span>${esc(label)}</span><textarea class="textarea" name="${name}" ${req}>${esc(val)}</textarea></label>`;
  if (type === 'select') return `<label class="field"><span>${esc(label)}</span><select class="select" name="${name}">${opts.map(o => { const pair = Array.isArray(o) ? o : [o, o]; const value = String(pair[0]), text = String(pair[1]); return `<option value="${esc(value)}" ${String(val) === value ? 'selected' : ''}>${esc(text)}</option>`; }).join('')}</select></label>`;
  if (type === 'checkbox') return `<label class="field toggle-field"><span>${esc(label)}</span><label class="toggle-row"><input name="${name}" type="checkbox" ${val ? 'checked' : ''}><span class="toggle-copy">Sim</span></label></label>`;
  if (type === 'image') return `<label class="field"><span>${esc(label)}</span><div class="upload-box">${val ? `<img src="${esc(val)}" alt="Imagem atual" class="thumb upload-preview">` : ''}<input name="${name}" type="file" accept="image/*" ${!val && opts === true ? 'required' : ''}><small>${val ? 'A imagem atual será mantida se você não escolher outra.' : 'Escolha uma imagem do aparelho.'}</small></div></label>`;
  if (type === 'file') return `<label class="field"><span>${esc(label)}</span><div class="upload-box">${val ? `<a href="${esc(val)}" target="_blank" class="current-file">Ver arquivo atual ↗</a>` : ''}<input name="${name}" type="file" accept="application/pdf,.pdf,.doc,.docx,.xls,.xlsx" ${!val && opts === true ? 'required' : ''}><small>PDF é o formato recomendado.</small></div></label>`;
  let display = val; if (type === 'datetime-local' && val) display = String(val).slice(0, 16);
  return `<label class="field"><span>${esc(label)}</span><input class="input" name="${name}" type="${type}" value="${esc(display)}" ${req}></label>`;
}
function rowMeta(view, r) {
  if (view === 'news') return `${statusLabels[r.status] || r.status} • ${fmt(r.published_at || r.created_at)}`;
  if (view === 'events') return `${statusLabels[r.status] || r.status} • ${fmt(r.event_date)}`;
  if (view === 'documents') return `${documentCategoryLabels[r.category] || r.category || 'Sem categoria'} • ${fmt(r.document_date)} • ${r.is_published ? 'Visível no portal' : 'Oculto do público'}`;
  if (view === 'athletes') return `${r.category || ''}${r.specialty ? ' • ' + r.specialty : ''}`;
  if (view === 'team') return r.role || '';
  if (view === 'partners') return statusLabels[r.partner_type] || r.partner_type || '';
  if (view === 'gallery') return `${r.event_name || ''}${r.event_date ? ' • ' + fmt(r.event_date) : ''}`;
  return r.active === false ? 'Oculto do site' : 'Visível no site';
}
function rowThumb(view, r) {
  const k = { news: 'cover_image_url', projects: 'image_url', events: 'image_url', athletes: 'photo_url', team: 'photo_url', gallery: 'image_url', partners: 'logo_url' }[view];
  return k && r[k] ? `<img class="thumb" src="${esc(r[k])}" alt="">` : '';
}
function formHelp(view) {
  const map = {
    news: 'Escreva o título e o conteúdo. O endereço da notícia é criado automaticamente.',
    projects: 'Cadastre os projetos da associação e escolha se devem aparecer no site.',
    events: 'Cadastre competições, eventos e ações. Eventos publicados podem aparecer automaticamente na página inicial.',
    athletes: 'Cadastre os atletas e paratletas. Você pode destacar alguns na página inicial.',
    team: 'Cadastre diretoria, comissão técnica e demais profissionais.',
    gallery: 'Envie fotos para a galeria pública.',
    partners: 'Cadastre patrocinadores, apoiadores e parceiros institucionais.',
    documents: 'Envie documentos para o Portal da Transparência. Só aparecem ao público quando a opção de exibição estiver marcada.'
  };
  return map[view] || '';
}
async function renderCrud(view) {
  const d = defs[view]; let query = supabase.from(d.table).select('*');
  if (view === 'documents') query = query.order('display_order', { ascending: true }).order('document_date', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false });
  else query = query.order('created_at', { ascending: false });
  const { data, error } = await query; if (error) { state.err = error.message; state.rows = []; } else state.rows = data || [];
  const edit = state.edit ? state.rows.find(r => String(r.id) === String(state.edit)) : null;
  const formRow = edit || defaults[view] || {};
  const normalFields = d.fields.filter(f => !f[4]); const advancedFields = d.fields.filter(f => f[4]);
  const title = edit ? `Editar ${d.singular}` : `Adicionar ${d.singular}`;
  const saveLabel = edit ? 'Salvar alterações' : `Salvar ${d.singular}`;
  shell(`<section class="panel admin-editor"><div class="panel-head"><div><h3>${esc(title)}</h3><p>${esc(formHelp(view))}</p></div>${edit ? '<button id="cancel-edit" class="btn-admin secondary small">Cancelar edição</button>' : ''}</div><form id="crud-form"><div class="form-grid">${normalFields.map(f => fieldHtml(f, formRow)).join('')}</div>${advancedFields.length ? `<details class="advanced-box"><summary>Opções avançadas</summary><div class="form-grid">${advancedFields.map(f => fieldHtml(f, formRow)).join('')}</div></details>` : ''}<div class="form-actions"><button class="btn-admin" type="submit">${esc(saveLabel)}</button></div></form></section><section class="panel"><div class="panel-head"><div><h3>${view === 'documents' ? 'Documentos cadastrados' : esc(d.label)}</h3><p>${state.rows.length === 0 ? 'Nenhum item cadastrado ainda.' : `${state.rows.length} ${state.rows.length === 1 ? 'item cadastrado' : 'itens cadastrados'}.`}</p></div></div><div class="admin-list">${state.rows.length ? state.rows.map(r => `<div class="admin-row"><div class="row-with-thumb">${rowThumb(view, r)}<div><h4>${esc(r[d.titleKey] || r.name || r.title || 'Sem título')}</h4><p>${esc(rowMeta(view, r))}</p></div></div><div class="row-actions"><button class="btn-admin secondary small" data-edit="${r.id}">Editar</button><button class="btn-admin danger small" data-delete="${r.id}" data-name="${esc(r[d.titleKey] || r.name || r.title || 'este item')}">Excluir</button></div></div>`).join('') : '<div class="empty friendly-empty"><strong>Nada por aqui ainda.</strong><span>Use o formulário acima para adicionar o primeiro item.</span></div>'}</div></section>`, d.label);
  bindCrud(view, d);
}
function bindCrud(view, d) {
  document.querySelector('#crud-form')?.addEventListener('submit', e => saveCrud(e, view, d));
  document.querySelector('#cancel-edit')?.addEventListener('click', async () => { state.edit = null; await renderCrud(view); });
  document.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', async () => { state.edit = b.dataset.edit; await renderCrud(view); window.scrollTo({ top: 0, behavior: 'smooth' }); }));
  document.querySelectorAll('[data-delete]').forEach(b => b.addEventListener('click', async () => {
    const name = b.dataset.name || 'este item';
    if (!confirm(`Tem certeza que deseja excluir “${name}”?\n\nEssa ação não pode ser desfeita.`)) return;
    clearNotice(); const { error } = await supabase.from(d.table).delete().eq('id', b.dataset.delete);
    if (error) state.err = error.message; else state.msg = 'Item excluído com sucesso.';
    state.edit = null; await renderCrud(view);
  }));
}
async function saveCrud(e, view, d) {
  e.preventDefault(); clearNotice(); setBusy(e.currentTarget, true);
  try {
    const fd = new FormData(e.currentTarget), current = state.edit ? state.rows.find(r => String(r.id) === String(state.edit)) || {} : {}, payload = {};
    for (const f of d.fields) {
      const [name, , type] = f;
      if (type === 'image') { const file = fd.get(name); payload[name] = file?.size ? await upload(file, 'site-media', d.table) : (current[name] || null); }
      else if (type === 'file') { const file = fd.get(name); payload[name] = file?.size ? await upload(file, 'documents', d.table) : (current[name] || null); }
      else if (type === 'checkbox') payload[name] = fd.get(name) === 'on';
      else if (type === 'number') payload[name] = Number(fd.get(name) || current[name] || 0);
      else { const raw = String(fd.get(name) || '').trim(); payload[name] = raw || null; }
    }
    if (view === 'news') {
      payload.slug = current.slug || slugify(payload.title);
      if (payload.status === 'published' && !payload.published_at) payload.published_at = new Date().toISOString();
      if (payload.status === 'draft' && !current.published_at) payload.published_at = null;
    }
    if (state.edit) {
      const { error } = await supabase.from(d.table).update(payload).eq('id', state.edit); if (error) throw error;
      state.msg = `${d.label} atualizado com sucesso.`;
    } else {
      const { error } = await supabase.from(d.table).insert(payload); if (error) throw error;
      state.msg = `${d.singular.charAt(0).toUpperCase() + d.singular.slice(1)} salvo com sucesso.`;
    }
    state.edit = null; await renderCrud(view);
  } catch (err) {
    if (String(err?.message || '').includes('news_posts_slug_key')) state.err = 'Já existe uma notícia com esse título. Altere um pouco o título e tente novamente.';
    else state.err = err.message || String(err);
    await renderCrud(view);
  }
}
async function loadView() {
  if (!state.session) { renderLogin(); return; }
  if (state.view === 'dashboard') return renderDashboard();
  if (state.view === 'settings') return renderSettings();
  if (defs[state.view]) return renderCrud(state.view);
}

supabase.auth.onAuthStateChange(async (_event, session) => {
  state.session = session;
  if (session && !app.querySelector('.admin-shell')) await enterAdmin();
  if (!session && !app.querySelector('.login-shell')) renderLogin();
});
(async () => {
  const { data: { session } } = await supabase.auth.getSession(); state.session = session;
  if (session) await enterAdmin(); else renderLogin();
})();
