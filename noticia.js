import { supabase } from './config.js';

const goodUrl=(v)=>{try{const u=new URL(v);return ['http:','https:'].includes(u.protocol)?u.href:''}catch{return ''}};
const fmtDate=(v)=>{
  if(!v)return '';
  try{return new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'long',year:'numeric'}).format(new Date(v))}
  catch{return ''}
};

document.querySelector('#year').textContent=new Date().getFullYear();

function showError(title,message){
  const card=document.querySelector('#article-card');
  card.innerHTML=`<div class="article-error"><h1>${title}</h1><p>${message}</p><p style="margin-top:24px"><a class="btn btn-primary" href="/#noticias">Voltar para notícias</a></p></div>`;
}

async function load(){
  const params=new URLSearchParams(location.search);
  const slug=params.get('slug');
  const id=params.get('id');

  if(!slug && !id){
    showError('Notícia não encontrada','O endereço desta notícia está incompleto.');
    return;
  }

  const [settingsResult,newsResult]=await Promise.all([
    supabase.from('site_settings').select('logo_url').eq('id',1).maybeSingle(),
    (() => {
      let q=supabase.from('news_posts').select('*').eq('status','published');
      q=slug?q.eq('slug',slug):q.eq('id',id);
      return q.maybeSingle();
    })()
  ]);

  const logo=goodUrl(settingsResult.data?.logo_url);
  if(logo)document.querySelector('#article-logo').src=logo;

  if(newsResult.error){
    console.error(newsResult.error);
    showError('Não foi possível abrir a notícia','Tente novamente em alguns instantes.');
    return;
  }
  const n=newsResult.data;
  if(!n){
    showError('Notícia não encontrada','Ela pode ter sido removida, estar em rascunho ou o link pode estar incorreto.');
    return;
  }

  const cover=goodUrl(n.cover_image_url);
  if(cover){
    const img=document.querySelector('#article-cover');
    img.src=cover;
    img.alt=n.title || 'Imagem da notícia';
    img.style.display='block';
  }

  document.querySelector('#article-title').textContent=n.title || 'Notícia';
  document.querySelector('#article-meta').textContent=fmtDate(n.published_at || n.created_at);
  const excerpt=document.querySelector('#article-excerpt');
  if(n.excerpt){
    excerpt.textContent=n.excerpt;
    excerpt.hidden=false;
  }
  document.querySelector('#article-body').textContent=n.body || n.excerpt || 'Conteúdo não informado.';
  document.querySelector('#article-loading')?.remove();
  document.querySelector('#article-content').hidden=false;

  document.title=`${n.title} | SBAtletismo`;
  const meta=document.querySelector('meta[name="description"]');
  if(meta && n.excerpt)meta.setAttribute('content',n.excerpt);

  const canonical=slug
    ? `${location.origin}/noticia?slug=${encodeURIComponent(slug)}`
    : `${location.origin}/noticia?id=${encodeURIComponent(n.id)}`;

  document.querySelector('#share-news').addEventListener('click',async()=>{
    const shareData={title:n.title,text:n.excerpt || 'Notícia da SBAtletismo',url:canonical};
    try{
      if(navigator.share){
        await navigator.share(shareData);
      }else if(navigator.clipboard){
        await navigator.clipboard.writeText(canonical);
        alert('Link da notícia copiado.');
      }else{
        prompt('Copie o link da notícia:',canonical);
      }
    }catch(err){
      if(err?.name!=='AbortError')console.error(err);
    }
  });
}

load().catch(err=>{
  console.error(err);
  showError('Erro ao carregar','Não foi possível abrir esta notícia agora.');
});
