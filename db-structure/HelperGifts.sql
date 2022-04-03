create table HelperGifts
id varchar default '' not null
giftURL varchar default '' not null
dateCreated timestamp
userCreated varchar default '' not null
assignedToHelper varchar default '' not null
dateGranted timestamp
assignedByUser varchar default '' not null
wasConsumed boolean default false not null
wasClicked boolean default false not null