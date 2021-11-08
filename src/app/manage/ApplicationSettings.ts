import { BackendMethod, Allowed, EntityBase, FieldRef, FieldMetadata, Allow, isBackend } from 'remult';
import { DataControl } from '@remult/angular';
export function CustomColumn(info: () => customColumnInfo, includeInApi?: Allowed) {
  return (target, key) => {
    DataControl({
      valueList: () => info().values?.map(x => ({ id: x, caption: x })),
      visible: () => info().visible
    })(target, key);
    return Field({
      includeInApi: includeInApi
    }, (options) => options.caption = info().caption)(target, key);
  };
}

import { GeocodeInformation, GetGeoInformation, AddressHelper } from "../shared/googleApiHelpers";
import { Entity, Remult } from 'remult';
import { logChanges } from "../model-shared/types";
import { Phone } from "../model-shared/phone";
import { Roles } from "../auth/roles";
import { DeliveryStatus } from "../families/DeliveryStatus";
import { translationConfig, Language, use, TranslationOptions, Field, FieldType, IntegerField, langByCode } from "../translate";

import { FamilySources } from "../families/FamilySources";
import { Injectable, Self } from '@angular/core';

import { BasketType } from '../families/BasketType';
import { HttpClient } from '@angular/common/http';
import { Sites, getLang, setLangForSite } from '../sites/sites';
import { routeStrategy } from '../asign-family/route-strategy';

import { ValueListFieldType } from 'remult/src/remult3';
import { GroupsValue } from './groups';
import { InputTypes } from 'remult/inputTypes';



@ValueListFieldType(RemovedFromListExcelImportStrategy)
export class RemovedFromListExcelImportStrategy {
  static displayAsError = new RemovedFromListExcelImportStrategy(0, 'הצג כשגיאה');
  static showInUpdate = new RemovedFromListExcelImportStrategy(1, 'הצג במשפחות לעדכון');
  static ignore = new RemovedFromListExcelImportStrategy(2, 'התעלם והוסף משפחה חדשה');
  constructor(public id: number, public caption: string) { }
}




@Entity<ApplicationSettings>('ApplicationSettings', {
  allowApiRead: true,
  allowApiUpdate: Roles.admin,
  saving: async (self) => {

    if (isBackend()) {
      if (self.$.smsPasswordInput.valueChanged()) {
        if (self.smsPasswordInput)
          self.smsCredentials = {
            password: self.smsPasswordInput
          }
        else {

          self.smsCredentials = {
            password: ""
          };
        }
      }
      await self.addressHelper.updateApiResultIfChanged();

      for (const l of [self.$.message1Link, self.$.message2Link]) {
        if (l.value) {
          if (l.value.trim().indexOf(':') < 0)
            l.value = 'http://' + l.value.trim();
        }
      }
      if (self.helpPhone)
        self.helpPhone = new Phone(Phone.fixPhoneInput(self.helpPhone.thePhone, self.remult));
      if (self.forWho)
        setLangForSite(Sites.getValidSchemaFromContext(self.remult), self.forWho);
      setSettingsForSite(Sites.getValidSchemaFromContext(self.remult), self);
      logChanges(self._, self.remult, { excludeColumns: [self.$.currentUserIsValidForAppLoadTest, self.$.smsCredentials, self.$.smsPasswordInput] });
    }
  },
  saved: (self) => {
    if (!isBackend())
      self.updateStaticTexts();
  }
})
export class ApplicationSettings extends EntityBase {
  updateStaticTexts() {
    BasketType.boxes1Name = this.boxes1Name;
    BasketType.boxes2Name = this.boxes2Name;
    DeliveryStatus.FailedBadAddress.caption = this.AddressProblemStatusText;
    DeliveryStatus.FailedNotHome.caption = this.NotHomeProblemStatusText;
    DeliveryStatus.FailedDoNotWant.caption = this.DoNotWantProblemStatusText;
    DeliveryStatus.FailedOther.caption = this.OtherProblemStatusText;

    setCustomColumnInfo(customColumnInfo[1], this.familyCustom1Caption, this.familyCustom1Values);
    setCustomColumnInfo(customColumnInfo[2], this.familyCustom2Caption, this.familyCustom2Values);
    setCustomColumnInfo(customColumnInfo[3], this.familyCustom3Caption, this.familyCustom3Values);
    setCustomColumnInfo(customColumnInfo[4], this.familyCustom4Caption, this.familyCustom4Values);
    setCustomColumnInfo(questionForVolunteers[1], this.questionForVolunteer1Caption, this.questionForVolunteer1Values);
    setCustomColumnInfo(questionForVolunteers[2], this.questionForVolunteer2Caption, this.questionForVolunteer2Values);
    setCustomColumnInfo(questionForVolunteers[3], this.questionForVolunteer3Caption, this.questionForVolunteer3Values);
    setCustomColumnInfo(questionForVolunteers[4], this.questionForVolunteer4Caption, this.questionForVolunteer4Values);
    setCustomColumnInfo(registerQuestionForVolunteers[1], this.questionForRegistration1Caption, this.questionForRegistration1Values);
    setCustomColumnInfo(registerQuestionForVolunteers[2], this.questionForRegistration2Caption, this.questionForRegistration2Values);
    setCustomColumnInfo(registerQuestionForVolunteers[3], this.questionForRegistration3Caption, this.questionForRegistration3Values);
    setCustomColumnInfo(registerQuestionForVolunteers[4], this.questionForRegistration4Caption, this.questionForRegistration4Values);
  }
  @Field<ApplicationSettings>({
    serverExpression:
      self => (!!self.smsCredentials?.password) && !!self.smsUsername && !!self.smsClientNumber
  })
  bulkSmsEnabled: boolean;



  getInternationalPhonePrefix() {
    let r = this.forWho.args.internationalPrefixForSmsAndAws;
    if (!r)
      r = '+972';
    return r;
  }
  googleMapCountry() {
    let r = this.forWho.args.googleMapCountry;
    if (!r)
      r = 'IL';
    return r;
  }


  @BackendMethod({ allowed: Allow.authenticated })
  static async getPhoneOptions(deliveryId: string, remult?: Remult) {
    let ActiveFamilyDeliveries = await (await import('../families/FamilyDeliveries')).ActiveFamilyDeliveries;
    let d = await remult.repo(ActiveFamilyDeliveries).findFirst({ id: deliveryId, $and: [ActiveFamilyDeliveries.isAllowedForUser()] });
    if (!d)
      return [];
    let Families = await (await import('../families/families')).Families;
    let family = await remult.repo(Families).findId(d.family);
    let r: phoneOption[] = [];
    let settings = await ApplicationSettings.getAsync(remult);
    for (const x of settings.getPhoneStrategy()) {
      if (x.option) {
        await x.option.build({
          family: family,
          d: d,
          remult,

          phoneItem: x,
          settings,
          addPhone: (name, phone) => r.push({ name: name, phone: phone })
        });
      }
    }
    return r;
  }
  showVideo() {
    return this.lang.languageCode == 'iw' && !this.isSytemForMlt();
  }

  @IntegerField()
  id: number;
  @Field()
  organisationName: string;


  @Field({
    translation: l => l.smsMessageContentCaption, validate: validateSmsContent
  })
  smsText: string;
  @Field({
    translation: l => l.smsReminderMessageContentCaption,
    validate: validateSmsContent
  })
  reminderSmsText: string;

  @Field({ includeInApi: Roles.admin })
  confirmEventParticipationMessage: string = '';

  @Field({
    translation: l => l.emailDonorContentCaption,
    validate: validateSmsContent
  })
  registerFamilyReplyEmailText: string;
  @Field({
    translation: l => l.emailHelperContentCaption,
    validate: validateSmsContent
  })
  registerHelperReplyEmailText: string;
  @Field({ caption: "gMail UserName", includeInApi: Roles.admin })
  gmailUserName: string;
  @Field({ caption: "gMail password", includeInApi: Roles.admin })
  gmailPassword: string;
  @Field()
  logoUrl: string;
  @Field()
  addressApiResult: string;
  @Field({ translation: l => l.deliveryCenterAddress })
  address: string;
  addressHelper = new AddressHelper(this.remult, () => this.$.address, () => this.$.addressApiResult);
  @Field({ translation: l => l.successMessageColumnName })
  commentForSuccessDelivery: string;
  @Field({ translation: l => l.leftByDoorMessageColumnName })
  commentForSuccessLeft: string;
  @Field({ translation: l => l.problemCommentColumnName })
  commentForProblem: string;
  @Field({ translation: l => l.messageForVolunteerWhenDoneCaption })
  messageForDoneDelivery: string;
  @Field({ translation: l => l.helpName })
  helpText: string;
  @Field()
  helpPhone: Phone;
  @Field()
  phoneStrategy: string;

  getPhoneStrategy(): PhoneItem[] {
    try {
      return JSON.parse(this.phoneStrategy).map(x => {
        return {
          name: x.name,
          phone: x.phone,
          option: PhoneOption[x.option]
        };
      });
    }
    catch
    {
      return [{ option: PhoneOption.assignerOrOrg }];
    }
  }
  getQuestions(): qaItem[] {
    try {
      return JSON.parse(this.commonQuestions);
    }
    catch
    {
      return [];
    }
  }
  @Field()
  commonQuestions: string;
  @IntegerField({ allowApiUpdate: false })
  dataStructureVersion: number;
  @Field({ translation: l => l.successButtonSettingName })
  deliveredButtonText: string;
  @Field({ translation: l => l.problemButtonSettingName })
  problemButtonText: string;
  @Field()
  AddressProblemStatusText: string;
  @Field()
  NotHomeProblemStatusText: string;
  @Field()
  DoNotWantProblemStatusText: string;
  @Field()
  OtherProblemStatusText: string;

  @Field({ translation: l => l.freeText1ForVolunteer })
  message1Text: string;
  @Field({ translation: l => l.urlFreeText1 })
  message1Link: string;
  @Field({ translation: l => l.showText1OnlyWhenDone })
  message1OnlyWhenDone: boolean;
  @Field({ translation: l => l.freeText2ForVolunteer })
  message2Text: string;
  @Field({ translation: l => l.urlFreeText2 })
  message2Link: string;
  @Field({ translation: l => l.showText2OnlyWhenDone })
  message2OnlyWhenDone: boolean;
  @Field()
  forWho: TranslationOptions = TranslationOptions.Families;
  get lang() { return langByCode(this.forWho.args.languageFile); }
  @Field({ dbName: 'forSoldiers' })
  _old_for_soliders: boolean;
  @Field({ translation: l => l.enableSelfPickupModule })
  usingSelfPickupModule: boolean;

  isSytemForMlt() {
    return this.forWho == TranslationOptions.donors;
  }

  @Field({ translation: l => l.showVolunteerCompany })
  showCompanies: boolean;
  @Field({ translation: l => l.activateEscort })
  manageEscorts: boolean;
  @Field()
  showHelperComment: boolean;
  @Field({ translation: l => l.filterFamilyGroups })
  showGroupsOnAssing: boolean;
  @Field({ translation: l => l.filterCity })
  showCityOnAssing: boolean;
  @Field({ translation: l => l.filterRegion })
  showAreaOnAssing: boolean;
  @Field({ translation: l => l.filterBasketType })
  showBasketOnAssing: boolean;
  @Field({ translation: l => l.selectNumberOfFamilies })
  showNumOfBoxesOnAssing: boolean;
  @Field({ translation: l => l.showLeftByHouseButton })
  showLeftThereButton: boolean;
  @Field()
  redTitleBar: boolean;
  @Field({ translation: l => l.defaultPhonePrefixForExcelImport })
  defaultPrefixForExcelImport: string;
  @Field()
  checkIfFamilyExistsInDb: boolean;
  @Field({ translation: l => l.existsInRemovedFromListStrategy })
  removedFromListStrategy: RemovedFromListExcelImportStrategy;
  @Field()
  checkIfFamilyExistsInFile: boolean;
  @Field()
  excelImportAutoAddValues: boolean;
  @Field()
  excelImportUpdateFamilyDefaultsBasedOnCurrentDelivery: boolean;
  @Field()
  checkDuplicatePhones: boolean;
  @Field()
  volunteerCanUpdateComment: boolean;
  @Field()
  volunteerCanUpdateDeliveryComment: boolean;
  @Field()
  hideFamilyPhoneFromVolunteer: boolean;

  static serverHasPhoneProxy = false;
  @Field({ allowApiUpdate: false })
  usePhoneProxy: boolean;
  @Field()
  showOnlyLastNamePartToVolunteer: boolean;
  @Field()
  showTzToVolunteer: boolean;
  @Field({ allowApiUpdate: false })
  allowSendSuccessMessageOption: boolean;
  @Field()
  sendSuccessMessageToFamily: boolean;
  @Field()
  successMessageText: string;
  @Field()
  requireEULA: boolean;
  @Field()
  requireConfidentialityApprove: boolean;
  @Field()
  requireComplexPassword: boolean;
  @IntegerField()
  timeToDisconnect: number;
  @IntegerField()
  daysToForcePasswordChange: number;
  @Field()
  showDeliverySummaryToVolunteerOnFirstSignIn: boolean;
  @Field()
  showDistCenterAsEndAddressForVolunteer: boolean;
  @Field()
  routeStrategy: routeStrategy;
  @IntegerField({ translation: l => l.maxDeliveriesBeforeBusy })
  BusyHelperAllowedFreq_nom: number;
  @IntegerField({ translation: l => l.daysCountForBusy })
  BusyHelperAllowedFreq_denom: number;
  @IntegerField()
  MaxItemsQuantityInDeliveryThatAnIndependentVolunteerCanSee: number;
  @IntegerField()
  MaxDeliverisQuantityThatAnIndependentVolunteerCanAssignHimself: number;
  @Field()
  donotShowEventsInGeneralList: boolean;

  @Field({
    translation: l => l.defaultStatusType
  })
  @DataControl({
    valueList: [DeliveryStatus.ReadyForDelivery, DeliveryStatus.SelfPickup]
  })
  defaultStatusType: DeliveryStatus;


  @Field({ translation: l => l.boxes1NameCaption })
  boxes1Name: string;
  @Field({ translation: l => l.boxes2NameCaption })
  boxes2Name: string;
  @Field({ translation: l => l.customColumn + " 1 " + l.caption, includeInApi: Roles.admin })
  familyCustom1Caption: string;
  @Field({ translation: l => l.customColumn + " 1 " + l.optionalValues, includeInApi: Roles.admin })
  familyCustom1Values: string;
  @Field({ translation: l => l.customColumn + " 2 " + l.caption, includeInApi: Roles.admin })
  familyCustom2Caption: string;
  @Field({ translation: l => l.customColumn + " 2 " + l.optionalValues, includeInApi: Roles.admin })
  familyCustom2Values: string;
  @Field({ translation: l => l.customColumn + " 3 " + l.caption, includeInApi: Roles.admin })
  familyCustom3Caption: string;
  @Field({ translation: l => l.customColumn + " 3 " + l.optionalValues, includeInApi: Roles.admin })
  familyCustom3Values: string;
  @Field({ translation: l => l.customColumn + " 4 " + l.caption, includeInApi: Roles.admin })
  familyCustom4Caption: string;
  @Field({ translation: l => l.customColumn + " 4 " + l.optionalValues, includeInApi: Roles.admin })
  familyCustom4Values: string;
  @Field<ApplicationSettings>({ serverExpression: (self) => self.remult.authenticated() })
  currentUserIsValidForAppLoadTest: boolean;
  @Field({ translation: l => l.questionForVolunteer + " 1 " + l.caption })
  questionForVolunteer1Caption: string;
  @Field({ translation: l => l.questionForVolunteer + " 1 " + l.optionalValues })
  questionForVolunteer1Values: string;
  @Field({ translation: l => l.questionForVolunteer + " 2 " + l.caption })
  questionForVolunteer2Caption: string;
  @Field({ translation: l => l.questionForVolunteer + " 2 " + l.optionalValues })
  questionForVolunteer2Values: string;
  @Field({ translation: l => l.questionForVolunteer + " 3 " + l.caption })
  questionForVolunteer3Caption: string;
  @Field({ translation: l => l.questionForVolunteer + " 3 " + l.optionalValues })
  questionForVolunteer3Values: string;
  @Field({ translation: l => l.questionForVolunteer + " 4 " + l.caption })
  questionForVolunteer4Caption: string;
  @Field({ translation: l => l.questionForVolunteer + " 4 " + l.optionalValues })
  questionForVolunteer4Values: string;

  @Field({ translation: l => l.questionForRegistration + " 1 " + l.caption })
  questionForRegistration1Caption: string;
  @Field({ translation: l => l.questionForRegistration + " 1 " + l.optionalValues })
  questionForRegistration1Values: string;
  @Field({ translation: l => l.questionForRegistration + " 2 " + l.caption })
  questionForRegistration2Caption: string;
  @Field({ translation: l => l.questionForRegistration + " 2 " + l.optionalValues })
  questionForRegistration2Values: string;
  @Field({ translation: l => l.questionForRegistration + " 3 " + l.caption })
  questionForRegistration3Caption: string;
  @Field({ translation: l => l.questionForRegistration + " 3 " + l.optionalValues })
  questionForRegistration3Values: string;
  @Field({ translation: l => l.questionForRegistration + " 4 " + l.caption })
  questionForRegistration4Caption: string;
  @Field({ translation: l => l.questionForRegistration + " 4 " + l.optionalValues })
  questionForRegistration4Values: string;

  @Field()
  registerAskTz: boolean;
  @Field()
  registerAskEmail: boolean;
  @Field()
  registerAskPreferredDistributionAreaAddress: boolean;
  @Field()
  registerAskPreferredFinishAddress: boolean;
  @Field()
  askVolunteerForLocationOnDelivery: boolean;
  @Field()
  askVolunteerForAPhotoToHelp: boolean;
  @Field()
  questionForVolunteerWhenUploadingPhoto: string;
  @Field({ includeInApi: Roles.admin })
  createBasketsForAllFamiliesInCreateEvent: boolean;
  @Field({ includeInApi: Roles.admin })
  includeGroupsInCreateEvent: GroupsValue;
  @Field({ includeInApi: Roles.admin })
  excludeGroupsInCreateEvent: GroupsValue;

  @Field({ includeInApi: false, allowNull: true })
  smsCredentials?: {
    password: string
  }
  @Field({ includeInApi: Roles.admin })
  smsClientNumber: string;
  @Field({ includeInApi: Roles.admin })
  smsUsername: string;
  @Field<ApplicationSettings>({ includeInApi: Roles.admin, inputType: InputTypes.password, serverExpression: (self) => self.smsCredentials?.password ? "****" : '' })
  smsPasswordInput: string;
  @Field({ includeInApi: Roles.admin })
  smsVirtualPhoneNumber: string;

  @Field({})
  familySelfOrderEnabled: boolean;
  @Field()
  familySelfOrderMessage: string;




  constructor(private remult: Remult) {
    super()
  }

  static get(remult: Remult) {

    return getSettings(remult);

  }
  static async getAsync(remult: Remult): Promise<ApplicationSettings> {
    return (await remult.repo(ApplicationSettings).findFirst());
  }
  setDefaultsForProblemStatuses() {
    this.problemButtonText = this.lang.ranIntoAProblem;
    this.AddressProblemStatusText = this.lang.notDeliveredBadAddress;
    this.NotHomeProblemStatusText = this.lang.notDeliveredNotHome;
    this.DoNotWantProblemStatusText = this.lang.notDeliveredDontWant;
    this.OtherProblemStatusText = this.lang.notDeliveredOther;
  }
}
export class PhoneOption {

  static assignerOrOrg = new PhoneOption("assignerOrOrg", "הטלפון ממנו יצא הSMS", async args => {
    if (args.d.distributionCenter?.phone1?.thePhone) {
      args.addPhone(args.d.distributionCenter.phone1Description, args.d.distributionCenter.phone1.displayValue);
      if (args.d.distributionCenter.phone2)
        args.addPhone(args.d.distributionCenter.phone2Description, args.d.distributionCenter.phone2.displayValue);
    }
    else if (args.settings.helpText) {
      args.addPhone(args.settings.helpText, args.settings.$.helpPhone.displayValue);
    }
    else {
      let h = args.d.courierAssignUser;
      args.addPhone(h.name, h.phone.displayValue);
    }
  });
  static familyHelpPhone = new PhoneOption("familyHelpPhone", "איש קשר לבירור כפי שמוגדר למשפחה", async args => {
    if (args.family.socialWorker && args.family.socialWorkerPhone1) {
      args.addPhone(args.family.socialWorker, args.family.socialWorkerPhone1.displayValue);
    }
    if (args.family.socialWorker && args.family.socialWorkerPhone2) {
      args.addPhone(args.family.socialWorker, args.family.socialWorkerPhone2.displayValue);
    }
  });
  static defaultVolunteer = new PhoneOption("defaultVolunteer", use ? use.language.defaultVolunteer : '', async args => {
    if (args.family.fixedCourier && args.d.courier != args.family.fixedCourier) {
      let h = await args.family.fixedCourier;
      args.addPhone(getLang(args.remult).defaultVolunteer + ": " + h.name, h.phone.displayValue);
    }
  });


  static familySource = new PhoneOption("familySource", "טלפון גורם מפנה", async args => {
    if (args.family.familySource) {
      let s = args.family.familySource;
      if (s && s.phone) {
        let name = s.contactPerson;
        if (!name || name.length == 0) {
          name = s.name;
        }
        args.addPhone(name, s.phone.displayValue);
      }
    }
  });
  static otherPhone = new PhoneOption("otherPhone", "טלפון אחר", async args => {
    if (args.phoneItem.phone) {
      args.addPhone(args.phoneItem.name, Phone.formatPhone(args.phoneItem.phone));
    }
  });
  constructor(public key: string, public name: string, public build: ((args: phoneBuildArgs) => Promise<void>)) {

  }
}
export interface PhoneItem {
  option: PhoneOption;
  name?: string;
  phone?: string;
}
export interface phoneOption {
  name: string;
  phone: string;
}
export interface qaItem {
  question?: string;
  answer?: string;
}
export interface phoneBuildArgs {
  family: import('../families/families').Families,
  d: import('../families/FamilyDeliveries').FamilyDeliveries,
  remult: Remult,
  phoneItem: PhoneItem,
  settings: ApplicationSettings,
  addPhone: (name: string, value: string) => void
}


@Injectable()
export class SettingsService {
  constructor(private remult: Remult, private http: HttpClient) {

  }
  instance: ApplicationSettings;
  async init() {

    this.instance = await ApplicationSettings.getAsync(this.remult);
    setSettingsForSite(Sites.getValidSchemaFromContext(this.remult), this.instance);

    translationConfig.forWho = this.instance.forWho;
    DeliveryStatus.usingSelfPickupModule = this.instance.usingSelfPickupModule;
    (await import('../helpers/helpers')).Helpers.usingCompanyModule = this.instance.showCompanies;

    PhoneOption.assignerOrOrg.name = this.instance.lang.assignerOrOrg;
    PhoneOption.familyHelpPhone.name = this.instance.lang.familyHelpPhone;
    PhoneOption.familySource.name = this.instance.lang.familySourcePhone;
    PhoneOption.otherPhone.name = this.instance.lang.otherPhone;

    RemovedFromListExcelImportStrategy.displayAsError.caption = this.instance.lang.RemovedFromListExcelImportStrategy_displayAsError;
    RemovedFromListExcelImportStrategy.showInUpdate.caption = this.instance.lang.RemovedFromListExcelImportStrategy_showInUpdate;
    RemovedFromListExcelImportStrategy.ignore.caption = this.instance.lang.RemovedFromListExcelImportStrategy_ignore;

    this.instance.updateStaticTexts();



  }

}


export const customColumnInfo: customColumnInfo[] = [{}, {}, {}, {}, {}];
export const questionForVolunteers: customColumnInfo[] = [{}, {}, {}, {}, {}];
export const registerQuestionForVolunteers: customColumnInfo[] = [{}, {}, {}, {}, {}];

export function getCustomColumnVisible(defs: FieldMetadata) {
  return defs.caption != undefined;
}

export function setCustomColumnInfo(v: customColumnInfo, caption: string, values: string) {

  v.visible = !!caption;
  v.caption = caption;
  v.values = undefined;
  if (values) {
    v.values = values.split(',').map(x => x.trim());
  }
}
export const settingsForSite = new Map<string, ApplicationSettings>();
export function setSettingsForSite(site: string, lang: ApplicationSettings) {
  settingsForSite.set(site, lang);
}
export function getSettings(remult: Remult): ApplicationSettings {
  let r = settingsForSite.get(Sites.getValidSchemaFromContext(remult));
  if (r)
    return r;
  //if (context.backend) {
  return new ApplicationSettings(remult);
  throw "can't find application settings on server for this request";

  return ApplicationSettings.get(remult);;
}

interface customColumnInfo {
  caption?: string,
  visible?: boolean,
  values?: string[]

}
export function includePhoneInApi(remult: Remult) {
  var s = getSettings(remult);
  if (!s.hideFamilyPhoneFromVolunteer)
    return true;
  if (remult.isAllowed(Roles.distCenterAdmin))
    return true
  return false;

}
export function validateSmsContent(entity: any, c: FieldRef<string, any>) {
  return;
  if (c.value && c.value.indexOf("!אתר!") < 0 && c.value.indexOf("!URL!") < 0)
    c.error = this.lang.mustIncludeUrlKeyError;
}