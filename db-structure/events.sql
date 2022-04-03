create table events
id varchar default '' not null
registeredToEvent boolean default false not null
name varchar default '' not null
type varchar default '' not null
eventStatus integer default 0 not null
description varchar default '' not null
eventDate date
startTime varchar default '' not null
endTime varchar default '' not null
requiredVolunteers integer default 0 not null
addressApiResult varchar default '' not null
address varchar default '' not null
distributionCenter varchar default '' not null
phone1 varchar default '' not null
phone1Description varchar default '' not null