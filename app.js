import { supabase } from './config.js';

const esc = (v='') => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtDate = (v) => v ? new Intl.DateTimeFormat('pt-BR').format(new Date(v + (v.length===10?'T12:00:00':''))) : '—';
const goodUrl = (v) => { try { const u = new URL(v); return ['http:','https:'].includes(u.protocol) ? u.href : ''; } catch { return ''; } };

const menu = document.querySelector('#menu-toggle');
menu?.addEventListener('click',()=>{const nav=document.querySelector('#main-nav');nav?.classList.toggle('open');menu.setAttribute('aria-expanded',nav?.classList.contains('open')?'true':'false')});
document.querySelectorAll('#main-nav a').forEach(a=>a.addEventListener('click',()=>document.querySelector('#main-nav')?.classList.remove('open')));
let scale=1; document.querySelector('#font-inc')?.addEventListener('click',()=>{scale=Math.min(1.18,scale+.05);document.documentElement.style.fontSize=`${scale*100}%`});document.querySelector('#font-dec')?.addEventListener('click',()=>{scale=Math.max(.9,scale-.05);document.documentElement.style.fontSize=`${scale*100}%`});
document.querySelector('#year').textContent = new Date().getFullYear();

function projectCard(p,i){return `<article class="project-card ${i===0?'featured':''}"><div class="project-number">${String(i+1).padStart(2,'0')}</div><div class="project-content"><span class="project-label">PROJETO</span><h3>${esc(p.title)}</h3><p>${esc(p.summary || p.body || '')}</p></div><div class="project-line"></div></article>`}
function newsCard(n){const img=goodUrl(n.cover_image_url);return `<article class="news-card"><div class="news-visual" ${img?`style="background-image:linear-gradient(transparent,rgba(13,22,59,.45)),url('${esc(img)}')"`:''}><span>NOTÍCIA</span></div><div class="news-copy"><small>${esc(fmtDate(n.published_at || n.created_at))}</small><h3>${esc(n.title)}</h3><p>${esc(n.excerpt || '')}</p></div></article>`}
function docRow(d){return `<a class="document-row" href="${esc(goodUrl(d.file_url))}" target="_blank" rel="noopener"><span class="doc-icon">↗</span><span><strong>${esc(d.title)}</strong><small>${esc(d.category)} • ${esc(fmtDate(d.document_date))}</small></span><b>→</b></a>`}

async function load(){
  const [settings,projects,gallery,news,partners,docs,athletesCount,eventsCount,projectsCount,newsCount] = await Promise.all([
    supabase.from('site_settings').select('*').eq('id',1).single(),
    supabase.from('projects').select('*').order('display_order').order('created_at',{ascending:false}).limit(6),
    supabase.from('gallery_items').select('*').order('display_order').order('created_at',{ascending:false}).limit(8),
    supabase.from('news_posts').select('*').order('published_at',{ascending:false,nullsFirst:false}).order('created_at',{ascending:false}).limit(6),
    supabase.from('partners').select('*').order('display_order').order('created_at',{ascending:false}).limit(10),
    supabase.from('documents').select('*').order('document_date',{ascending:false,nullsFirst:false}).order('created_at',{ascending:false}).limit(5),
    supabase.from('athletes').select('*',{count:'exact',head:true}),
    supabase.from('events').select('*',{count:'exact',head:true}),
    supabase.from('projects').select('*',{count:'exact',head:true}),
    supabase.from('news_posts').select('*',{count:'exact',head:true}),
  ]);
  if(settings.data){const s=settings.data; if(s.hero_title)document.querySelector('#hero-title').textContent=s.hero_title;if(s.hero_subtitle)document.querySelector('#hero-subtitle').textContent=s.hero_subtitle;if(s.about_text)document.querySelector('#about-text').textContent=s.about_text;if(s.contact_email)document.querySelector('#contact-email').textContent=s.contact_email;if(s.contact_phone)document.querySelector('#contact-phone').textContent=s.contact_phone;if(s.address)document.querySelector('#contact-address').textContent=s.address;const social=[s.instagram_url&&'Instagram',s.facebook_url&&'Facebook',s.youtube_url&&'YouTube'].filter(Boolean).join(' • ');if(social)document.querySelector('#contact-social').textContent=social;const hero=goodUrl(s.hero_image_url);if(hero)document.querySelector('#hero-logo-card').innerHTML=`<img src="${esc(hero)}" alt="Imagem de destaque da SB Atletismo">`;}
  const pg=document.querySelector('#projects-grid');if(projects.data?.length)pg.innerHTML=projects.data.map(projectCard).join('');
  const gg=document.querySelector('#gallery-grid');if(gallery.data?.length)gg.innerHTML=gallery.data.map((g,i)=>{const url=goodUrl(g.image_url);return `<div class="gallery-tile g${(i%5)+1}" ${url?`style="background-image:url('${esc(url)}')"`:''}><span>${esc(g.caption||g.event_name||'SB Atletismo')}</span></div>`}).join('');
  const ng=document.querySelector('#news-grid');if(news.data?.length)ng.innerHTML=news.data.map(newsCard).join('');
  const partner=document.querySelector('#partner-grid');if(partners.data?.length)partner.innerHTML=partners.data.map(p=>{const logo=goodUrl(p.logo_url);const site=goodUrl(p.website_url);const inner=logo?`<img src="${esc(logo)}" alt="${esc(p.name)}">`:`<span>${esc(p.name)}</span>`;return site?`<a class="partner-card" href="${esc(site)}" target="_blank" rel="noopener">${inner}</a>`:`<div class="partner-card">${inner}</div>`}).join('');
  const hd=document.querySelector('#home-documents');if(docs.data?.length)hd.innerHTML=docs.data.map(docRow).join('');
  document.querySelector('#stat-athletes').textContent=athletesCount.count??0;document.querySelector('#stat-events').textContent=eventsCount.count??0;document.querySelector('#stat-projects').textContent=projectsCount.count??0;document.querySelector('#stat-news').textContent=newsCount.count??0;
}
load().catch(console.error);
