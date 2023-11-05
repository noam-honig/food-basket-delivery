create table FamilyDeliveries
id varchar default '' not null
family varchar default '' not null
basketType varchar default '' not null
quantity integer default 0 not null
items varchar default '' not null
distributionCenter varchar default '' not null
deliverStatus integer default 0 not null
courier varchar default '' not null
courierComments varchar default '' not null
courierCommentsDate timestamp
internalDeliveryComment varchar default '' not null
routeOrder integer default 0 not null
special integer default 0 not null
deliveryStatusDate timestamp
courierAssignUser varchar default '' not null
courierAssingTime timestamp
deliveryStatusUser varchar default '' not null
createDate timestamp
createUser varchar default '' not null
needsWork boolean default false not null
needsWorkUser varchar default '' not null
needsWorkDate timestamp
deliveryComments varchar default '' not null
receptionComments varchar default '' not null
familySource varchar default '' not null
groups varchar default '' not null
address varchar default '' not null
floor varchar default '' not null
appartment varchar default '' not null
entrance varchar default '' not null
buildingCode varchar default '' not null
city varchar default '' not null
area varchar default '' not null
addressComment varchar default '' not null
addressLongitude numeric default 0 not null
addressLatitude numeric default 0 not null
drivingLongitude numeric default 0 not null
drivingLatitude numeric default 0 not null
addressByGoogle varchar default '' not null
addressOk boolean default false not null
fixedCourier varchar default '' not null
familyMembers integer default 0 not null
phone varchar default '' not null
phone1Description varchar default '' not null
phone2 varchar default '' not null
phone2Description varchar default '' not null
phone3 varchar default '' not null
phone3Description varchar default '' not null
phone4 varchar default '' not null
phone4Description varchar default '' not null
archive boolean default false not null
archiveDate timestamp
onTheWayDate timestamp
archiveUser varchar default '' not null
a1 varchar default '' not null
a2 varchar default '' not null
a3 varchar default '' not null
a4 varchar default '' not null
caller varchar default '' not null
callerComment varchar default '' not null
lastCallDate timestamp
callerAssignDate timestamp
callCount numeric default 0 not null
deliveryType varchar default '' not null
pickupVolunteer varchar default '' not null
addressApiResult_2 varchar default '' not null
address_2 varchar default '' not null
floor_2 varchar default '' not null
appartment_2 varchar default '' not null
entrance_2 varchar default '' not null
addressComment_2 varchar default '' not null
phone1_2 varchar default '' not null
phone1Description_2 varchar default '' not null
phone2_2 varchar default '' not null
phone2Description_2 varchar default '' not null