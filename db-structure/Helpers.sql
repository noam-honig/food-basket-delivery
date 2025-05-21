create table Helpers
id varchar default '' not null
name varchar default '' not null
smsDate timestamptz
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
maxDeliveries integer default 0 not null
phone varchar default '' not null
lastSignInDate timestamptz
password varchar default '' not null
socialSecurityNumber varchar default '' not null
email varchar default '' not null
addressApiResult varchar default '' not null
preferredDistributionAreaAddress varchar default '' not null
preferredDistributionAreaAddressCity varchar default '' not null
addressApiResult2 varchar default '' not null
preferredDistributionAreaAddress2 varchar default '' not null
preferredFinishAddressCity varchar default '' not null
password varchar default '' not null
createDate timestamptz
passwordChangeDate timestamptz
EULASignDate timestamptz
reminderSmsDate timestamptz
referredBy varchar default '' not null
isAdmin boolean default false not null
labAdmin boolean default false not null
isIndependent boolean default false not null
distCenterAdmin boolean default false not null
familyAdmin boolean default false not null
caller boolean default false not null
includeGroups varchar default '' not null
excludeGroups varchar default '' not null
callQuota integer default 0 not null
allowedArchiveDeliveries boolean default false not null
allowedReceiveNotifications boolean default false not null
deviceTokenNotifications varchar default '' not null
availableVolunteering boolean default false not null
dateUpdateAvailability date
lastSendMessage timestamptz