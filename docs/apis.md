## Rest Data Apis
These apis are used to query and update data on the server using Rest API, supporting get, put, post and delete based on restrictions

* /{schema}/api/Families
* /{schema}/api/FamilyDeliveries
* /{schema}/api/Helpers
* /{schema}/api/ApplicationSettings
* /{schema}/api/ApplicationImages
* /{schema}/api/BasketType
* /{schema}/api/FamilySources
* /{schema}/api/groups
* /{schema}/api/DistributionCenters
* /{schema}/api/Sites
* /{schema}/api/GeocodeCache
* /{schema}/api/GroupsStatsPerDistributionCenter
* /{schema}/api/GroupsStatsForAllDeliveryCenters
* /{schema}/api/citiesStats

For a detailed break down see [model.md](model.md)


## Server functions, Apis used to perform a specific task

### User management related
* /{schema}/api/login
* /{schema}/api/loginFromSms
* /{schema}/api/resetPassword
* /{schema}/api/sendInvite
* /{schema}/api/clearCommentsOnServer
* /{schema}/api/clearEscortsOnServer

### Families and Deliveries maintenance
* /{schema}/api/addDelivery
* /{schema}/api/checkDuplicateFamilies
* /{schema}/api/familiesInSameAddress
* /{schema}/api/DeliveriesActionOnServer
* /{schema}/api/getHelpersByLocation
* /{schema}/api/GetDeliveriesLocation
* /{schema}/api/FamilyActionOnServer
* /{schema}/api/mergeFamilies
* /{schema}/api/deleteFamiliesOnServer
* /{schema}/api/geocodeOnServer

### Assign Volunteer
* /{schema}/api/AddBox
* /{schema}/api/getBasketStatus
* /{schema}/api/cancelAssignAllForHelperOnServer
* /{schema}/api/okAllForHelperOnServer
* /{schema}/api/RefreshRoute
* /{schema}/api/SendCustomMessageToCourier
* /{schema}/api/helpersStatus

### Excel import 
* /{schema}/api/checkExcelInput
* /{schema}/api/updateColsOnServer
* /{schema}/api/insertRows
* /{schema}/api/checkExcelInputHelpers
* /{schema}/api/insertHelperRows
* /{schema}/api/updateHelperColsOnServer

### Stats
* /{schema}/api/getFamilyStats
* /{schema}/api/getFamilyDeliveryStatsFromServer
* /{schema}/api/GetTimeline
* /{schema}/api/getOverview
* /{schema}/api/GetLocationsForOverview
* /{schema}/api/getHelperHistoryInfo

### Http server events related
* /{schema}/api/stream
* /{schema}/api/DoAthorize
* /{schema}/api/getCompanies
* /{schema}/api/getPhoneOptions
* /{schema}/api/SendSms

### Schema Management
* /{schema}/api/createSchema
* /{schema}/api/validateNewSchema
