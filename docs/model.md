## Data Model
 Here's a detailed list of all the entities used in the rest api

## Families
| name | caption | type | extra info |
| --- | --- | --- | --- |
| id | id של המשפחה באפליקצית חגי | Id |  readonly |
| name | שם | String |  |
| tz | מספר זהות | String |  |
| tz2 | מספר זהות בן/בת הזוג | String |  |
| familyMembers | מספר נפשות | Number |  |
| birthDate | תאריך לידה | Date |  |
| nextBirthday | יומולדת הבא | Date |  readonly |
| basketType | סוג סל ברירת מחדל | BasketId |  |
| quantity | כמות ברירת מחדל | Quantity |  |
| familySource | גורם מפנה | FamilySourceId |  |
| socialWorker | איש קשר לבירור פרטים (עו"ס) | String |  |
| socialWorkerPhone1 | עו"ס טלפון 1 | Phone |  |
| socialWorkerPhone2 | עו"ס טלפון 2 | Phone |  |
| groups | קבוצות שיוך משפחה | Groups |  |
| special | שיוך מיוחד | YesNo |  |
| defaultSelfPickup | באים לקחת ברירת מחדל | Bool |  |
| iDinExcel | מזהה חד ערכי למשפחה | String |  |
| internalComment | הערה פנימית - לא תופיע למתנדב | String |  |
| address | כתובת | String |  |
| floor | קומה | String |  |
| appartment | דירה | String |  |
| entrance | כניסה | String |  |
| city | עיר (מתעדכן אוטומטית) | String |  |
| area | אזור | String |  |
| addressComment | הנחיות נוספות לכתובת | String |  |
| postalCode | מיקוד | Number |  |
| deliveryComments | הערה ברירת מחדל למתנדב | String |  |
| addressApiResult | Address Api Result | String |  |
| phone1 | טלפון 1 | Phone |  |
| phone1Description | הערות לטלפון 1 | String |  |
| phone2 | טלפון 2 | Phone |  |
| phone2Description | הערות לטלפון 2 | String |  |
| phone3 | טלפון 3 | Phone |  |
| phone3Description | הערות לטלפון 3 | String |  |
| phone4 | טלפון 4 | Phone |  |
| phone4Description | הערות לטלפון 4 | String |  |
| email | eMail | Email |  |
| status | סטטוס | FamilyStatus |  |
| statusDate | סטטוס: תאריך שינוי | changeDate |  readonly |
| statusUser | סטטוס: מי עדכן | HelperIdReadonly |  readonly |
| fixedCourier | מתנדב ברירת מחדל | HelperId |  |
| previousDeliveryStatus | סטטוס משלוח קודם | DeliveryStatus |  |
| previousDeliveryDate | תאריך משלוח קודם | changeDate |  readonly |
| previousDeliveryComment | הערת משלוח קודם | String |  |
| numOfActiveReadyDeliveries | מספר משלוחים פעילים שטרם נמסרו | Number |  |
| addressLongitude | Address Longitude | Number |  |
| addressLatitude | Address Latitude | Number |  |
| drivingLongitude | Driving Longitude | Number |  |
| drivingLatitude | Driving Latitude | Number |  |
| addressByGoogle | כתובת כפי שגוגל הבין | String |  readonly |
| addressOk | כתובת תקינה | Bool |  |
| createDate | מועד הוספה | changeDate |  readonly |
| createUser | משתמש מוסיף | HelperIdReadonly |  readonly |
| lastUpdateDate | מועד עדכון אחרון | changeDate |  readonly |
| lastUpdateUser | משתמש מעדכן | HelperIdReadonly |  readonly |


## FamilyDeliveries
| name | caption | type | extra info |
| --- | --- | --- | --- |
| id | Id | Id |  readonly |
| family | id של המשפחה באפליקצית חגי | FamilyId |  readonly |
| name | שם | String |  readonly |
| basketType | סוג סל | BasketId |  |
| quantity | כמות | Quantity |  |
| distributionCenter | רשימת חלוקה | DistributionCenterId |  |
| deliverStatus | סטטוס משלוח | DeliveryStatus |  |
| courier | מתנדב | HelperId |  |
| courierComments | הערות שכתב המתנדב כשמסר | String |  |
| internalDeliveryComment | הערה פנימית למשלוח - לא תוצג למתנדב | String |  |
| routeOrder | Route Order | Number |  |
| special | שיוך מיוחד | YesNo |  |
| deliveryStatusDate | מתי | changeDate |  readonly |
| courierAssignUser | מי שייכה למתנדב | HelperIdReadonly |  readonly |
| courierAssingTime | מועד שיוך למתנדב | changeDate |  readonly |
| deliveryStatusUser | סטטוס: מי עדכן | HelperIdReadonly |  readonly |
| createDate | מועד הקצאה | changeDate |  readonly |
| createUser | משתמש מקצה | HelperIdReadonly |  readonly |
| needsWork | צריך טיפול/מעקב | Bool |  |
| needsWorkUser | צריך טיפול - מי עדכן | HelperIdReadonly |  readonly |
| needsWorkDate | צריך טיפול - מתי עודכן | changeDate |  readonly |
| deliveryComments | הערה שתופיע למתנדב | String |  |
| familySource | גורם מפנה | FamilySourceId |  readonly |
| groups | קבוצות שיוך משפחה | Groups |  readonly |
| address | כתובת | String |  readonly |
| floor | קומה | String |  readonly |
| appartment | דירה | String |  readonly |
| entrance | כניסה | String |  readonly |
| city | עיר (מתעדכן אוטומטית) | String |  readonly |
| area | אזור | String |  readonly |
| addressComment | הנחיות נוספות לכתובת | String |  readonly |
| addressLongitude | Address Longitude | Number |  readonly |
| addressLatitude | Address Latitude | Number |  readonly |
| drivingLongitude | Driving Longitude | Number |  readonly |
| drivingLatitude | Driving Latitude | Number |  readonly |
| addressByGoogle | כתובת כפי שגוגל הבין | String |  readonly |
| addressOk | כתובת תקינה | Bool |  readonly |
| fixedCourier | מתנדב ברירת מחדל | HelperId |  readonly |
| familyMembers | מספר נפשות | Number |  readonly |
| phone1 | טלפון 1 | Phone |  readonly |
| phone1Description | הערות לטלפון 1 | String |  readonly |
| phone2 | טלפון 2 | Phone |  readonly |
| phone2Description | הערות לטלפון 2 | String |  readonly |
| phone3 | טלפון 3 | Phone |  readonly |
| phone3Description | הערות לטלפון 3 | String |  readonly |
| phone4 | טלפון 4 | Phone |  readonly |
| phone4Description | הערות לטלפון 4 | String |  readonly |
| courierBeenHereBefore | Courier Been Here Before | Bool |  |
| archive | Archive | Bool |  |
| visibleToCourier | Visible To Courier | Bool |  |
| messageStatus | סטטוס הודעה | MessageStatus |  |


## Helpers
| name | caption | type | extra info |
| --- | --- | --- | --- |
| id | Id | Id |  readonly |
| name | שם | String |  |
| phone | טלפון | Phone |  |
| smsDate | מועד משלוח SMS | DateTime |  |
| company | חברה | Company |  |
| totalKm | Total Km | Number |  |
| totalTime | Total Time | Number |  |
| shortUrlKey | Short Url Key | String |  |
| distributionCenter | רשימת חלוקה | DistributionCenterId |  |
| eventComment | הערה | String |  |
| needEscort | צריך מלווה | Bool |  |
| theHelperIAmEscorting | נהג משוייך | HelperIdReadonly |  readonly |
| escort | מלווה | HelperId |  |
| allowedIds | Allowed Ids | String |  |
| lastSignInDate | Last Sign In Date | changeDate |  readonly |
| realStoredPassword | Real Stored Password | String |  |
| email | eMail | Email |  |
| preferredDistributionAreaAddress | כתובת אזור חלוקה מועדף | String |  |
| addressApiResult | Address Api Result | String |  |
| password | סיסמה | String |  |
| createDate | מועד הוספה | changeDate |  readonly |
| reminderSmsDate | מועד משלוח תזכורת SMS | DateTime |  |
| admin | מנהל כלל המערכת | Bool |  |
| distCenterAdmin | משייך מתנדבים לרשימת חלוקה | Bool |  |


## events
| name | caption | type | extra info |
| --- | --- | --- | --- |
| id | Id | Id |  readonly |
| name | שם ארוע | String |  |
| eventStatus | סטטוס | eventStatus |  |
| description | תאור | String |  |
| eventDate | תאריך | Date |  |
| startTime | שעה | String |  |
| endTime | עד שעה | String |  |
| requiredVolunteers | מספר מתנדבים נדרש | Number |  |
| registeredVolunteers | מספר מתנדבים שנרשמו | Number |  |


## volunteersInEvent
| name | caption | type | extra info |
| --- | --- | --- | --- |
| id | Id | Id |  readonly |
| eventId | Event Id | Id |  |
| helper | Helper | HelperId |  |
| helperName | שם | String |  |
| helperPhone | מספר הטלפון של המתנדב | Phone |  |
| assignedDeliveries | משלוחים שוייכו  | Number |  |


## ApplicationSettings
| name | caption | type | extra info |
| --- | --- | --- | --- |
| id | Id | Number |  |
| organisationName | שם הארגון | String |  |
| smsText | תוכן הודעת SMS | String |  |
| reminderSmsText | תוכן הודעת תזכורת SMS | String |  |
| logoUrl | לוגו URL | String |  |
| address | כתובת מרכז השילוח | String |  |
| commentForSuccessDelivery | הודעה למתנדב כאשר נמסר בהצלחה | String |  |
| commentForSuccessLeft | הודעה למתנדב כאשר הושאר ליד הבית | String |  |
| commentForProblem | הודעה למתנדב כאשר יש בעיה | String |  |
| messageForDoneDelivery | הודעה למתנדב כאשר סיים את כל המשפחות | String |  |
| helpText | שם חלופי | String |  |
| helpPhone | טלפון חלופי | Phone |  |
| phoneStrategy | Phone Strategy | String |  |
| commonQuestions | Common Questions | String |  |
| dataStructureVersion | Data Structure Version | Number |  readonly |
| deliveredButtonText | מלל כפתור נמסר בהצלחה | String |  |
| message1Text | מלל חופשי 1 למתנדב | String |  |
| message1Link | כתובת אינטרנט ללחיצה על מלל חופשי 1 למתנדב | String |  |
| message1OnlyWhenDone | להציג מלל חופשי 1 רק כאשר המתנדב סיים אל כל הסלים | Bool |  |
| message2Text | מלל חופשי 2 למתנדב | String |  |
| message2Link | כתובת אינטרנט ללחיצה על מלל חופשי 2 למתנדב | String |  |
| message2OnlyWhenDone | להציג מלל חופשי 2 רק כאשר המתנדב סיים אל כל הסלים | Bool |  |
| forWho | המערכת היא עבור | TranslationOptions |  |
| _old_for_soliders | _old_for_soliders | Bool |  |
| usingSelfPickupModule | ישנן משפחות שבאות לקחת ממרכז החלוקה | Bool |  |
| showCompanies | שמור מטעם איזה חברה הגיע המתנדב | Bool |  |
| manageEscorts | הפעל ניהול מלווים לנהגים | Bool |  |
| showHelperComment | הצג הערה בשיוך למתנדב | Bool |  |
| showGroupsOnAssing | סינון קבוצת משפחה | Bool |  |
| showCityOnAssing | סינון עיר | Bool |  |
| showAreaOnAssing | סינון אזור | Bool |  |
| showBasketOnAssing | סינון סוג סל | Bool |  |
| showNumOfBoxesOnAssing | בחירת מספר משפחות | Bool |  |
| showLeftThereButton | הצג למתנדב כפתור השארתי ליד הבית | Bool |  |
| redTitleBar | כותרת דף בצבע אדום | Bool |  |
| defaultPrefixForExcelImport | קידומת טלפון ברירת מחדל בקליטה מאקסל | String |  |
| checkIfFamilyExistsInDb | בדוק אם משפחה כבר קיימת במאגר הנתונים | Bool |  |
| removedFromListStrategy | מה לעשות אם נמצאה משפחה תואמת המסומנת כהוצא מהרשימות | RemovedFromListExcelImportStrategy |  |
| checkIfFamilyExistsInFile | בדוק אם משפחה כבר קיימת בקובץ האקסל | Bool |  |
| excelImportAutoAddValues | הוסף בלי לשאול ערכים לטבלאות התשתית | Bool |  |
| excelImportUpdateFamilyDefaultsBasedOnCurrentDelivery | עדכן ברירות מחדל למשפחה בהתאם למשלוח זה | Bool |  |
| checkDuplicatePhones | בדוק טלפונים כפולים | Bool |  |
| volunteerCanUpdateComment | מתנדב יכול לעדכן לעצמו הערה | Bool |  |
| showDistCenterAsEndAddressForVolunteer | הצג כתובות רשימת חלוקה כנקודת סיום למתנדב | Bool |  |
| routeStrategy | תכנון מסלול | routeStrategy |  |
| addressApiResult | Address Api Result | String |  |
| defaultStatusType | סטטוס משלוח ברירת מחדל למשפחות חדשות | DeliveryStatus |  |
| boxes1Name | שם כמות 1 בסוגי סלים | String |  |
| boxes2Name | שם כמות 2 בסוגי סלים | String |  |


## DistributionCenters
| name | caption | type | extra info |
| --- | --- | --- | --- |
| id | Id | Id |  readonly |
| name | שם | String |  |
| semel | סמל | String |  |
| address | כתובת מרכז השילוח | String |  |
| addressApiResult | Address Api Result | String |  |
| comments | הערה | String |  |
| phone1 | טלפון 1 | Phone |  |
| phone1Description | הערות לטלפון 1 | String |  |
| phone2 | טלפון 2 | Phone |  |
| phone2Description | הערות לטלפון 2 | String |  |


## Sites
| name | caption | type | extra info |
| --- | --- | --- | --- |
| id | מזהה הסביבה | SchemaId |  |
| createDate | מועד הוספה | changeDate |  readonly |
| createUser | משתמש מוסיף | HelperIdReadonly |  readonly |


## GeocodeCache
| name | caption | type | extra info |
| --- | --- | --- | --- |
| id | Id | String |  |
| googleApiResult | Google Api Result | String |  |
| createDate | Create Date | DateTime |  |


## FamilySources
| name | caption | type | extra info |
| --- | --- | --- | --- |
| id | Id | Id |  readonly |
| name | שם | String |  |
| contactPerson | איש קשר | String |  |
| phone | טלפון | Phone |  |


## BasketType
| name | caption | type | extra info |
| --- | --- | --- | --- |
| id | Id | Id |  readonly |
| name | שם | String |  |
| boxes | מנות | Number |  |
| boxes2 | משהו אחר | Number |  |


## ApplicationImages
| name | caption | type | extra info |
| --- | --- | --- | --- |
| id | Id | Number |  |
| base64Icon | איקון דף base64 | String |  |
| base64PhoneHomeImage | איקון דף הבית בטלפון base64 | String |  |


## groups
| name | caption | type | extra info |
| --- | --- | --- | --- |
| id | Id | Id |  readonly |
| name | קבוצה | String |  |


## GroupsStatsPerDistributionCenter
| name | caption | type | extra info |
| --- | --- | --- | --- |
| name | Name | String |  |
| distCenter | רשימת חלוקה | DistributionCenterId |  |
| familiesCount | Families Count | Number |  |


## GroupsStatsForAllDeliveryCenters
| name | caption | type | extra info |
| --- | --- | --- | --- |
| name | Name | String |  |
| familiesCount | Families Count | Number |  |


## citiesStats
| name | caption | type | extra info |
| --- | --- | --- | --- |
| city | City | String |  |
| deliveries | Deliveries | Number |  |


## citiesStats
| name | caption | type | extra info |
| --- | --- | --- | --- |
| city | City | String |  |
| distributionCenter | רשימת חלוקה | DistributionCenterId |  |
| families | Families | Number |  |


## ActiveFamilyDeliveries
| name | caption | type | extra info |
| --- | --- | --- | --- |
| id | Id | Id |  readonly |
| family | id של המשפחה באפליקצית חגי | FamilyId |  readonly |
| name | שם | String |  readonly |
| basketType | סוג סל | BasketId |  |
| quantity | כמות | Quantity |  |
| distributionCenter | רשימת חלוקה | DistributionCenterId |  |
| deliverStatus | סטטוס משלוח | DeliveryStatus |  |
| courier | מתנדב | HelperId |  |
| courierComments | הערות שכתב המתנדב כשמסר | String |  |
| internalDeliveryComment | הערה פנימית למשלוח - לא תוצג למתנדב | String |  |
| routeOrder | Route Order | Number |  |
| special | שיוך מיוחד | YesNo |  |
| deliveryStatusDate | מתי | changeDate |  readonly |
| courierAssignUser | מי שייכה למתנדב | HelperIdReadonly |  readonly |
| courierAssingTime | מועד שיוך למתנדב | changeDate |  readonly |
| deliveryStatusUser | סטטוס: מי עדכן | HelperIdReadonly |  readonly |
| createDate | מועד הקצאה | changeDate |  readonly |
| createUser | משתמש מקצה | HelperIdReadonly |  readonly |
| needsWork | צריך טיפול/מעקב | Bool |  |
| needsWorkUser | צריך טיפול - מי עדכן | HelperIdReadonly |  readonly |
| needsWorkDate | צריך טיפול - מתי עודכן | changeDate |  readonly |
| deliveryComments | הערה שתופיע למתנדב | String |  |
| familySource | גורם מפנה | FamilySourceId |  readonly |
| groups | קבוצות שיוך משפחה | Groups |  readonly |
| address | כתובת | String |  readonly |
| floor | קומה | String |  readonly |
| appartment | דירה | String |  readonly |
| entrance | כניסה | String |  readonly |
| city | עיר (מתעדכן אוטומטית) | String |  readonly |
| area | אזור | String |  readonly |
| addressComment | הנחיות נוספות לכתובת | String |  readonly |
| addressLongitude | Address Longitude | Number |  readonly |
| addressLatitude | Address Latitude | Number |  readonly |
| drivingLongitude | Driving Longitude | Number |  readonly |
| drivingLatitude | Driving Latitude | Number |  readonly |
| addressByGoogle | כתובת כפי שגוגל הבין | String |  readonly |
| addressOk | כתובת תקינה | Bool |  readonly |
| fixedCourier | מתנדב ברירת מחדל | HelperId |  readonly |
| familyMembers | מספר נפשות | Number |  readonly |
| phone1 | טלפון 1 | Phone |  readonly |
| phone1Description | הערות לטלפון 1 | String |  readonly |
| phone2 | טלפון 2 | Phone |  readonly |
| phone2Description | הערות לטלפון 2 | String |  readonly |
| phone3 | טלפון 3 | Phone |  readonly |
| phone3Description | הערות לטלפון 3 | String |  readonly |
| phone4 | טלפון 4 | Phone |  readonly |
| phone4Description | הערות לטלפון 4 | String |  readonly |
| courierBeenHereBefore | Courier Been Here Before | Bool |  |
| archive | Archive | Bool |  |
| visibleToCourier | Visible To Courier | Bool |  |
| messageStatus | סטטוס הודעה | MessageStatus |  |


## helpersAndStats
| name | caption | type | extra info |
| --- | --- | --- | --- |
| id | Id | Id |  readonly |
| name | שם | String |  |
| phone | טלפון | Phone |  |
| smsDate | מועד משלוח SMS | DateTime |  |
| company | חברה | Company |  |
| totalKm | Total Km | Number |  |
| totalTime | Total Time | Number |  |
| shortUrlKey | Short Url Key | String |  |
| distributionCenter | רשימת חלוקה | DistributionCenterId |  |
| eventComment | הערה | String |  |
| needEscort | צריך מלווה | Bool |  |
| theHelperIAmEscorting | נהג משוייך | HelperIdReadonly |  readonly |
| escort | מלווה | HelperId |  |
| deliveriesInProgress | משפחות מחכות | Number |  |
| allDeliveires | משפחות | Number |  |


## helperHistoryInfo
| name | caption | type | extra info |
| --- | --- | --- | --- |
| courier | Courier | String |  |
| name | שם | String |  |
| phone | טלפון | Phone |  |
| company | חברה | Company |  |
| deliveries | משלוחים | Number |  |
| families | משפחות | Number |  |
| dates | תאריכים | Number |  |
