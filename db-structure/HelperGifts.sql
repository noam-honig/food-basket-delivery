create table HelperGifts
id varchar default '' not null
giftURL varchar default '' not null
dateCreated timestamptz
userCreated varchar default '' not null
assignedToHelper varchar default '' not null
dateGranted timestamptz
assignedByUser varchar default '' not null
wasConsumed boolean default false not null
wasClicked boolean default false not null