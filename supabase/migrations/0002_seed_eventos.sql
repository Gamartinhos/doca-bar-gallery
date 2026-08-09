-- =====================================================================
-- Seed: as noites reais da Doca (flyers em /public/flyers)
-- Idempotente — pode rodar quantas vezes quiser.
-- =====================================================================

insert into public.events (title, slug, date, description, cover_image, accent, is_published)
values
  ('Quinta Fever · Reggae Is The Force',
   'quinta-fever-reggae-is-the-force',
   '2026-05-14',
   'Quinta de reggae raiz com sound system ligado no talo. Grave que sobe pelo chão.',
   '/flyers/quinta-fever-14-05.jpg', 'green', true),

  ('B.O.S.S · Original S.S',
   'boss-original-ss-31-05',
   '2026-05-31',
   'Posse na área. Rima crua, base pesada e a parede tremendo até o sol raiar.',
   '/flyers/boss-31-05.jpg', 'red', true),

  ('B.O.S.S · Segunda Rodada',
   'boss-segunda-rodada-07-06',
   '2026-06-07',
   'A sequência do baile que lotou. Mesma pegada, dobro de gente.',
   '/flyers/boss-07-06.jpg', 'red', true),

  ('B.O.S.S · Terceira Rodada',
   'boss-terceira-rodada-14-06',
   '2026-06-14',
   'Original S.S de volta. Microfone aberto e ninguém sai ileso.',
   '/flyers/boss-14-06.jpg', 'red', true),

  ('Baile do 7',
   'baile-do-7',
   '2026-06-20',
   'Baile de rua dentro de casa. Funk, suor e luz vermelha até fechar.',
   '/flyers/baile-do-7-20-06.jpg', 'purple', true),

  ('Rude Rave · Dub Jungle System',
   'rude-rave-dub-jungle-system',
   '2026-06-27',
   'Jungle, dub e drum. A noite mais rápida do calendário.',
   '/flyers/rude-rave.jpg', 'green', true),

  ('Rasta Fuego & ALN',
   'rasta-fuego-e-aln',
   '2026-07-04',
   'Reggae, dancehall e fumaça. Noite lenta, grave alto.',
   '/flyers/rasta-e-aln.jpg', 'green', true),

  ('Baile do Bigode · Dance Machine',
   'baile-do-bigode-dance-machine',
   '2026-07-13',
   'A máquina de dançar ligada. Baile clássico da casa.',
   '/flyers/baile-do-bigode-13-07.jpg', 'purple', true),

  ('0800 · Baile do Bigode',
   '0800-baile-do-bigode',
   '2026-07-20',
   'Entrada franca até meia-noite. Depois disso a fila dobra o quarteirão.',
   '/flyers/0800-bigode-20-07.jpg', 'blue', true),

  ('Original · Prensound Black Style Posse',
   'original-prensound-black-style-posse',
   '2026-07-25',
   'Black Style Posse comandando. Som system, corrente de ouro e atitude.',
   '/flyers/original-prensound.jpg', 'red', true)
on conflict (slug) do update
  set title       = excluded.title,
      date        = excluded.date,
      description = excluded.description,
      cover_image = excluded.cover_image,
      accent      = excluded.accent;

-- ---------------------------------------------------------------------
-- Registros da casa (fotos do espaço) distribuídos entre as noites.
-- photographer_id fica null: é acervo da casa, sem crédito individual.
-- ---------------------------------------------------------------------

with alvo as (
  select id, slug,
         row_number() over (order by date desc) as n
  from public.events
),
fotos(arquivo, legenda, k) as (
  values
    ('/noites/noite-01.png', 'Parede pichada, luz roxa', 1),
    ('/noites/noite-02.png', 'Pista cheia no melhor momento', 2),
    ('/noites/noite-03.png', 'Neon vermelho batendo na cara', 3),
    ('/noites/noite-04.png', 'Fachada da casa', 4),
    ('/noites/noite-05.png', 'Grafite do fundo do salão', 5),
    ('/noites/noite-06.png', 'Balcão às duas da manhã', 6),
    ('/noites/noite-08.jpeg', 'Registro solto da noite', 7)
)
insert into public.media (event_id, photographer_id, url, thumbnail_url, type, caption, status)
select a.id, null, f.arquivo, f.arquivo, 'photo', f.legenda, 'approved'
from fotos f
join alvo a on a.n = ((f.k - 1) % (select count(*) from alvo)) + 1
where not exists (
  select 1 from public.media m where m.url = f.arquivo and m.event_id = a.id
);
