# SB Atletismo — Site + Painel Administrativo

Projeto estático preparado para Vercel e conectado ao Supabase da SB Atletismo.

## Acessos
- Site público: `/`
- Portal da Transparência: `/transparencia`
- Área administrativa: `/admin`

## Primeiro acesso administrativo
1. Abra `/admin`.
2. Informe o e-mail autorizado da associação e escolha uma senha.
3. Clique em **Criar primeiro acesso**.
4. Se o Supabase solicitar confirmação, abra o e-mail recebido.
5. Volte a `/admin` e entre com a senha criada.

O e-mail precisa estar na tabela `admin_allowlist` do Supabase. O acesso é validado no banco com RLS; a publishable key usada no navegador não concede privilégios por si só.

## Conteúdo gerenciável
Configurações gerais, notícias, projetos, eventos, atletas, equipe, galeria, parceiros e documentos do Portal da Transparência.

## Armazenamento
- `site-media`: imagens do site.
- `documents`: documentos públicos.

## Deploy
O projeto não exige build. Basta publicar a pasta na Vercel ou conectá-la a um repositório GitHub.
