create table Helpers
id varchar default '' not null
name varchar default '' not null
phone varchar default '' not null
smsDate timestamp
doNotSendSms boolean default false not null
company varchar default '' not null
totalKm integer default 0 not null
totalTime integer default 0 not null
shortUrlKey varchar default '' not null
distributionCenter varchar default '' not null
eventComment varchar default '' not null
needEscort boolean default false not null
theHelperIAmEscorting varchar default '' not null
escort varchar default '' not null
leadHelper varchar default '' not null
myGiftsURL varchar default '' not null
archive boolean default false not null
frozenTill date
internalComment varchar default '' not null
blockedFamilies json