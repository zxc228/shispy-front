create schema if not exists ships;

create table if not exists ships.settings (
	game_cost float not null,
	treasury_tuid bigint not null
);

create table if not exists ships.users (
	tuid bigint primary key,
	username text not null default 'user',
	first_name text,
	last_name text,
	language_code varchar(10),
	is_premium bool not null default False,
	photo_url text,
	created_at timestamp(3) not null default (current_timestamp at time zone 'utc'),
	updated_at timestamp(3) not null default (current_timestamp at time zone 'utc')
);

create table if not exists ships.balances (
	tuid bigint primary key,
	balance numeric default 0,
	address text not null default 'None',
	created_at timestamp(3) not null default (current_timestamp at time zone 'utc'),
	updated_at timestamp(3) not null default (current_timestamp at time zone 'utc')
);

create table if not exists ships.treasury (
	tuid bigint,
	gid bigint,
	primary key (tuid, gid)
);

create table if not exists ships.transfers_gifts (
	transfer_id serial primary key,
	tuid bigint not null,
	type text not null,
	gid bigint not null default 0,
	created_at timestamp(3) not null default (current_timestamp at time zone 'utc')
);

create table if not exists ships.transfers_crypto (
	transfer_id serial primary key,
	tuid bigint not null,
	type text not null,
	amount numeric not null default 0,
	hash text not null default 0,
	status text not null default 'pending',
	created_at timestamp(3) not null default (current_timestamp at time zone 'utc'),
	updated_at timestamp(3) not null default (current_timestamp at time zone 'utc')
);

create table if not exists ships.queque (
	queque_id serial primary key,
	tuid bigint not null,
	bet bigint[] not null,
	bet_value int not null,
	created_at timestamp(3) not null default (current_timestamp at time zone 'utc')
);

create index if not exists queque_tuid_idx on ships.queque (tuid);
create index if not exists queque_bet_value_idx on ships.queque (bet_value);
create index if not exists queque_created_at_idx on ships.queque (created_at desc);

create table if not exists ships.games (
	game_id serial primary key,
	cost numeric not null,
	tuid1 bigint not null,
	tuid2 bigint not null,
	bet1 bigint[] not null,
	bet2 bigint[] not null,
	bet_value1 int not null,
	bet_value2 int not null,
	treasure_field1 int not null, 
	treasure_field2 int not null,
	winner int not null,
	created_at timestamp(3) not null default (current_timestamp at time zone 'utc'),
	updated_at timestamp(3) not null default (current_timestamp at time zone 'utc')
);

create index if not exists games_tuid1_idx on ships.games (tuid1);
create index if not exists games_tuid2_idx on ships.games (tuid2);
create index if not exists games_created_at_idx on ships.games (created_at desc);

create table if not exists ships.refferals (
	tuid bigint primary key,
	percantage numeric not null,
	created_at timestamp(3) not null default (current_timestamp at time zone 'utc')
);

create index if not exists refferals_tuid_idx on ships.refferals (tuid);

create table if not exists ships.users_refferals (
	ruid bigint,
	tuid bigint,
	primary key (ruid, tuid)
);

create table if not exists ships.referral_payouts (
    payout_id serial primary key,
    ruid bigint not null,
    game_id int not null references ships.games(game_id) on delete cascade,
    tuid bigint not null,
    value numeric not null,
    is_payment bool not null default false,
    created_at timestamp(3) not null default (current_timestamp at time zone 'utc'),
    updated_at timestamp(3) not null default (current_timestamp at time zone 'utc')
);

create index if not exists referral_payouts_ruid_idx on ships.referral_payouts (ruid);

create or replace function ships.create_referral_payouts()
returns trigger as $$
begin
    -- вставка выплаты для первого игрока
    insert into ships.referral_payouts (ruid, game_id, tuid, value)
    select ur.ruid, new.game_id, new.tuid1, (new.cost * r.percantage / 100.0)
    from ships.users_refferals ur
    join ships.refferals r on r.tuid = ur.ruid
    where ur.tuid = new.tuid1;

    -- вставка выплаты для второго игрока
    insert into ships.referral_payouts (ruid, game_id, tuid, value)
    select ur.ruid, new.game_id, new.tuid2, (new.cost * r.percantage / 100.0)
    from ships.users_refferals ur
    join ships.refferals r on r.tuid = ur.ruid
    where ur.tuid = new.tuid2;

    return new;
end;
$$ language plpgsql;

create trigger trg_create_referral_payouts
after insert on ships.games
for each row
execute function ships.create_referral_payouts();

create table if not exists ships.gifts (
	gid bigint primary key,
	value numeric default 0,
	slug text not null,
	photo bytea not null default '\x'::bytea,
	in_treasury bool not null default True,
	created_at timestamp(3) not null default (current_timestamp at time zone 'utc'),
	updated_at timestamp(3) not null default (current_timestamp at time zone 'utc')
);

create table if not exists ships.wallet_lt_hash (
	id int primary key default 1,
	last_lt bigint not null default 0,
	last_hash text not null default '0000000000000000000000000000000000000000000000000000000000000000',
	middle_lt bigint,
	middle_hash text,
	new_lt bigint not null default 0,
	new_hash text not null default '0000000000000000000000000000000000000000000000000000000000000000',
	updated_at timestamp(3) not null default (current_timestamp at time zone 'utc')
);

insert into ships.wallet_lt_hash (id) values(1);