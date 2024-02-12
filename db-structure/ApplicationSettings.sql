create table ApplicationSettings
bulkSmsEnabled boolean default false not null
id integer default 0 not null
organisationName varchar default '' not null
smsText varchar default '' not null
reminderSmsText varchar default '' not null
confirmEventParticipationMessage varchar default '' not null
registerFamilyReplyEmailText varchar default '' not null
registerHelperReplyEmailText varchar default '' not null
gmailUserName varchar default '' not null
gmailPassword varchar default '' not null
logoUrl varchar default '' not null
addressApiResult varchar default '' not null
address varchar default '' not null
commentForSuccessDelivery varchar default '' not null
commentForSuccessLeft varchar default '' not null
commentForProblem varchar default '' not null
messageForDoneDelivery varchar default '' not null
helpText varchar default '' not null
helpPhone varchar default '' not null
phoneStrategy varchar default '' not null
commonQuestions varchar default '' not null
dataStructureVersion integer default 0 not null
deliveredButtonText varchar default '' not null
problemButtonText varchar default '' not null
AddressProblemStatusText varchar default '' not null
NotHomeProblemStatusText varchar default '' not null
DoNotWantProblemStatusText varchar default '' not null
OtherProblemStatusText varchar default '' not null
descriptionInOrganizationList varchar default '' not null
phoneInOrganizationList varchar default '' not null
volunteerNeedStatus varchar default '' not null
message1Text varchar default '' not null
message1Link varchar default '' not null
message1OnlyWhenDone boolean default false not null
message2Text varchar default '' not null
message2Link varchar default '' not null
message2OnlyWhenDone boolean default false not null
hideVolunteerVideo boolean default false not null
forWho integer default 0 not null
forSoldiers boolean default false not null
usingSelfPickupModule boolean default false not null
usingCallModule boolean default false not null
callModuleMessageText varchar default '' not null
callModuleMessageLink varchar default '' not null
defaultDeliveryStatusIsEnquireDetails boolean default false not null
showCompanies boolean default false not null
manageEscorts boolean default false not null
showHelperComment boolean default false not null
showGroupsOnAssing boolean default false not null
showCityOnAssing boolean default false not null
showAreaOnAssing boolean default false not null
showBasketOnAssing boolean default false not null
showNumOfBoxesOnAssing boolean default false not null
showLeftThereButton boolean default false not null
redTitleBar boolean default false not null
defaultPrefixForExcelImport varchar default '' not null
checkIfFamilyExistsInDb boolean default false not null
removedFromListStrategy integer default 0 not null
checkIfFamilyExistsInFile boolean default false not null
excelImportAutoAddValues boolean default false not null
excelImportUpdateFamilyDefaultsBasedOnCurrentDelivery boolean default false not null
checkDuplicatePhones boolean default false not null
volunteerCanUpdateComment boolean default false not null
volunteerCanUpdateDeliveryComment boolean default false not null
hideFamilyPhoneFromVolunteer boolean default false not null
usePhoneProxy boolean default false not null
showOnlyLastNamePartToVolunteer boolean default false not null
showTzToVolunteer boolean default false not null
allowSendSuccessMessageOption boolean default false not null
sendSuccessMessageToFamily boolean default false not null
successMessageText varchar default '' not null
requireEULA boolean default false not null
requireConfidentialityApprove boolean default false not null
requireComplexPassword boolean default false not null
timeToDisconnect integer default 0 not null
daysToForcePasswordChange integer default 0 not null
showDeliverySummaryToVolunteerOnFirstSignIn boolean default false not null
showDistCenterAsEndAddressForVolunteer boolean default false not null
routeStrategy integer default 0 not null
BusyHelperAllowedFreq_nom integer default 0 not null
BusyHelperAllowedFreq_denom integer default 0 not null
MaxItemsQuantityInDeliveryThatAnIndependentVolunteerCanSee integer default 0 not null
MaxDeliverisQuantityThatAnIndependentVolunteerCanAssignHimself integer default 0 not null
donotShowEventsInGeneralList boolean default false not null
emailForVolunteerRegistrationNotification varchar default '' not null
defaultStatusType integer default 0 not null
boxes1Name varchar default '' not null
boxes2Name varchar default '' not null
familyCustom1Caption varchar default '' not null
familyCustom1Values varchar default '' not null
familyCustom2Caption varchar default '' not null
familyCustom2Values varchar default '' not null
familyCustom3Caption varchar default '' not null
familyCustom3Values varchar default '' not null
familyCustom4Caption varchar default '' not null
familyCustom4Values varchar default '' not null
currentUserIsValidForAppLoadTest boolean default false not null
questionForVolunteer1Caption varchar default '' not null
questionForVolunteer1Values varchar default '' not null
questionForVolunteer2Caption varchar default '' not null
questionForVolunteer2Values varchar default '' not null
questionForVolunteer3Caption varchar default '' not null
questionForVolunteer3Values varchar default '' not null
questionForVolunteer4Caption varchar default '' not null
questionForVolunteer4Values varchar default '' not null
questionForRegistration1Caption varchar default '' not null
questionForRegistration1Values varchar default '' not null
questionForRegistration2Caption varchar default '' not null
questionForRegistration2Values varchar default '' not null
questionForRegistration3Caption varchar default '' not null
questionForRegistration3Values varchar default '' not null
questionForRegistration4Caption varchar default '' not null
questionForRegistration4Values varchar default '' not null
registerAskTz boolean default false not null
registerRequireTz boolean default false not null
registerAskEmail boolean default false not null
registerAskPreferredDistributionAreaAddress boolean default false not null
registerAskPreferredFinishAddress boolean default false not null
askVolunteerForLocationOnDelivery boolean default false not null
askVolunteerForAPhotoToHelp boolean default false not null
questionForVolunteerWhenUploadingPhoto varchar default '' not null
createBasketsForAllFamiliesInCreateEvent boolean default false not null
includeGroupsInCreateEvent varchar default '' not null
excludeGroupsInCreateEvent varchar default '' not null
smsCredentials varchar
smsClientNumber varchar default '' not null
smsUsername varchar default '' not null
smsPasswordInput varchar default '' not null
smsVirtualPhoneNumber varchar default '' not null
familySelfOrderEnabled boolean default false not null
familySelfOrderMessage varchar default '' not null
familyConfirmDetailsEnabled boolean default false not null
inviteVolunteersMessage varchar default '' not null
allowVolunteerToSeePreviousActivities boolean default false not null
customSmsOriginForSmsToVolunteer varchar default '' not null
allowSmsToFamily boolean default false not null
sendOnTheWaySMSToFamily boolean default false not null
sendOnTheWaySMSToFamilyOnSendSmsToVolunteer boolean default false not null
customSmsOriginForSmsToFamily varchar default '' not null
enableOtp boolean default false not null
webhookUrl varchar default '' not null