collect statisics

drop table stats;
create table stats(name varchar (30), rows int);

--select 'insert into stats  select '''||tablename||''',count(*) from '||tablename||';' from pg_tables where schemaname='public';

insert into stats  select 'applicationimages',count(*) from applicationimages;
insert into stats  select 'applicationsettings',count(*) from applicationsettings;
insert into stats  select 'baskettype',count(*) from baskettype;
insert into stats  select 'families',count(*) from families;
insert into stats  select 'familydeliveries',count(*) from familydeliveries;
insert into stats  select 'familydeliveryevents',count(*) from familydeliveryevents;
insert into stats  select 'familysources',count(*) from familysources;
insert into stats  select 'groups',count(*) from groups;
insert into stats  select 'helperhistoryinfo',count(*) from helperhistoryinfo;
insert into stats  select 'helpers',count(*) from helpers;
select * from stats;