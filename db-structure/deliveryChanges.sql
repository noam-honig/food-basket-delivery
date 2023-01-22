create table deliveryChanges
id varchar default '' not null
deliveryId varchar default '' not null
deliveryName varchar default '' not null
familyId varchar default '' not null
appUrl varchar default '' not null
apiUrl varchar default '' not null
changeDate timestamp
userId varchar default '' not null
userName varchar default '' not null
courier varchar default '' not null
previousCourier varchar default '' not null
status integer default 0 not null
previousDeliveryStatus integer default 0 not null
deleted boolean default false not null