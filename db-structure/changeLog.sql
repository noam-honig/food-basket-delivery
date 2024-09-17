create table changeLog
id varchar default '' not null
relatedId varchar default '' not null
relatedName varchar default '' not null
entity varchar default '' not null
appUrl varchar default '' not null
apiUrl varchar default '' not null
changeDate timestamptz
userId varchar default '' not null
userName varchar default '' not null
changes varchar default '' not null
changedFields varchar default '' not null