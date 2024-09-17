create table HelperCommunicationHistory
id varchar default '' not null
createDate timestamptz
createUser varchar default '' not null
volunteer varchar default '' not null
family varchar default '' not null
origin varchar default '' not null
eventId varchar default '' not null
message varchar default '' not null
apiResponse varchar default '' not null
phone varchar default '' not null
incoming boolean default false not null
automaticAction varchar default '' not null
handled boolean default false not null