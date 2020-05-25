import { Pipe, PipeTransform } from '@angular/core';
import { ValueListColumn, ColumnOptions, Context } from '@remult/core';

@Pipe({ name: 'translate' })
export class TranslatePipe implements PipeTransform {
  transform(value: string): string {

    return translate(value);
  }
}


var terms: { [key: string]: string } = {};

export function translate(s: string) {
  let r = terms[s];

  if (!r) {
    r = translationConfig.forWho.translate(s);
    terms[s] = r;
  }
  return r;
}

export class TranslationOptions {


  static Families: TranslationOptions = new TranslationOptions(0, 'משפחות', s => s);
  static Donors: TranslationOptions = new TranslationOptions(1, 'תורמים',
    s => s.replace(/משפחה אחת/g, "תורם אחד")
      .replace(/משפחות חוזרות/g, 'תורמים חוזרים')
      .replace(/משפחות מיוחדות/g, "תורמים מיוחדים")
      .replace(/מש' הכי קרובה/g, 'תורם הכי קרוב')
      .replace(/משפחה כלשהי/g, 'תורם כלשהו')
      .replace(/משפחות/g, "תורמים")
      .replace(/משפחה/g, 'תורם')
      .replace(/חדשה/g, 'חדש')
      .replace(/כפולות/g, 'כפולים'));
  static Soldiers: TranslationOptions = new TranslationOptions(2, 'חיילים', s =>
    s.replace(/משפחה אחת/g, "חייל אחד")
      .replace(/משפחות חוזרות/g, 'חיילים חוזרים')
      .replace(/משפחות מיוחדות/g, "חיילים מיוחדים")
      .replace(/מש' הכי קרובה/g, 'חייל הכי קרוב')
      .replace(/משפחה כלשהי/g, 'חייל כלשהו')
      .replace(/משפחות/g, "חיילים")
      .replace(/משפחה/g, 'חייל')
      .replace(/חדשה/g, 'חדש')
      .replace(/כפולות/g, 'כפולים'));
  TranslateOption() {

  }
  constructor(public id: number, public caption: string, public translate: (s: string) => string) {
  }

}
export class TranslationOptionsColumn extends ValueListColumn<TranslationOptions> {

  constructor(settingsOrCaption?: ColumnOptions<TranslationOptions>) {
    super(TranslationOptions, {
      dataControlSettings: () => ({
        valueList: this.getOptions(),
        width: '150'
      })
    }, settingsOrCaption);
    if (!this.defs.caption)
      this.defs.caption = 'המערכת היא עבור';
  }

}
export const translationConfig = { activateTranslation: false, forWho: TranslationOptions.Families };


export function getLang(context: Context) {
  return use.language;
}




export class Language {
  assignDeliveryMenu = 'שיוך משלוחים למתנדב';
  defaultOrgName = 'שם הארגון שלי';
  defaultSmsText = 'שלום !מתנדב!\nלחלוקת חבילות !ארגון! לחץ על: !אתר! \nתודה !שולח!';
  reminderSmsText = 'שלום !מתנדב!, \nנשמח אם תעדכן את המערכת במצב המסירה של הסלים. לעדכון לחץ על:  !אתר!\nבתודה !ארגון!';
  commentForSuccessDelivery = 'נשמח אם תכתוב לנו הערה על מה שראית והיה';
  commentForSuccessLeft = 'אנא פרט היכן השארת את הסל ועם מי דיברת';
  commentForProblem = 'נשמח אם תכתוב לנו הערה על מה שראית והיה';
  messageForDoneDelivery = 'תודה על כל העזרה, נשמח אם תתנדבו שוב';
  deliveredButtonText = 'מסרתי את החבילה בהצלחה';
  boxes1Name = 'מנות';
  boxes2Name = 'משהו אחר';
  defaultDistributionListName = 'חלוקת מזון';
  AssignEscortComponent = 'שיוך מלווים';
  FamilyDeliveriesComponent = 'משלוחים';
  FamiliesComponent = 'משפחות';
  DeliveryFollowUpComponent = 'מעקב מתנדבים';
  NewsComponent = 'מצריך טיפול';
  DistributionMapComponent = "מפת הפצה";
  OverviewComponent = 'Overview';
  HelpersComponent = 'מתנדבים';
  DeliveryHistoryComponent = 'היסטורית משלוחים';
  PlaybackComponent = 'סרטון חלוקה';
  GeocodeComponent = 'GEOCODE';
  ImportFromExcelComponent = 'קליטת משפחות מאקסל';
  ImportHelpersFromExcelComponent = 'קליטת מתנדבים מאקסל';
  DuplicateFamiliesComponent = 'חיפוש משפחות כפולות';
  ManageComponent = 'הגדרות מערכת';
  MyFamiliesComponent = 'משפחות שלי';
  UpdateInfoComponent = 'הגדרות אישיות';
  LoginComponent = 'כניסה';
  RegisterComponent = 'הרשמה';
  copyright = ' חגי - אפליקציה לחלוקת סלי מזון';
  exit = 'יציאה';
  hello = "שלום";
  escoring = "מלווה את";
  clickForTutorialVideo = "לסרטון הדרכה קצר, לחצו כאן";
  cancelAllAssignments = 'בטל שיוך לכל המשלוחים';
  markAllDeliveriesAsSuccesfull = 'סמן נמסר בהצלחה לכל המשלוחים';
  estimatedTravelTime = 'סה"כ זמן נסיעה מוערך';
  minutes = 'דקות';
  km = 'ק"מ';
  leftDeliveryNextToHouse = 'השארתי ליד הבית';
  failedDeliveries = 'משלוחים שנתקלתי בבעיה';
  ranIntoAProblem = 'נתקלתי בבעיה';
  showAllDeliveries = 'הצג את כל המשלוחים לחלוקה';
  sendSmsWithLink = 'שלח הודעת SMS עם קישור';
  sendLinkOnWhatsapp = 'שלח קישור ב whatsapp';
  copyMessageWithLink = 'העתק הודעה עם קישור';
  copyLink = 'העתק קישור';
  sendSmsFromDevice = 'שלח קישור בSMS מהטלפון';
  reminderSent = 'תזכורת נשלחה';
  resendReminder = 'שלח שוב';
  sendReminderSms = 'שלחי SMS לתזכורת';
  callPerson = 'התקשר ל';
  callEscort = 'התקשר למלווה';
  family = 'משפחה';
  address = 'כתובת';
  phones = 'טלפונים';
  phone = 'טלפון';
  thereAre = 'יש';
  basket = 'סל';
  notice = 'שים לב!';
  floor = 'קומה';
  appartment = 'דירה';
  entrance = 'כניסה';
  updateComment = 'עדכן הערה';
  clickedByMistake = 'נלחץ בטעות - החזר למשלוחים לחלוקה';
  deliveriesDoneInTheLastTwoDays = 'משלוחים שחולקו ביומיים האחרונים';
  showAllCompletedDeliveries = 'הצג את כל המשלוחים שחולקו';
  showRouteOnGoogleMaps = 'הצג מסלול ב - google maps';
  selfPuckupSuccess = 'אספו את החבילה';
  packageWasPickedUp = 'אספו את החבילה';
  cancelAsignment = 'בטל שיוך';
  deliveryDetails = 'כרטיס משלוח';
  repeatFamilyNotice = 'הייתם אצל המשפחה הזו גם פעם קודמת';
  inacurateAddress = 'שימו לב, כתובת לא מדוייקת!';
  copyAddress = 'העתק כתובת';
  SelfPickupComponent = 'באים לקחת';
  oneDeliveryToDistribute = 'משלוח אחד לחלוקה';
  deliveriesToDistribute = 'משלוחים לחלוקה';
  volunteerInfo = 'פרטי מתנדב';
  assignRequiresADistributionList = 'לא ניתן לשייך מתנדבים מכיוון שלא נבחרה רשימת חלוקה. אנא בחרו רשימת חלוקה (למעלה מצד שמאל איפה שכתוב "כל הרשימות")';
  findHelperByName = 'חפש מתנדב לפי שם';
  clearHelperInfo = 'נקה פרטי מתנדב';
  saveHelperInfoAndMoveToNextHelper = 'שמור פרטי מתנדב ועבור למתנדב הבא';
  showHelperCompany = 'הצג חברה למתנדב';
  hideHelperCompany = 'הסתר חברה למתנדב';
  volunteerPhoneNumber = 'מספר הטלפון של המתנדב';
  assignHelpText = 'אנא הזיני את הטלפון של המתנדב ושמו, ואז תוכלי לבחור קבוצה, עיר ואילו סלים לשייך';
  asignVideoHelp = 'לסרטון הדרכה על שיוך משלוחים ויום האירוע לחצו כאן';
  asignDeliveriesTo = 'שיוך משלוחים ל';
  familyGroups = 'קבוצות שיוך משפחה';
  allGroups = 'כל הקבוצות';
  distributionCity = 'עיר לחלוקה';
  allCities = 'כל הערים';
  region = 'אזור';
  allRegions = 'כל האזורים';
  basketType = 'סוג סל';
  numOfFamilies = 'מספר משפחות';
  prioritizeRepeatFamilies = 'עדיפות למשפחות חוזרות';
  inProgress = 'עובד על זה...';
  noDeliveriesLeft = 'לא נותרו משלוחים מתאימים';
  asignClosestDelivery = "שייך משלוח הכי קרוב";
  asignAnyDelivery = 'שייך משלוח כלשהו';
  addAllRepeatFamilies = 'הוסף את כל המשפחות החוזרות';
  specialFamilies = 'משפחות מיוחדות';
  selectDeliveryByName = 'בחירת משפחה לפי שם';
  selectDeliveryOnMap = 'בחירת משפחה על המפה';
  selectDeliveryByStreet = 'בחירת משפחה לפי רחוב';
  transferDeliveriesFromOtherVolunteer = 'העבר משפחות ממתנדב אחר';
  replanRoute = 'חשב מסלול מחדש';
  isDefinedAsEscortOf = 'מוגדר כמלווה של';
  displayFamiliesOf = 'האם להציג את המשפחות של';
  allBaskets = 'כל הסלים';
  transfer = 'להעביר';
  deliveriesFrom = "משלוחים מ";
  toVolunteer = "למתנדב";
  atThisLocationThereAre = "בנקודה זו יש";
  deliveriesAssignAllOfThem = " משלוחים - לשייך את כולם?";
  thereAreAdditional = "ישנן עוד ";
  deliveriesAtSameAddress = "משלוחים באותה הכתובת, האם לשייך גם אותם?";
  noMatchingDelivery = "לא נמצאה משפחה מתאימה";
  deliveriesAssigned = "משלוחים שוייכו ";
  confirmPassword = 'אישור סיסמה';
  passwordDoesntMatchConfirmPassword = 'הסיסמה אינה תואמת את אישור הסיסמה';
  updateSaved = "העדכון נשמר, תודה";
  volunteerName = "שם";
  nameIsTooShort = 'השם קצר מידי';
  smsDate = 'מועד משלוח SMS';
  helperComment = 'הערה';
  needEscort = 'צריך מלווה';
  assignedDriver = 'נהג משוייך';
  escort = 'מלווה';
  alreadyExist = 'כבר קיים במערכת';
  password = 'סיסמה';
  createDate = 'מועד הוספה';
  remiderSmsDate = 'מועד משלוח תזכורת SMS';
  admin = 'מנהל כלל המערכת';
  responsibleForAssign = 'משייך מתנדבים לרשימת חלוקה';
  notAllowedToUpdateVolunteer = 'אינך רשאי לעדכן עבור מתנדב זה';
  company = "חברה";
  updateInfo = "עדכון פרטים";
  organizationName = 'שם הארגון';
  smsMessageContentCaption = 'תוכן הודעת SMS';
  smsReminderMessageContentCaption = 'תוכן הודעת תזכורת SMS';
  mustIncludeUrlKeyError = " חייב להכיל את המלל !אתר!, אחרת לא ישלח קישור";
  logoUrl = 'לוגו URL';
  deliveryCenterAddress = "כתובת מרכז השילוח";
  successMessageColumnName = 'הודעה למתנדב כאשר נמסר בהצלחה';
  leftByDoorMessageColumnName = 'הודעה למתנדב כאשר הושאר ליד הבית';
  problemCommentColumnName = 'הודעה למתנדב כאשר יש בעיה';
  messageForVolunteerWhenDoneCaption = 'הודעה למתנדב כאשר סיים את כל המשפחות';
  helpName = 'שם חלופי';
  helpPhone = 'טלפון חלופי';
  successButtonSettingName = "מלל כפתור נמסר בהצלחה";
  freeText1ForVolunteer = 'מלל חופשי 1 למתנדב';
  urlFreeText1 = 'כתובת אינטרנט ללחיצה על מלל חופשי 1 למתנדב';
  showText1OnlyWhenDone = 'להציג מלל חופשי 1 רק כאשר המתנדב סיים אל כל הסלים';
  freeText2ForVolunteer = 'מלל חופשי 2 למתנדב';
  urlFreeText2 = 'כתובת אינטרנט ללחיצה על מלל חופשי 2 למתנדב';
  showText2OnlyWhenDone = 'להציג מלל חופשי 2 רק כאשר המתנדב סיים אל כל הסלים';
  enableSelfPickupModule = 'ישנן משפחות שבאות לקחת ממרכז החלוקה';
  showVolunteerCompany = 'שמור מטעם איזה חברה הגיע המתנדב';
  activateEscort = 'הפעל ניהול מלווים לנהגים';
  showHelperComment = 'שמור הערה למתנדב';
  filterFamilyGroups = 'סינון קבוצת משפחה';
  filterCity = 'סינון עיר';
  filterRegion = 'סינון אזור';
  filterBasketType = 'סינון סוג סל';
  selectNumberOfFamilies = 'בחירת מספר משפחות';
  showLeftByHouseButton = 'הצג למתנדב כפתור השארתי ליד הבית';
  redTitleBar = "כותרת דף בצבע אדום";
  defaultPhonePrefixForExcelImport = "קידומת טלפון ברירת מחדל בקליטה מאקסל";
  checkIfFamilyExistsInDb = "בדוק אם משפחה כבר קיימת במאגר הנתונים";
  checkIfFamilyExistsInFile = "בדוק אם משפחה כבר קיימת בקובץ האקסל";
  excelImportAutoAddValues = "הוסף בלי לשאול ערכים לטבלאות התשתית";
  checkDuplicatePhones = "בדוק טלפונים כפולים";
  defaultStatusType = 'סטטוס משלוח ברירת מחדל למשפחות חדשות';
  boxes1NameCaption = "שם כמות 1 בסוגי סלים";
  boxes2NameCaption = "שם כמות 2 בסוגי סלים";
  assignerOrOrg = "הטלפון ממנו יצא הSMS";
  familyHelpPhone = "איש קשר לבירור כפי שמוגדר למשפחה";
  familySourcePhone = "טלפון גורם מפנה";
  otherPhone = "טלפון אחר";
  RemovedFromListExcelImportStrategy_displayAsError = 'הצג כשגיאה';
  RemovedFromListExcelImportStrategy_showInUpdate = 'הצג במשפחות לעדכון';
  RemovedFromListExcelImportStrategy_ignore = 'התעלם והוסף משפחה חדשה';
  existsInRemovedFromListStrategy = 'מה לעשות אם נמצאה משפחה תואמת המסומנת כהוצא מהרשימות';
  organizationInfo = 'פרטי הארגון';
  defaultHelpPhone = 'הטלפון ממנו יצא הSMS';
  defaulyHelpPhoneExplanation = 'כאשר נשלחת הודעת SMS למתנדב, היא מוצגת כאילו היא יצאה מהטלפון של מי ששייך לו את המשפחות ולחץ על הכפתור שלח SMS. ניתן להגדיר כאן שם חלופי וטלפון חלופי';
  smsTextHelpTitle = 'הודעה זו תשלח למתנדב ממסך שיוך משלוחים - עם הקישור למשפחות להן הוא מתבקש לחלק.';
  replacedByVolunteerName = 'יוחלף בשם המתנדב';
  replcaedBySenderName = 'יוחלף בשם השולח';
  replacedByOrgName = 'יוחלף בשם הארגון';
  deliveriesFor = 'משלוחים עבור';
  archiveCurrentDelivery = 'העבר משלוח נוכחי לארכיב?';
  familySelfPickup = 'יבואו לקחת את המשלוח ואינם צריכים משלוח?';
  newDeliveryFor = 'משלוח חדש ל';
  familyAlreadyHasAnActiveDelivery = "למשפחה זו כבר קיים משלוח מאותו סוג האם להוסיף עוד אחד?";
  notOk = 'לא תקין';
  deliveryCreatedSuccesfully = "משלוח נוצר בהצלחה";
  familyWasNotFound = "משפחה לא נמצאה";
  gpsLocationNear = 'נקודת GPS ליד';
  familyIdInHagaiApp = 'id של המשפחה באפליקצית חגי';
  familyName = "שם";
  socialSecurityNumber = 'מספר זהות';
  spouceSocialSecurityNumber = 'מספר זהות בן/בת הזוג';
  familyMembers = 'מספר נפשות';
  birthDate = 'תאריך לידה';
  nextBirthDay = 'יומולדת הבא';
  age = 'גיל';
  defaultBasketType = 'סוג סל ברירת מחדל';
  defaultQuantity = 'מספר סלים ברירת מחדל';
  familySource = 'גורם מפנה';
  familyHelpContact = 'איש קשר לבירור פרטים (עו"ס)';
  familyHelpPhone1 = 'עו"ס טלפון 1';
  familyHelpPhone2 = 'עו"ס טלפון 2';
  specialAsignment = 'שיוך מיוחד';
  defaultSelfPickup = 'באים לקחת ברירת מחדל';
  familyUniqueId = 'מזהה חד ערכי למשפחה';
  internalComment = 'הערה פנימית - לא תופיע למתנדב';
  cityAutomaticallyUpdatedByGoogle = "עיר (מתעדכן אוטומטית)";
  addressComment = 'הנחיות נוספות לכתובת';
  postalCode = 'מיקוד';
  commentForVolunteer = 'הערה שתופיע למתנדב';
  phone1 = "טלפון 1";
  phone1Description = 'הערות לטלפון 1';
  phone2 = "טלפון 2";
  phone2Description = 'הערות לטלפון 2';
  phone3 = "טלפון 3";
  phone3Description = 'הערות לטלפון 3';
  phone4 = "טלפון 4";
  phone4Description = 'הערות לטלפון 4';
  statusChangeDate = 'סטטוס: תאריך שינוי';
  statusChangeUser = 'סטטוס: מי עדכן';
  defaultVolunteer = "מתנדב ברירת מחדל";
  previousDeliveryStatus = 'סטטוס משלוח קודם';
  previousDeliveryDate = 'תאריך משלוח קודם';
  previousDeliveryNotes = 'הערת משלוח קודם';
  addressByGoogle = "כתובת כפי שגוגל הבין";
  addressOk = 'כתובת תקינה';
  previousDeliverySummary = 'סיכום משלוח קודם';
  createUser = 'משתמש מוסיף';
  lastUpdateDate = 'מועד עדכון אחרון';
  lastUpdateUser = 'משתמש מעדכן';
  within = 'תוך';
  forFamily = 'למשפחת';
  by = 'על ידי';
  theFamily = 'משפחת';
  wasUpdatedTo = 'עודכנה ל';
  wasAssignedTo = 'שוייכה ל';
  assignmentCanceledFor = 'בוטל השיוך למשפחת';
  invalidPhoneNumber = 'מספר טלפון אינו תקין';
  valueAlreadyExistsFor = 'ערך כבר קיים למשפחת';
  atAddress = 'בכתובת';
  familyGroup = 'קבוצות שיוך משפחה';
  identicalSocialSecurityNumber = 'מספר זהות זהה';
  sameAddress = 'כתובת זהה';
  identicalPhone = ' מספר טלפון זהה';
  similarName = " שם דומה";
  statusSummary = "סיכום סטטוס";
  onTheWay = "בדרך";
  unAsigned = "טרם שוייכו";
  delivered = "נמסר";
  problem = "בעייה";
  quantity = 'מספר סלים';
  volunteer = "מתנדב";
  commentsWritteByVolunteer = 'הערות שכתב המתנדב כשמסר';
  deliveryStatusDate = 'מתי';
  courierAsignUser = 'מי שייכה למתנדב';
  courierAsignDate = 'מועד שיוך למתנדב';
  deliveryCreateDate = 'מועד הקצאה';
  deliveryCreateUser = 'משתמש מקצה';
  requireFollowUp = 'צריך טיפול/מעקב';
  requireFollowUpUpdateUser = 'צריך טיפול - מי עדכן';
  requireFollowUpUpdateDate = 'צריך טיפול - מתי עודכן';
  deliveryDetailsFor = 'פרטי משלוח עבור';
  remainingByBaskets = 'נותרו לפי סלים';
  byBaskets = 'לפי סלים';
  deliveredByBaskets = 'נמסרו לפי סלים';
  remainingByCities = 'נותרו לפי ערים';
  remainingByGroups = 'נותרו לפי קבוצות';
  deliveries = 'משלוחים';
  empty = 'ריק';
  allOthers = 'כל השאר';
  total = 'סה"כ';
  deliverySummary = 'סיכום משלוח';
  families = 'משפחות';
  exportToExcel = 'יצוא לאקסל';
  newDelivery = 'משלוח חדש';
  cancelAssignmentFor = "האם לבטל שיוך מתנדב ל";
  familyDeliveries = 'משלוחים למשפחה';
  freezeDelivery = 'הקפא משלוח';
  freezeDeliveryHelp = `משלוח "קפוא" הינו הינו משלוח אשר לא ישוייך לאף מתנדב עד שאותו המשלוח "יופשר". הקפאה משמשת לעצירה זמנית של משלוחים מסויימים עד לשלב בו אפשר להפשיר אותם ולשלוח. האם להקפיא את המשלוח ל`;
  unFreezeDelivery = 'הפשר משלוח';
  deleteDelivery = 'מחק משלוח';
  shouldDeleteDeliveryFor = "האם למחוק את המשלוח ל";
  archiveDelivery = 'העבר לארכיון';
  shouldArchiveDelivery = "האם להעביר את המשלוח לארכיון?";
  deliveriesUpdated = 'משלוחים עודכנו';
  showAll = 'הצג הכל';
  searchFamily = 'חיפוש משפחה';
  newFamily = 'משפחה חדשה';
  googleApiProblem = 'מה הבעיה של גוגל';
  mergeFamilies = 'מיזוג משפחות';
  familyDetails = 'פרטי משפחה';
  googleSearchAddress = 'חפש כתובת בגוגל';
  familiesUpdated = 'משפחות עודכנו';
  byGroups = 'לפי קבוצות';
  adderssProblems = 'כתובות בעיתיות';
  activeFamilies = 'פעילות';
  allFamilies = 'כל המשפחות';
  lastName = 'שם משפחה';
  firstName = 'שם פרטי';
  streetName = 'רחוב';
  houseNumber = 'מספר בית';
  familyComponentVideos = 'לסרטוני הדרכה על מסך משפחות, לחצו כאן';
  close = 'סגור';
  questionsAndAnswers = 'שאלות ותשובות';
  dialTo = 'חייג ל';
  forHelp = 'לקבלת עזרה';
  dialForHelp = 'חייג לקבלת עזרה';
  cancel = 'בטל';
  updateDeliveryFailure = 'עדכן אי מסירה';
  all = 'כולם';
  searchVolunteer = 'חיפוש מתנדב';
  sendSmsToAllVolunteersThatDidntGetOne = 'שלח הודעת SMS למתנדבים שטרם קיבלו';
  completed = 'הושלמו';
  notDelivered = 'לא נמסרו';
  left = 'יצא';
  smsNotSent = 'טרם נשלח SMS';
  volunteers = 'מתנדבים';
  selectDeliveriesOnMap = 'בחר משפחות על המפה';
  drawingHelpText = 'אנא לחץ על המפה במספר נקודות כדי לסמן את האזור הרצוי, ולחץ לחיצה כפולה לסיום';
  selectedDeliveries = 'משלוחים סומנו';
  showVolunteers = 'הצג מתנדבים';
  addressesWithMoreThanOneFamily = 'כתובות עם יותר ממשפחה אחת';
  showFamilies = 'הצג משפחות';
  recentlyAssigned = 'שוייכו עכשיו';
  addVolunteer = 'הוסף מתנדב/מנהל';
  selectExcelFile = 'בחר קובץ אקסל';
  excelImportVideo = 'לסרטון הדרכה על קליטה מאקסל לחץ כאן';
  mapExcelColumns = 'הגדרת העמודות';
  loadExcelSettings = 'טען הגדרות';
  deleteExcelSettings = 'מחק הגדרות';
  nextStep = 'המשך לשלב הבא';
  addColumnsThatAreNotInTheFile = 'הוספת עמודות שלא מופיעות באקסל';
  excelColumnIgnore = 'לא לקלוט';
  remove = 'הסר';
  addExcelColumn ='הוסף עמודה';
  columnSelectionInFile = 'בחירת עמודות בקובץ';
  excelSheet = 'גליון';
  linesInExcel = 'שורות באקסל';
  excelImportFinalSettings = 'הגדרות אחרונות';
  executeExcelImport = 'ביצוע הקליטה';
  excelImportResults = 'תוצאות';
  errors = 'שגיאות';
  excelCompareToThisFamilyAnd = 'השווה מול משפחה זו ו';
  moveToUpdateFamilies = 'העבר למשפחות עדכון';
  excelNoneOfTheseFamiliesMatch = ' אף אחת מהמשפחות הללו אינה מתאימה לשורה באקסל, ';
  moveToNewFamilies = 'העבר למשפחות חדשות';
  readExcelRow = 'קלוט את שורה';
  excelReadLineAnyhow = 'בכל זאת';
  previous = 'קודם';
  next = 'הבא';
  stopAskingForConfirmation = 'הפסק לשאול האם מסכים לפני כל דבר';
  familiesForUpdate = 'משפחות לעדכון';
  removeFromFamiliesToUpdate = 'הסר ממשפחות לעדכן';
  newFamilies = 'משפחות חדשות';
  addAllFamilies = 'הוסף את כל המשפחות';
  existingFamilies = 'משפחות קיימות';
  saveExcelImportReport = 'שמור דוח מצב קליטה מאקסל';
  saveExcelSettings = 'שמור הגדרות';
  newVolunteers ='מתנדבים חדשים';
  addAllVolunteers = 'הוסף את כל המתנדבים';
  updateVolunteers = 'מתנדבים לעדכון';
  existingVolunteers = 'מתנדבים קיימים';
  moveToNewVolunteers = 'העבר למתנדבים להוספה';
  pleaseWaitVerifyingDetails = 'אנא המתן - מוודא פרטים';
  replaceBySiteUrl = 'יוחלף בכתובת האתר';
  sampleMessage = 'הודעה לדוגמא';
  reminderSmsTextHelp ='הודעה זו תשלח למתנדב שמתעכב ממסך מעקב מתנדבים';
  sampleReminderSms = 'הודעת תזכורת לדוגמא';
  basketTypes = 'סוגי סלים';
  distributionLists = 'רשימות חלוקה';
  familySources = 'גורמים מפנים';
  distributionListsHelp = 'קבוצות אלו יוצגו בשיוך משפחות ויאפשרו סינון מהיר';
  volunteerTexts = 'הודעות למתנדב';
  volunteerQAndA = 'שאלות ותשובות למתנדב';
  volunteerQAndAHelp = 'כאשר המתנדב לוחץ על הכפתור "נתקלתי בבעיה" מופע לו מסך עם רשימה זו של שאלות ותשובות לעזרה';
  question = 'שאלה';
  answer = 'תשובה';
  voluntreeHelpPhones  ='טלפונים לעזרה למתנדב';
  volunteerHelpPhonesHelpLine1  ='כאשר המתנדב לוחץ על הכפתור "נתקלתי בבעיה" מופע לו מסך אם אפשרות להתקשר לעזרה או לעדכן שלא מסר.';
  volunteerHelpPhonesHelpLine2 = 'כאן ניתן לעדכן אילו טלפונים יופיעו לו לעזרה, אפשר לעדכן אחד או יותר.';
  preferences = 'העדפות';
  logoAndIcons = 'לוגו וצלמיות';
  logoRecommendTool='אנו ממליצים ליצור את האייקונים בעזרת';
  logoRecommendAfter = 'ומהתוצאה שהוא יוצר להשתמש favicon.ico עבור האייקון - וב apple-icon-120x120.png עבור הלוגו';
}

export var use = { language: new Language() };
// for (const key in lang) {
//   if (lang.hasOwnProperty(key)) {
//     const element = lang[key];
//     lang[key] = 'T' + element;

//   }
// }