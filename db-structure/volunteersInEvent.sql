create table volunteersInEvent
id varchar default '' not null
eventId varchar default '' not null
helper varchar default '' not null
confirmed boolean default false not null
canceled boolean default false not null
duplicateToNextEvent boolean default false not null
createDate timestamp
createUser varchar default '' not null
registerStatusDate timestamp
cancelUser varchar default '' not null
fromGeneralList boolean default false not null
a1 varchar default '' not null
a2 varchar default '' not null
a3 varchar default '' not null
a4 varchar default '' not null