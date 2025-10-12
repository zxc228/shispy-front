

-- =========================================
-- SHIPS demo seed (PostgreSQL)
-- =========================================
begin;

-- 0) Базовые настройки игры
insert into ships.settings (game_cost, treasury_tuid)
values (10.0, 335707594)
on conflict do nothing;

-- 1) USERS (включая твоего)
insert into ships.users (tuid, username, first_name, last_name, language_code, is_premium, photo_url, created_at, updated_at)
values
    (335707594, 'diabobus', 'Ilya', null, 'en', true,
     'https://t.me/i/userpic/320/D7GBxhv79GYHCfCbGAOFFv2928vAfiR3BYWUaqo1Wmo.svg',
     timestamptz '2025-10-12 13:20:37.742+00', timestamptz '2025-10-12 13:33:42.870+00'),
    (1001, 'alice', 'Alice', 'Navarro', 'en', true, 'https://example.com/u/alice.svg', now(), now()),
    (1002, 'bob', 'Bob', 'Kuznetsov', 'ru', false, 'https://example.com/u/bob.svg', now(), now()),
    (1003, 'carol', 'Carol', 'Diaz', 'es', true, 'https://example.com/u/carol.svg', now(), now()),
    (1004, 'dave', 'Dave', 'Mori', 'en', false, 'https://example.com/u/dave.svg', now(), now())
on conflict (tuid) do update
set username = excluded.username,
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    language_code = excluded.language_code,
    is_premium = excluded.is_premium,
    photo_url = excluded.photo_url,
    updated_at = now();

-- 2) BALANCES
insert into ships.balances (tuid, balance, address, created_at, updated_at)
values
    (335707594, 125.50, 'UQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', now(), now()),
    (1001,  75.00, 'UQ111111111111111111111111111111111111111111', now(), now()),
    (1002,  42.25, 'UQ222222222222222222222222222222222222222222', now(), now()),
    (1003, 310.00, 'UQ333333333333333333333333333333333333333333', now(), now()),
    (1004,   5.75, 'UQ444444444444444444444444444444444444444444', now(), now())
on conflict (tuid) do update
set balance = excluded.balance,
    address = excluded.address,
    updated_at = now();

-- 3) GIFTS (подарки)
insert into ships.gifts (gid, value, slug, photo, in_treasury, created_at, updated_at)
values
    (50001, 2.5,  'rose',   '\x', true, now(), now()),
    (50002, 7.0,  'teddy',  '\x', true, now(), now()),
    (50003, 15.0, 'ring',   '\x', true, now(), now()),
    (50004, 30.0, 'watch',  '\x', true, now(), now())
on conflict (gid) do update
set value = excluded.value,
    slug = excluded.slug,
    in_treasury = excluded.in_treasury,
    updated_at = now();

-- 4) TREASURY (кто держит какие подарки в казне)
insert into ships.treasury (tuid, gid) values
    (335707594, 50000),
    (335707594, 50002),
    (1003,      50003),
    (1001,      50001)
on conflict do nothing;

-- 5) Реферальная программа
-- Проценты (кто получает % от игр своих рефералов)
insert into ships.refferals (tuid, percantage, created_at)
values
    (335707594, 5.0, now()),  -- ты получаешь 5% от игр своих рефералов
    (1001,      3.0, now())   -- Alice получает 3% от своих рефералов
on conflict (tuid) do update
set percantage = excluded.percantage;

-- Связки "рефовод -> реферал"
insert into ships.users_refferals (ruid, tuid) values
    (335707594, 1001),  -- ты рефовод для Alice
    (335707594, 1002),  -- ты рефовод для Bob
    (1001,      1004)   -- Alice рефовод для Dave
on conflict do nothing;

-- 6) Очередь (queque) — заявки на игры/ставки
insert into ships.queque (tuid, bet, bet_value, created_at)
values
    (1001, '{50001}',  1, now() - interval '10 minutes'),
    (1003, '{50003}',    2, now() - interval '5 minutes')
on conflict do nothing;

-- 7) Примеры трансферов подарков
insert into ships.transfers_gifts (tuid, type, gid, created_at)
values
    (1001, 'send', 50001, now() - interval '1 day'),
    (1002, 'receive', 50001, now() - interval '1 day'),
    (1003, 'send', 50003, now() - interval '2 hours')
on conflict do nothing;

-- 8) Примеры крипто-трансферов
insert into ships.transfers_crypto (tuid, type, amount, hash, status, created_at, updated_at)
values
    (1001, 'deposit',  20.00, '0xaaa111', 'confirmed', now() - interval '2 days', now() - interval '2 days'),
    (1002, 'withdraw', 10.00, '0xbbb222', 'pending',   now() - interval '1 day',  now() - interval '1 hour'),
    (1003, 'deposit', 100.00, '0xccc333', 'confirmed', now() - interval '3 days', now() - interval '3 days')
on conflict do nothing;

-- 9) Игры (триггер создаст referral_payouts)
-- winner: 1 = выиграл tuid1, 2 = выиграл tuid2 (подстрой под свою логику при необходимости)
insert into ships.games (cost, tuid1, tuid2, bet1, bet2, bet_value1, bet_value2, treasure_field1, treasure_field2, winner, created_at, updated_at)
values
    (10.0, 1001, 1002, '{1,5,7,9}', '{2,4,6,8}', 1, 1, 3, 6, 1, now() - interval '30 minutes', now() - interval '29 minutes'),
    (20.0, 1003, 1004, '{3,6,9}',   '{1,2,3,4}', 2, 1, 5, 7, 2, now() - interval '15 minutes', now() - interval '14 minutes')
returning game_id;

-- 10) Явные примеры выплат (обычно создаются триггером, но добавим одну «ручную» для демонстрации)
-- Найдём любую игру между 1001 и 1002 (можно пропустить, если полагаешься только на триггер)
with g as (
  select game_id, cost from ships.games
  where (tuid1 = 1001 and tuid2 = 1002) or (tuid1 = 1002 and tuid2 = 1001)
  order by created_at desc limit 1
)
insert into ships.referral_payouts (ruid, game_id, tuid, value, is_payment, created_at, updated_at)
select 335707594, g.game_id, 1001, (g.cost * 0.05), false, now(), now()
from g
on conflict do nothing;

-- 11) wallet_lt_hash (обновим тестовыми значениями)
update ships.wallet_lt_hash
set last_lt = 1234567890,
    last_hash = '1111111111111111111111111111111111111111111111111111111111111111',
    middle_lt = 1234567900,
    middle_hash = '2222222222222222222222222222222222222222222222222222222222222222',
    new_lt = 1234568000,
    new_hash = '3333333333333333333333333333333333333333333333333333333333333333',
    updated_at = now()
where id = 1;

commit;

-- ========= Проверки (по желанию) =========
-- select * from ships.users order by tuid;
-- select * from ships.balances order by tuid;
-- select * from ships.gifts order by gid;
-- select * from ships.treasury order by tuid, gid;
-- select * from ships.refferals;
-- select * from ships.users_refferals;
-- select * from ships.games order by created_at desc;
-- select * from ships.referral_payouts order by created_at desc;
-- select * from ships.queque order by created_at desc;
-- select * from ships.transfers_crypto order by created_at desc;
-- select * from ships.transfers_gifts order by created_at desc;
