import { supabase } from './config.js';

const esc = (v='') => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtDate = (v) => v ? new Intl.DateTimeFormat('pt-BR').format(new Date(v + (String(v).length===10?'T12:00:00':''))) : '—';
const goodUrl = (v) => { try { const u = new URL(v); return ['http:','https:'].includes(u.protocol) ? u.href : ''; } catch { return ''; } };
const digits = (v='') => String(v).replace(/\D/g,'');
const whatsappUrl = (phone='') => {
  let n = digits(phone);
  if (!n) return '';
  if (n.length <= 11) n = `55${n}`;
  const text = encodeURIComponent('Olá! Vim pelo site da SBAtletismo e gostaria de mais informações.');
  return `https://wa.me/${n}?text=${text}`;
};
const categoryLabels = {
  institucional:'Institucional / Estatuto',
  parcerias:'Parcerias e Termos de Fomento',
  planos:'Planos de Trabalho',
  contas:'Prestação de Contas',
  relatorios:'Relatórios de Atividades',
  financeiro:'Financeiro / Balanços / Certidões',
  editais:'Editais e Chamamentos',
  outros:'Outros documentos'
};

const menu = document.querySelector('#menu-toggle');
menu?.addEventListener('click',()=>{const nav=document.querySelector('#main-nav');nav?.classList.toggle('open');menu.setAttribute('aria-expanded',nav?.classList.contains('open')?'true':'false')});
document.querySelectorAll('#main-nav a').forEach(a=>a.addEventListener('click',()=>document.querySelector('#main-nav')?.classList.remove('open')));
let scale=1; document.querySelector('#font-inc')?.addEventListener('click',()=>{scale=Math.min(1.18,scale+.05);document.documentElement.style.fontSize=`${scale*100}%`});document.querySelector('#font-dec')?.addEventListener('click',()=>{scale=Math.max(.9,scale-.05);document.documentElement.style.fontSize=`${scale*100}%`});
document.querySelector('#year').textContent = new Date().getFullYear();

function projectCard(p,i){return `<article class="project-card ${i===0?'featured':''}"><div class="project-number">${String(i+1).padStart(2,'0')}</div><div class="project-content"><span class="project-label">PROJETO</span><h3>${esc(p.title)}</h3><p>${esc(p.summary || p.body || '')}</p></div><div class="project-line"></div></article>`}
function newsCard(n){const img=goodUrl(n.cover_image_url);return `<article class="news-card"><div class="news-visual" ${img?`style="background-image:linear-gradient(transparent,rgba(13,22,59,.45)),url('${esc(img)}')"`:''}><span>NOTÍCIA</span></div><div class="news-copy"><small>${esc(fmtDate(n.published_at || n.created_at))}</small><h3>${esc(n.title)}</h3><p>${esc(n.excerpt || '')}</p></div></article>`}
function eventCard(e){
  const img=goodUrl(e.image_url), reg=goodUrl(e.registration_url);
  return `<article class="event-card">${img?`<div class="event-visual" style="background-image:linear-gradient(transparent,rgba(10,18,55,.55)),url('${esc(img)}')"><span>EVENTO</span></div>`:''}<div class="event-body"><div class="event-date"><strong>${esc(fmtDate(e.event_date))}</strong>${e.location?`<span>${esc(e.location)}</span>`:''}</div><h3>${esc(e.title)}</h3>${e.description?`<p>${esc(e.description)}</p>`:''}${reg?`<a class="event-link" href="${esc(reg)}" target="_blank" rel="noopener">Informações / inscrição →</a>`:''}</div></article>`;
}
function docRow(d){return `<a class="document-row" href="${esc(goodUrl(d.file_url))}" target="_blank" rel="noopener"><span class="doc-icon">↗</span><span><strong>${esc(d.title)}</strong><small>${esc(categoryLabels[d.category] || d.category || 'Documento')} • ${esc(fmtDate(d.document_date))}</small></span><b>→</b></a>`}
function showDynamic(name,hasItems){const el=document.querySelector(`[data-dynamic="${name}"]`);if(el)el.classList.toggle('hidden-section',!hasItems);const nav=document.querySelector(`#main-nav a[href="#${name==='gallery'?'galeria':name==='news'?'noticias':name==='partners'?'parceiros':name==='projects'?'projetos':name==='events'?'eventos':name}"]`);if(nav)nav.classList.toggle('hidden',!hasItems)}
function sortEvents(items=[]){
  const now=Date.now();
  return [...items].sort((a,b)=>{
    const ad=a.event_date?new Date(a.event_date).getTime():0, bd=b.event_date?new Date(b.event_date).getTime():0;
    const af=ad>=now, bf=bd>=now;
    if(af!==bf) return af?-1:1;
    return af?ad-bd:bd-ad;
  }).slice(0,6);
}

async function load(){
  const [settings,projects,events,gallery,news,partners,docs,athletesCount,eventsCount,projectsCount,newsCount] = await Promise.all([
    supabase.from('site_settings').select('*').eq('id',1).single(),
    supabase.from('projects').select('*').order('display_order').order('created_at',{ascending:false}).limit(6),
    supabase.from('events').select('*').order('event_date',{ascending:false,nullsFirst:false}).limit(12),
    supabase.from('gallery_items').select('*').order('display_order').order('created_at',{ascending:false}).limit(8),
    supabase.from('news_posts').select('*').order('published_at',{ascending:false,nullsFirst:false}).order('created_at',{ascending:false}).limit(6),
    supabase.from('partners').select('*').order('display_order').order('created_at',{ascending:false}).limit(10),
    supabase.from('documents').select('*').order('document_date',{ascending:false,nullsFirst:false}).order('created_at',{ascending:false}).limit(5),
    supabase.from('athletes').select('*',{count:'exact',head:true}),
    supabase.from('events').select('*',{count:'exact',head:true}),
    supabase.from('projects').select('*',{count:'exact',head:true}),
    supabase.from('news_posts').select('*',{count:'exact',head:true}),
  ]);

  if(settings.data){
    const s=settings.data;
    if(s.hero_title)document.querySelector('#hero-title').textContent=s.hero_title;
    if(s.hero_subtitle)document.querySelector('#hero-subtitle').textContent=s.hero_subtitle;
    if(s.about_text)document.querySelector('#about-text').textContent=s.about_text;
    if(s.contact_email){
      document.querySelector('#contact-email').textContent=s.contact_email;
      document.querySelector('#contact-email-link')?.setAttribute('href',`mailto:${s.contact_email}`);
    }
    if(s.contact_phone){
      document.querySelector('#contact-phone').textContent=s.contact_phone;
      const wa=whatsappUrl(s.contact_phone);
      ['#hero-whatsapp','#quick-whatsapp','#contact-whatsapp-btn','#contact-phone-link'].forEach(sel=>{const a=document.querySelector(sel);if(a&&wa){a.setAttribute('href',wa);a.setAttribute('target','_blank');a.setAttribute('rel','noopener')}});
    }
    if(s.address)document.querySelector('#contact-address').textContent=s.address;
    if(s.instagram_url){
      const insta=goodUrl(s.instagram_url);
      if(insta){
        ['#quick-instagram','#contact-instagram-btn','#contact-social-link'].forEach(sel=>document.querySelector(sel)?.setAttribute('href',insta));
        const handle = new URL(insta).pathname.split('/').filter(Boolean)[0];
        if(handle) document.querySelector('#contact-social').textContent=`@${handle}`;
      }
    }
    const hero=goodUrl(s.hero_image_url);if(hero)document.querySelector('#hero-logo-card').innerHTML=`<img src="${esc(hero)}" alt="Imagem de destaque da SBAtletismo">`;
  }

  const pg=document.querySelector('#projects-grid');
  if(projects.data?.length){pg.innerHTML=projects.data.map(projectCard).join('');showDynamic('projects',true)}else{showDynamic('projects',false);const hp=document.querySelector('#hero-primary');if(hp){hp.setAttribute('href','#associacao');hp.textContent='Conheça a associação'}}

  const ev=sortEvents(events.data || []), eg=document.querySelector('#events-grid');
  if(ev.length){eg.innerHTML=ev.map(eventCard).join('');showDynamic('events',true)}else showDynamic('events',false);

  const gg=document.querySelector('#gallery-grid');
  if(gallery.data?.length){gg.innerHTML=gallery.data.map((g,i)=>{const url=goodUrl(g.image_url);return `<div class="gallery-tile g${(i%5)+1}" ${url?`style="background-image:url('${esc(url)}')"`:''}><span>${esc(g.caption||g.event_name||'SBAtletismo')}</span></div>`}).join('');showDynamic('gallery',true)}else showDynamic('gallery',false);

  const ng=document.querySelector('#news-grid');
  if(news.data?.length){ng.innerHTML=news.data.map(newsCard).join('');showDynamic('news',true)}else showDynamic('news',false);

  const partner=document.querySelector('#partner-grid');
  if(partners.data?.length){partner.innerHTML=partners.data.map(p=>{const logo=goodUrl(p.logo_url);const site=goodUrl(p.website_url);const inner=logo?`<img src="${esc(logo)}" alt="${esc(p.name)}">`:`<span>${esc(p.name)}</span>`;return site?`<a class="partner-card" href="${esc(site)}" target="_blank" rel="noopener">${inner}</a>`:`<div class="partner-card">${inner}</div>`}).join('');showDynamic('partners',true)}else showDynamic('partners',false);

  const hd=document.querySelector('#home-documents');if(docs.data?.length)hd.innerHTML=docs.data.map(docRow).join('');

  const stats=[['#stat-athletes',athletesCount.count],['#stat-events',eventsCount.count],['#stat-projects',projectsCount.count],['#stat-news',newsCount.count]];
  let visibleStats=0;
  stats.forEach(([sel,count])=>{const el=document.querySelector(sel);if(!el)return;const n=count??0;el.textContent=n;const card=el.closest('.stat');card?.classList.toggle('stat-zero',n===0);if(n>0)visibleStats++});
  document.querySelector('#impacto')?.classList.toggle('hidden-section',visibleStats===0);
}
load().catch(console.error);
