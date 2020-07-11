## Data Model
 Here's a detailed list of all the entities used in the rest api

## Families
| name | caption |  | extra info |
| --- | --- | --- | --- |
| id | id של המשפחה באפליקצית חגי | IdColumn |  readonly |
| name | שם | StringColumn |  |
| tz | מספר זהות | StringColumn |  |
| tz2 | מספר זהות בן/בת הזוג | StringColumn |  |
| familyMembers | מספר נפשות | NumberColumn |  |
| birthDate | תאריך לידה | DateColumn |  |
| nextBirthday | יומולדת הבא | DateColumn |  readonly |
| basketType | סוג סל ברירת מחדל | BasketId |  |
| quantity | כמות ברירת מחדל | QuantityColumn |  |
| familySource | גורם מפנה | FamilySourceId |  |
| socialWorker | איש קשר לבירור פרטים (עו"ס) | StringColumn |  |
| socialWorkerPhone1 | עו"ס טלפון 1 | PhoneColumn |  |
| socialWorkerPhone2 | עו"ס טלפון 2 | PhoneColumn |  |
| groups | קבוצות שיוך משפחה | GroupsColumn |  |
| special | שיוך מיוחד | YesNoColumn |  |
| defaultSelfPickup | באים לקחת ברירת מחדל | BoolColumn |  |
| iDinExcel | מזהה חד ערכי למשפחה | StringColumn |  |
| internalComment | הערה פנימית - לא תופיע למתנדב | StringColumn |  |
| address | כתובת | StringColumn |  |
| floor | קומה | StringColumn |  |
| appartment | דירה | StringColumn |  |
| entrance | כניסה | StringColumn |  |
| city | עיר (מתעדכן אוטומטית) | StringColumn |  |
| area | אזור | StringColumn |  |
| addressComment | הנחיות נוספות לכתובת | StringColumn |  |
| postalCode | מיקוד | NumberColumn |  |
| deliveryComments | הערה ברירת מחדל למתנדב | StringColumn |  |
| addressApiResult | Address Api Result | StringColumn |  |
| phone1 | טלפון 1 | PhoneColumn |  |
| phone1Description | הערות לטלפון 1 | StringColumn |  |
| phone2 | טלפון 2 | PhoneColumn |  |
| phone2Description | הערות לטלפון 2 | StringColumn |  |
| phone3 | טלפון 3 | PhoneColumn |  |
| phone3Description | הערות לטלפון 3 | StringColumn |  |
| phone4 | טלפון 4 | PhoneColumn |  |
| phone4Description | הערות לטלפון 4 | StringColumn |  |
| email | eMail | EmailColumn |  |
| status | סטטוס | FamilyStatusColumn |  |
| statusDate | סטטוס: תאריך שינוי | changeDate |  readonly |
| statusUser | סטטוס: מי עדכן | HelperIdReadonly |  readonly |
| fixedCourier | מתנדב ברירת מחדל | HelperId |  |
| previousDeliveryStatus | סטטוס משלוח קודם | DeliveryStatusColumn |  |
| previousDeliveryDate | תאריך משלוח קודם | changeDate |  readonly |
| previousDeliveryComment | הערת משלוח קודם | StringColumn |  |
| numOfActiveReadyDeliveries | מספר משלוחים פעילים שטרם נמסרו | NumberColumn |  |
| addressLongitude | Address Longitude | NumberColumn |  |
| addressLatitude | Address Latitude | NumberColumn |  |
| drivingLongitude | Driving Longitude | NumberColumn |  |
| drivingLatitude | Driving Latitude | NumberColumn |  |
| addressByGoogle | כתובת כפי שגוגל הבין | StringColumn |  readonly |
| addressOk | כתובת תקינה | BoolColumn |  |
| createDate | מועד הוספה | changeDate |  readonly |
| createUser | משתמש מוסיף | HelperIdReadonly |  readonly |
| lastUpdateDate | מועד עדכון אחרון | changeDate |  readonly |
| lastUpdateUser | משתמש מעדכן | HelperIdReadonly |  readonly |


## FamilyDeliveries
| name | caption |  | extra info |
| --- | --- | --- | --- |
| id | Id | IdColumn |  readonly |
| family | id של המשפחה באפליקצית חגי | FamilyId |  readonly |
| name | שם | StringColumn |  readonly |
| basketType | סוג סל | BasketId |  |
| quantity | כמות | QuantityColumn |  |
| distributionCenter | רשימת חלוקה | DistributionCenterId |  |
| deliverStatus | סטטוס משלוח | DeliveryStatusColumn |  |
| courier | מתנדב | HelperId |  |
| courierComments | הערות שכתב המתנדב כשמסר | StringColumn |  |
| internalDeliveryComment | הערה פנימית למשלוח - לא תוצג למתנדב | StringColumn |  |
| routeOrder | Route Order | NumberColumn |  |
| special | שיוך מיוחד | YesNoColumn |  |
| deliveryStatusDate | מתי | changeDate |  readonly |
| courierAssignUser | מי שייכה למתנדב | HelperIdReadonly |  readonly |
| courierAssingTime | מועד שיוך למתנדב | changeDate |  readonly |
| deliveryStatusUser | סטטוס: מי עדכן | HelperIdReadonly |  readonly |
| createDate | מועד הקצאה | changeDate |  readonly |
| createUser | משתמש מקצה | HelperIdReadonly |  readonly |
| needsWork | צריך טיפול/מעקב | BoolColumn |  |
| needsWorkUser | צריך טיפול - מי עדכן | HelperIdReadonly |  readonly |
| needsWorkDate | צריך טיפול - מתי עודכן | changeDate |  readonly |
| deliveryComments | הערה שתופיע למתנדב | StringColumn |  |
| familySource | גורם מפנה | FamilySourceId |  readonly |
| groups | קבוצות שיוך משפחה | GroupsColumn |  readonly |
| address | כתובת | StringColumn |  readonly |
| floor | קומה | StringColumn |  readonly |
| appartment | דירה | StringColumn |  readonly |
| entrance | כניסה | StringColumn |  readonly |
| city | עיר (מתעדכן אוטומטית) | StringColumn |  readonly |
| area | אזור | StringColumn |  readonly |
| addressComment | הנחיות נוספות לכתובת | StringColumn |  readonly |
| addressLongitude | Address Longitude | NumberColumn |  readonly |
| addressLatitude | Address Latitude | NumberColumn |  readonly |
| drivingLongitude | Driving Longitude | NumberColumn |  readonly |
| drivingLatitude | Driving Latitude | NumberColumn |  readonly |
| addressByGoogle | כתובת כפי שגוגל הבין | StringColumn |  readonly |
| addressOk | כתובת תקינה | BoolColumn |  readonly |
| fixedCourier | מתנדב ברירת מחדל | HelperId |  readonly |
| familyMembers | מספר נפשות | NumberColumn |  readonly |
| phone1 | טלפון 1 | PhoneColumn |  readonly |
| phone1Description | הערות לטלפון 1 | StringColumn |  readonly |
| phone2 | טלפון 2 | PhoneColumn |  readonly |
| phone2Description | הערות לטלפון 2 | StringColumn |  readonly |
| phone3 | טלפון 3 | PhoneColumn |  readonly |
| phone3Description | הערות לטלפון 3 | StringColumn |  readonly |
| phone4 | טלפון 4 | PhoneColumn |  readonly |
| phone4Description | הערות לטלפון 4 | StringColumn |  readonly |
| courierBeenHereBefore | Courier Been Here Before | BoolColumn |  |
| archive | Archive | BoolColumn |  |
| visibleToCourier | Visible To Courier | BoolColumn |  |
| messageStatus | סטטוס הודעה | MessageStatusColumn |  |


## Helpers
| name | caption |  | extra info |
| --- | --- | --- | --- |
| id | Id | IdColumn |  readonly |
| name | שם | StringColumn |  |
| phone | טלפון | PhoneColumn |  |
| smsDate | מועד משלוח SMS | DateTimeColumn |  |
| company | חברה | CompanyColumn |  |
| totalKm | Total Km | NumberColumn |  |
| totalTime | Total Time | NumberColumn |  |
| shortUrlKey | Short Url Key | StringColumn |  |
| distributionCenter | רשימת חלוקה | DistributionCenterId |  |
| eventComment | הערה | StringColumn |  |
| needEscort | צריך מלווה | BoolColumn |  |
| theHelperIAmEscorting | נהג משוייך | HelperIdReadonly |  readonly |
| escort | מלווה | HelperId |  |
| allowedIds | Allowed Ids | StringColumn |  |
| lastSignInDate | Last Sign In Date | changeDate |  readonly |
| realStoredPassword | Real Stored Password | StringColumn |  |
| email | eMail | EmailColumn |  |
| preferredDistributionAreaAddress | כתובת אזור חלוקה מועדף | StringColumn |  |
| addressApiResult | Address Api Result | StringColumn |  |
| password | סיסמה | StringColumn |  |
| createDate | מועד הוספה | changeDate |  readonly |
| reminderSmsDate | מועד משלוח תזכורת SMS | DateTimeColumn |  |
| admin | מנהל כלל המערכת | BoolColumn |  |
| distCenterAdmin | משייך מתנדבים לרשימת חלוקה | BoolColumn |  |


## events
| name | caption |  | extra info |
| --- | --- | --- | --- |
| id | Id | IdColumn |  readonly |
| name | שם ארוע | StringColumn |  |
| eventStatus | סטטוס | eventStatusColumn |  |
| description | תאור | StringColumn |  |
| eventDate | תאריך | DateColumn |  |
| startTime | שעה | StringColumn |  |
| endTime | עד שעה | StringColumn |  |
| requiredVolunteers | מספר מתנדבים נדרש | NumberColumn |  |
| registeredVolunteers | מספר מתנדבים שנרשמו | NumberColumn |  |


## volunteersInEvent
| name | caption |  | extra info |
| --- | --- | --- | --- |
| id | Id | IdColumn |  readonly |
| eventId | Event Id | IdColumn |  |
| helper | Helper | HelperId |  |
| helperName | שם | StringColumn |  |
| helperPhone | מספר הטלפון של המתנדב | PhoneColumn |  |
| assignedDeliveries | משלוחים שוייכו  | NumberColumn |  |


## ApplicationSettings
| name | caption |  | extra info |
| --- | --- | --- | --- |
| id | Id | NumberColumn |  |
| organisationName | שם הארגון | StringColumn |  |
| smsText | תוכן הודעת SMS | StringColumn |  |
| reminderSmsText | תוכן הודעת תזכורת SMS | StringColumn |  |
| logoUrl | לוגו URL | StringColumn |  |
| address | כתובת מרכז השילוח | StringColumn |  |
| commentForSuccessDelivery | הודעה למתנדב כאשר נמסר בהצלחה | StringColumn |  |
| commentForSuccessLeft | הודעה למתנדב כאשר הושאר ליד הבית | StringColumn |  |
| commentForProblem | הודעה למתנדב כאשר יש בעיה | StringColumn |  |
| messageForDoneDelivery | הודעה למתנדב כאשר סיים את כל המשפחות | StringColumn |  |
| helpText | שם חלופי | StringColumn |  |
| helpPhone | טלפון חלופי | PhoneColumn |  |
| phoneStrategy | Phone Strategy | StringColumn |  |
| commonQuestions | Common Questions | StringColumn |  |
| dataStructureVersion | Data Structure Version | NumberColumn |  readonly |
| deliveredButtonText | מלל כפתור נמסר בהצלחה | StringColumn |  |
| message1Text | מלל חופשי 1 למתנדב | StringColumn |  |
| message1Link | כתובת אינטרנט ללחיצה על מלל חופשי 1 למתנדב | StringColumn |  |
| message1OnlyWhenDone | להציג מלל חופשי 1 רק כאשר המתנדב סיים אל כל הסלים | BoolColumn |  |
| message2Text | מלל חופשי 2 למתנדב | StringColumn |  |
| message2Link | כתובת אינטרנט ללחיצה על מלל חופשי 2 למתנדב | StringColumn |  |
| message2OnlyWhenDone | להציג מלל חופשי 2 רק כאשר המתנדב סיים אל כל הסלים | BoolColumn |  |
| forWho | המערכת היא עבור | TranslationOptionsColumn |  |
| _old_for_soliders | _old_for_soliders | BoolColumn |  |
| usingSelfPickupModule | ישנן משפחות שבאות לקחת ממרכז החלוקה | BoolColumn |  |
| showCompanies | שמור מטעם איזה חברה הגיע המתנדב | BoolColumn |  |
| manageEscorts | הפעל ניהול מלווים לנהגים | BoolColumn |  |
| showHelperComment | הצג הערה בשיוך למתנדב | BoolColumn |  |
| showGroupsOnAssing | סינון קבוצת משפחה | BoolColumn |  |
| showCityOnAssing | סינון עיר | BoolColumn |  |
| showAreaOnAssing | סינון אזור | BoolColumn |  |
| showBasketOnAssing | סינון סוג סל | BoolColumn |  |
| showNumOfBoxesOnAssing | בחירת מספר משפחות | BoolColumn |  |
| showLeftThereButton | הצג למתנדב כפתור השארתי ליד הבית | BoolColumn |  |
| redTitleBar | כותרת דף בצבע אדום | BoolColumn |  |
| defaultPrefixForExcelImport | קידומת טלפון ברירת מחדל בקליטה מאקסל | StringColumn |  |
| checkIfFamilyExistsInDb | בדוק אם משפחה כבר קיימת במאגר הנתונים | BoolColumn |  |
| removedFromListStrategy | מה לעשות אם נמצאה משפחה תואמת המסומנת כהוצא מהרשימות | RemovedFromListExcelImportStrategyColumn |  |
| checkIfFamilyExistsInFile | בדוק אם משפחה כבר קיימת בקובץ האקסל | BoolColumn |  |
| excelImportAutoAddValues | הוסף בלי לשאול ערכים לטבלאות התשתית | BoolColumn |  |
| excelImportUpdateFamilyDefaultsBasedOnCurrentDelivery | עדכן ברירות מחדל למשפחה בהתאם למשלוח זה | BoolColumn |  |
| checkDuplicatePhones | בדוק טלפונים כפולים | BoolColumn |  |
| volunteerCanUpdateComment | מתנדב יכול לעדכן לעצמו הערה | BoolColumn |  |
| showDistCenterAsEndAddressForVolunteer | הצג כתובות רשימת חלוקה כנקודת סיום למתנדב | BoolColumn |  |
| routeStrategy | תכנון מסלול | routeStrategyColumn |  |
| addressApiResult | Address Api Result | StringColumn |  |
| defaultStatusType | סטטוס משלוח ברירת מחדל למשפחות חדשות | DeliveryStatusColumn |  |
| boxes1Name | שם כמות 1 בסוגי סלים | StringColumn |  |
| boxes2Name | שם כמות 2 בסוגי סלים | StringColumn |  |


## DistributionCenters
| name | caption |  | extra info |
| --- | --- | --- | --- |
| id | Id | IdColumn |  readonly |
| name | שם | StringColumn |  |
| semel | סמל | StringColumn |  |
| address | כתובת מרכז השילוח | StringColumn |  |
| addressApiResult | Address Api Result | StringColumn |  |
| comments | הערה | StringColumn |  |
| phone1 | טלפון 1 | PhoneColumn |  |
| phone1Description | הערות לטלפון 1 | StringColumn |  |
| phone2 | טלפון 2 | PhoneColumn |  |
| phone2Description | הערות לטלפון 2 | StringColumn |  |


## Sites
| name | caption |  | extra info |
| --- | --- | --- | --- |
| id | מזהה הסביבה | SchemaIdColumn |  |
| createDate | מועד הוספה | changeDate |  readonly |
| createUser | משתמש מוסיף | HelperIdReadonly |  readonly |


## GeocodeCache
| name | caption |  | extra info |
| --- | --- | --- | --- |
| id | Id | StringColumn |  |
| googleApiResult | Google Api Result | StringColumn |  |
| createDate | Create Date | DateTimeColumn |  |


## FamilySources
| name | caption |  | extra info |
| --- | --- | --- | --- |
| id | Id | IdColumn |  readonly |
| name | שם | StringColumn |  |
| contactPerson | איש קשר | StringColumn |  |
| phone | טלפון | PhoneColumn |  |


## BasketType
| name | caption |  | extra info |
| --- | --- | --- | --- |
| id | Id | IdColumn |  readonly |
| name | שם | StringColumn |  |
| boxes | מנות | NumberColumn |  |
| boxes2 | משהו אחר | NumberColumn |  |


## ApplicationImages
| name | caption |  | extra info |
| --- | --- | --- | --- |
| id | Id | NumberColumn |  |
| base64Icon | איקון דף base64 | StringColumn |  |
| base64PhoneHomeImage | איקון דף הבית בטלפון base64 | StringColumn |  |


## groups
| name | caption |  | extra info |
| --- | --- | --- | --- |
| id | Id | IdColumn |  readonly |
| name | קבוצה | StringColumn |  |


## GroupsStatsPerDistributionCenter
| name | caption |  | extra info |
| --- | --- | --- | --- |
| name | Name | StringColumn |  |
| distCenter | רשימת חלוקה | DistributionCenterId |  |
| familiesCount | Families Count | NumberColumn |  |


## GroupsStatsForAllDeliveryCenters
| name | caption |  | extra info |
| --- | --- | --- | --- |
| name | Name | StringColumn |  |
| familiesCount | Families Count | NumberColumn |  |


## citiesStats
| name | caption |  | extra info |
| --- | --- | --- | --- |
| city | City | StringColumn |  |
| deliveries | Deliveries | NumberColumn |  |


## citiesStats
| name | caption |  | extra info |
| --- | --- | --- | --- |
| city | City | StringColumn |  |
| distributionCenter | רשימת חלוקה | DistributionCenterId |  |
| families | Families | NumberColumn |  |


## ActiveFamilyDeliveries
| name | caption |  | extra info |
| --- | --- | --- | --- |
| id | Id | IdColumn |  readonly |
| family | id של המשפחה באפליקצית חגי | FamilyId |  readonly |
| name | שם | StringColumn |  readonly |
| basketType | סוג סל | BasketId |  |
| quantity | כמות | QuantityColumn |  |
| distributionCenter | רשימת חלוקה | DistributionCenterId |  |
| deliverStatus | סטטוס משלוח | DeliveryStatusColumn |  |
| courier | מתנדב | HelperId |  |
| courierComments | הערות שכתב המתנדב כשמסר | StringColumn |  |
| internalDeliveryComment | הערה פנימית למשלוח - לא תוצג למתנדב | StringColumn |  |
| routeOrder | Route Order | NumberColumn |  |
| special | שיוך מיוחד | YesNoColumn |  |
| deliveryStatusDate | מתי | changeDate |  readonly |
| courierAssignUser | מי שייכה למתנדב | HelperIdReadonly |  readonly |
| courierAssingTime | מועד שיוך למתנדב | changeDate |  readonly |
| deliveryStatusUser | סטטוס: מי עדכן | HelperIdReadonly |  readonly |
| createDate | מועד הקצאה | changeDate |  readonly |
| createUser | משתמש מקצה | HelperIdReadonly |  readonly |
| needsWork | צריך טיפול/מעקב | BoolColumn |  |
| needsWorkUser | צריך טיפול - מי עדכן | HelperIdReadonly |  readonly |
| needsWorkDate | צריך טיפול - מתי עודכן | changeDate |  readonly |
| deliveryComments | הערה שתופיע למתנדב | StringColumn |  |
| familySource | גורם מפנה | FamilySourceId |  readonly |
| groups | קבוצות שיוך משפחה | GroupsColumn |  readonly |
| address | כתובת | StringColumn |  readonly |
| floor | קומה | StringColumn |  readonly |
| appartment | דירה | StringColumn |  readonly |
| entrance | כניסה | StringColumn |  readonly |
| city | עיר (מתעדכן אוטומטית) | StringColumn |  readonly |
| area | אזור | StringColumn |  readonly |
| addressComment | הנחיות נוספות לכתובת | StringColumn |  readonly |
| addressLongitude | Address Longitude | NumberColumn |  readonly |
| addressLatitude | Address Latitude | NumberColumn |  readonly |
| drivingLongitude | Driving Longitude | NumberColumn |  readonly |
| drivingLatitude | Driving Latitude | NumberColumn |  readonly |
| addressByGoogle | כתובת כפי שגוגל הבין | StringColumn |  readonly |
| addressOk | כתובת תקינה | BoolColumn |  readonly |
| fixedCourier | מתנדב ברירת מחדל | HelperId |  readonly |
| familyMembers | מספר נפשות | NumberColumn |  readonly |
| phone1 | טלפון 1 | PhoneColumn |  readonly |
| phone1Description | הערות לטלפון 1 | StringColumn |  readonly |
| phone2 | טלפון 2 | PhoneColumn |  readonly |
| phone2Description | הערות לטלפון 2 | StringColumn |  readonly |
| phone3 | טלפון 3 | PhoneColumn |  readonly |
| phone3Description | הערות לטלפון 3 | StringColumn |  readonly |
| phone4 | טלפון 4 | PhoneColumn |  readonly |
| phone4Description | הערות לטלפון 4 | StringColumn |  readonly |
| courierBeenHereBefore | Courier Been Here Before | BoolColumn |  |
| archive | Archive | BoolColumn |  |
| visibleToCourier | Visible To Courier | BoolColumn |  |
| messageStatus | סטטוס הודעה | MessageStatusColumn |  |


## helpersAndStats
| name | caption |  | extra info |
| --- | --- | --- | --- |
| id | Id | IdColumn |  readonly |
| name | שם | StringColumn |  |
| phone | טלפון | PhoneColumn |  |
| smsDate | מועד משלוח SMS | DateTimeColumn |  |
| company | חברה | CompanyColumn |  |
| totalKm | Total Km | NumberColumn |  |
| totalTime | Total Time | NumberColumn |  |
| shortUrlKey | Short Url Key | StringColumn |  |
| distributionCenter | רשימת חלוקה | DistributionCenterId |  |
| eventComment | הערה | StringColumn |  |
| needEscort | צריך מלווה | BoolColumn |  |
| theHelperIAmEscorting | נהג משוייך | HelperIdReadonly |  readonly |
| escort | מלווה | HelperId |  |
| deliveriesInProgress | משפחות מחכות | NumberColumn |  |
| allDeliveires | משפחות | NumberColumn |  |


## helperHistoryInfo
| name | caption |  | extra info |
| --- | --- | --- | --- |
| courier | Courier | StringColumn |  |
| name | שם | StringColumn |  |
| phone | טלפון | PhoneColumn |  |
| company | חברה | CompanyColumn |  |
| deliveries | משלוחים | NumberColumn |  |
| families | משפחות | NumberColumn |  |
| dates | תאריכים | NumberColumn |  |
