create table noteful_notes (
  id integer primary key generated by default as identity,
  name text not null,
  modified timestamptz not null default now(),
  folderid integer references noteful_folders(id) on delete cascade not null,
  content text
);