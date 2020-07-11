## Data Model
 Here's a detailed list of all the entities used in the rest api

## Families
| name | caption | extra info |
| --- | --- | --- |
| id | id של המשפחה באפליקצית חגי |  - readonly |
| name | שם |  |
| tz | מספר זהות |  |
| tz2 | מספר זהות בן/בת הזוג |  |
| familyMembers | מספר נפשות |  |
| birthDate | תאריך לידה |  |
| nextBirthday | יומולדת הבא |  - readonly |
| basketType | סוג סל ברירת מחדל |  |
| quantity | כמות ברירת מחדל |  |
| familySource | גורם מפנה |  |
| socialWorker | איש קשר לבירור פרטים (עו"ס) |  |
| socialWorkerPhone1 | עו"ס טלפון 1 |  |
| socialWorkerPhone2 | עו"ס טלפון 2 |  |
| groups | קבוצות שיוך משפחה |  |
| special | שיוך מיוחד |  |
| defaultSelfPickup | באים לקחת ברירת מחדל |  |
| iDinExcel | מזהה חד ערכי למשפחה |  |
| internalComment | הערה פנימית - לא תופיע למתנדב |  |
| address | כתובת |  |
| floor | קומה |  |
| appartment | דירה |  |
| entrance | כניסה |  |
| city | עיר (מתעדכן אוטומטית) |  |
| area | אזור |  |
| addressComment | הנחיות נוספות לכתובת |  |
| postalCode | מיקוד |  |
| deliveryComments | הערה ברירת מחדל למתנדב |  |
| addressApiResult | Address Api Result |  |
| phone1 | טלפון 1 |  |
| phone1Description | הערות לטלפון 1 |  |
| phone2 | טלפון 2 |  |
| phone2Description | הערות לטלפון 2 |  |
| phone3 | טלפון 3 |  |
| phone3Description | הערות לטלפון 3 |  |
| phone4 | טלפון 4 |  |
| phone4Description | הערות לטלפון 4 |  |
| email | eMail |  |
| status | סטטוס |  |
| statusDate | סטטוס: תאריך שינוי |  - readonly |
| statusUser | סטטוס: מי עדכן |  - readonly |
| fixedCourier | מתנדב ברירת מחדל |  |
| previousDeliveryStatus | סטטוס משלוח קודם |  |
| previousDeliveryDate | תאריך משלוח קודם |  - readonly |
| previousDeliveryComment | הערת משלוח קודם |  |
| numOfActiveReadyDeliveries | מספר משלוחים פעילים שטרם נמסרו |  |
| addressLongitude | Address Longitude |  |
| addressLatitude | Address Latitude |  |
| drivingLongitude | Driving Longitude |  |
| drivingLatitude | Driving Latitude |  |
| addressByGoogle | כתובת כפי שגוגל הבין |  - readonly |
| addressOk | כתובת תקינה |  |
| createDate | מועד הוספה |  - readonly |
| createUser | משתמש מוסיף |  - readonly |
| lastUpdateDate | מועד עדכון אחרון |  - readonly |
| lastUpdateUser | משתמש מעדכן |  - readonly |


## FamilyDeliveries
| name | caption | extra info |
| --- | --- | --- |
| id | Id |  - readonly |
| family | id של המשפחה באפליקצית חגי |  - readonly |
| name | שם |  - readonly |
| basketType | סוג סל |  |
| quantity | כמות |  |
| distributionCenter | רשימת חלוקה |  |
| deliverStatus | סטטוס משלוח |  |
| courier | מתנדב |  |
| courierComments | הערות שכתב המתנדב כשמסר |  |
| internalDeliveryComment | הערה פנימית למשלוח - לא תוצג למתנדב |  |
| routeOrder | Route Order |  |
| special | שיוך מיוחד |  |
| deliveryStatusDate | מתי |  - readonly |
| courierAssignUser | מי שייכה למתנדב |  - readonly |
| courierAssingTime | מועד שיוך למתנדב |  - readonly |
| deliveryStatusUser | סטטוס: מי עדכן |  - readonly |
| createDate | מועד הקצאה |  - readonly |
| createUser | משתמש מקצה |  - readonly |
| needsWork | צריך טיפול/מעקב |  |
| needsWorkUser | צריך טיפול - מי עדכן |  - readonly |
| needsWorkDate | צריך טיפול - מתי עודכן |  - readonly |
| deliveryComments | הערה שתופיע למתנדב |  |
| familySource | גורם מפנה |  - readonly |
| groups | קבוצות שיוך משפחה |  - readonly |
| address | כתובת |  - readonly |
| floor | קומה |  - readonly |
| appartment | דירה |  - readonly |
| entrance | כניסה |  - readonly |
| city | עיר (מתעדכן אוטומטית) |  - readonly |
| area | אזור |  - readonly |
| addressComment | הנחיות נוספות לכתובת |  - readonly |
| addressLongitude | Address Longitude |  - readonly |
| addressLatitude | Address Latitude |  - readonly |
| drivingLongitude | Driving Longitude |  - readonly |
| drivingLatitude | Driving Latitude |  - readonly |
| addressByGoogle | כתובת כפי שגוגל הבין |  - readonly |
| addressOk | כתובת תקינה |  - readonly |
| fixedCourier | מתנדב ברירת מחדל |  - readonly |
| familyMembers | מספר נפשות |  - readonly |
| phone1 | טלפון 1 |  - readonly |
| phone1Description | הערות לטלפון 1 |  - readonly |
| phone2 | טלפון 2 |  - readonly |
| phone2Description | הערות לטלפון 2 |  - readonly |
| phone3 | טלפון 3 |  - readonly |
| phone3Description | הערות לטלפון 3 |  - readonly |
| phone4 | טלפון 4 |  - readonly |
| phone4Description | הערות לטלפון 4 |  - readonly |
| courierBeenHereBefore | Courier Been Here Before |  |
| archive | Archive |  |
| visibleToCourier | Visible To Courier |  |
| messageStatus | סטטוס הודעה |  |


## Helpers
| name | caption | extra info |
| --- | --- | --- |
| id | Id |  - readonly |
| name | שם |  |
| phone | טלפון |  |
| smsDate | מועד משלוח SMS |  |
| company | חברה |  |
| totalKm | Total Km |  |
| totalTime | Total Time |  |
| shortUrlKey | Short Url Key |  |
| distributionCenter | רשימת חלוקה |  |
| eventComment | הערה |  |
| needEscort | צריך מלווה |  |
| theHelperIAmEscorting | נהג משוייך |  - readonly |
| escort | מלווה |  |
| allowedIds | Allowed Ids |  |
| lastSignInDate | Last Sign In Date |  - readonly |
| realStoredPassword | Real Stored Password |  |
| email | eMail |  |
| preferredDistributionAreaAddress | כתובת אזור חלוקה מועדף |  |
| addressApiResult | Address Api Result |  |
| password | סיסמה |  |
| createDate | מועד הוספה |  - readonly |
| reminderSmsDate | מועד משלוח תזכורת SMS |  |
| admin | מנהל כלל המערכת |  |
| distCenterAdmin | משייך מתנדבים לרשימת חלוקה |  |


## events
| name | caption | extra info |
| --- | --- | --- |
| id | Id |  - readonly |
| name | שם ארוע |  |
| eventStatus | סטטוס |  |
| description | תאור |  |
| eventDate | תאריך |  |
| startTime | שעה |  |
| endTime | עד שעה |  |
| requiredVolunteers | מספר מתנדבים נדרש |  |
| registeredVolunteers | מספר מתנדבים שנרשמו |  |


## volunteersInEvent
| name | caption | extra info |
| --- | --- | --- |
| id | Id |  - readonly |
| eventId | Event Id |  |
| helper | Helper |  |
| helperName | שם |  |
| helperPhone | מספר הטלפון של המתנדב |  |
| assignedDeliveries | משלוחים שוייכו  |  |


## ApplicationSettings
| name | caption | extra info |
| --- | --- | --- |
| id | Id |  |
| organisationName | שם הארגון |  |
| smsText | תוכן הודעת SMS |  |
| reminderSmsText | תוכן הודעת תזכורת SMS |  |
| logoUrl | לוגו URL |  |
| address | כתובת מרכז השילוח |  |
| commentForSuccessDelivery | הודעה למתנדב כאשר נמסר בהצלחה |  |
| commentForSuccessLeft | הודעה למתנדב כאשר הושאר ליד הבית |  |
| commentForProblem | הודעה למתנדב כאשר יש בעיה |  |
| messageForDoneDelivery | הודעה למתנדב כאשר סיים את כל המשפחות |  |
| helpText | שם חלופי |  |
| helpPhone | טלפון חלופי |  |
| phoneStrategy | Phone Strategy |  |
| commonQuestions | Common Questions |  |
| dataStructureVersion | Data Structure Version |  - readonly |
| deliveredButtonText | מלל כפתור נמסר בהצלחה |  |
| message1Text | מלל חופשי 1 למתנדב |  |
| message1Link | כתובת אינטרנט ללחיצה על מלל חופשי 1 למתנדב |  |
| message1OnlyWhenDone | להציג מלל חופשי 1 רק כאשר המתנדב סיים אל כל הסלים |  |
| message2Text | מלל חופשי 2 למתנדב |  |
| message2Link | כתובת אינטרנט ללחיצה על מלל חופשי 2 למתנדב |  |
| message2OnlyWhenDone | להציג מלל חופשי 2 רק כאשר המתנדב סיים אל כל הסלים |  |
| forWho | המערכת היא עבור |  |
| _old_for_soliders | _old_for_soliders |  |
| usingSelfPickupModule | ישנן משפחות שבאות לקחת ממרכז החלוקה |  |
| showCompanies | שמור מטעם איזה חברה הגיע המתנדב |  |
| manageEscorts | הפעל ניהול מלווים לנהגים |  |
| showHelperComment | הצג הערה בשיוך למתנדב |  |
| showGroupsOnAssing | סינון קבוצת משפחה |  |
| showCityOnAssing | סינון עיר |  |
| showAreaOnAssing | סינון אזור |  |
| showBasketOnAssing | סינון סוג סל |  |
| showNumOfBoxesOnAssing | בחירת מספר משפחות |  |
| showLeftThereButton | הצג למתנדב כפתור השארתי ליד הבית |  |
| redTitleBar | כותרת דף בצבע אדום |  |
| defaultPrefixForExcelImport | קידומת טלפון ברירת מחדל בקליטה מאקסל |  |
| checkIfFamilyExistsInDb | בדוק אם משפחה כבר קיימת במאגר הנתונים |  |
| removedFromListStrategy | מה לעשות אם נמצאה משפחה תואמת המסומנת כהוצא מהרשימות |  |
| checkIfFamilyExistsInFile | בדוק אם משפחה כבר קיימת בקובץ האקסל |  |
| excelImportAutoAddValues | הוסף בלי לשאול ערכים לטבלאות התשתית |  |
| excelImportUpdateFamilyDefaultsBasedOnCurrentDelivery | עדכן ברירות מחדל למשפחה בהתאם למשלוח זה |  |
| checkDuplicatePhones | בדוק טלפונים כפולים |  |
| volunteerCanUpdateComment | מתנדב יכול לעדכן לעצמו הערה |  |
| showDistCenterAsEndAddressForVolunteer | הצג כתובות רשימת חלוקה כנקודת סיום למתנדב |  |
| routeStrategy | תכנון מסלול |  |
| addressApiResult | Address Api Result |  |
| defaultStatusType | סטטוס משלוח ברירת מחדל למשפחות חדשות |  |
| boxes1Name | שם כמות 1 בסוגי סלים |  |
| boxes2Name | שם כמות 2 בסוגי סלים |  |


## DistributionCenters
| name | caption | extra info |
| --- | --- | --- |
| id | Id |  - readonly |
| name | שם |  |
| semel | סמל |  |
| address | כתובת מרכז השילוח |  |
| addressApiResult | Address Api Result |  |
| comments | הערה |  |
| phone1 | טלפון 1 |  |
| phone1Description | הערות לטלפון 1 |  |
| phone2 | טלפון 2 |  |
| phone2Description | הערות לטלפון 2 |  |


## Sites
| name | caption | extra info |
| --- | --- | --- |
| id | מזהה הסביבה |  |
| createDate | מועד הוספה |  - readonly |
| createUser | משתמש מוסיף |  - readonly |


## GeocodeCache
| name | caption | extra info |
| --- | --- | --- |
| id | Id |  |
| googleApiResult | Google Api Result |  |
| createDate | Create Date |  |


## FamilySources
| name | caption | extra info |
| --- | --- | --- |
| id | Id |  - readonly |
| name | שם |  |
| contactPerson | איש קשר |  |
| phone | טלפון |  |


## BasketType
| name | caption | extra info |
| --- | --- | --- |
| id | Id |  - readonly |
| name | שם |  |
| boxes | מנות |  |
| boxes2 | משהו אחר |  |


## ApplicationImages
| name | caption | extra info |
| --- | --- | --- |
| id | Id |  |
| base64Icon | איקון דף base64 |  |
| base64PhoneHomeImage | איקון דף הבית בטלפון base64 |  |


## groups
| name | caption | extra info |
| --- | --- | --- |
| id | Id |  - readonly |
| name | קבוצה |  |


## GroupsStatsPerDistributionCenter
| name | caption | extra info |
| --- | --- | --- |
| name | Name |  |
| distCenter | רשימת חלוקה |  |
| familiesCount | Families Count |  |


## GroupsStatsForAllDeliveryCenters
| name | caption | extra info |
| --- | --- | --- |
| name | Name |  |
| familiesCount | Families Count |  |


## citiesStats
| name | caption | extra info |
| --- | --- | --- |
| city | City |  |
| deliveries | Deliveries |  |


## citiesStats
| name | caption | extra info |
| --- | --- | --- |
| city | City |  |
| distributionCenter | רשימת חלוקה |  |
| families | Families |  |


## ActiveFamilyDeliveries
| name | caption | extra info |
| --- | --- | --- |
| id | Id |  - readonly |
| family | id של המשפחה באפליקצית חגי |  - readonly |
| name | שם |  - readonly |
| basketType | סוג סל |  |
| quantity | כמות |  |
| distributionCenter | רשימת חלוקה |  |
| deliverStatus | סטטוס משלוח |  |
| courier | מתנדב |  |
| courierComments | הערות שכתב המתנדב כשמסר |  |
| internalDeliveryComment | הערה פנימית למשלוח - לא תוצג למתנדב |  |
| routeOrder | Route Order |  |
| special | שיוך מיוחד |  |
| deliveryStatusDate | מתי |  - readonly |
| courierAssignUser | מי שייכה למתנדב |  - readonly |
| courierAssingTime | מועד שיוך למתנדב |  - readonly |
| deliveryStatusUser | סטטוס: מי עדכן |  - readonly |
| createDate | מועד הקצאה |  - readonly |
| createUser | משתמש מקצה |  - readonly |
| needsWork | צריך טיפול/מעקב |  |
| needsWorkUser | צריך טיפול - מי עדכן |  - readonly |
| needsWorkDate | צריך טיפול - מתי עודכן |  - readonly |
| deliveryComments | הערה שתופיע למתנדב |  |
| familySource | גורם מפנה |  - readonly |
| groups | קבוצות שיוך משפחה |  - readonly |
| address | כתובת |  - readonly |
| floor | קומה |  - readonly |
| appartment | דירה |  - readonly |
| entrance | כניסה |  - readonly |
| city | עיר (מתעדכן אוטומטית) |  - readonly |
| area | אזור |  - readonly |
| addressComment | הנחיות נוספות לכתובת |  - readonly |
| addressLongitude | Address Longitude |  - readonly |
| addressLatitude | Address Latitude |  - readonly |
| drivingLongitude | Driving Longitude |  - readonly |
| drivingLatitude | Driving Latitude |  - readonly |
| addressByGoogle | כתובת כפי שגוגל הבין |  - readonly |
| addressOk | כתובת תקינה |  - readonly |
| fixedCourier | מתנדב ברירת מחדל |  - readonly |
| familyMembers | מספר נפשות |  - readonly |
| phone1 | טלפון 1 |  - readonly |
| phone1Description | הערות לטלפון 1 |  - readonly |
| phone2 | טלפון 2 |  - readonly |
| phone2Description | הערות לטלפון 2 |  - readonly |
| phone3 | טלפון 3 |  - readonly |
| phone3Description | הערות לטלפון 3 |  - readonly |
| phone4 | טלפון 4 |  - readonly |
| phone4Description | הערות לטלפון 4 |  - readonly |
| courierBeenHereBefore | Courier Been Here Before |  |
| archive | Archive |  |
| visibleToCourier | Visible To Courier |  |
| messageStatus | סטטוס הודעה |  |


## helpersAndStats
| name | caption | extra info |
| --- | --- | --- |
| id | Id |  - readonly |
| name | שם |  |
| phone | טלפון |  |
| smsDate | מועד משלוח SMS |  |
| company | חברה |  |
| totalKm | Total Km |  |
| totalTime | Total Time |  |
| shortUrlKey | Short Url Key |  |
| distributionCenter | רשימת חלוקה |  |
| eventComment | הערה |  |
| needEscort | צריך מלווה |  |
| theHelperIAmEscorting | נהג משוייך |  - readonly |
| escort | מלווה |  |
| deliveriesInProgress | משפחות מחכות |  |
| allDeliveires | משפחות |  |


## helperHistoryInfo
| name | caption | extra info |
| --- | --- | --- |
| courier | Courier |  |
| name | שם |  |
| phone | טלפון |  |
| company | חברה |  |
| deliveries | משלוחים |  |
| families | משפחות |  |
| dates | תאריכים |  |
