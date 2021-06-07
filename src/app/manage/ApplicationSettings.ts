import { ServerFunction, Allowed, EntityBase, EntityField, FieldDefinitions } from '@remult/core';
import { DataControl } from '../../../../radweb/projects/angular';
export function CustomColumn(info: () => customColumnInfo) {
  return (target, key) => {
    DataControl({
      //valueList: info().values,
      //     visible: () => info().visible
    })(target, key);
    return Field({
      //caption: info().caption,
      //    allowApiUpdate: info().role,

    })(target, key);
  };
}

import { GeocodeInformation, GetGeoInformation, AddressHelper } from "../shared/googleApiHelpers";
import { Entity, Context } from '@remult/core';
import { logChanges } from "../model-shared/types";
import { Phone } from "../model-shared/Phone";
import { Roles } from "../auth/roles";
import { DeliveryStatus } from "../families/DeliveryStatus";
import { translationConfig, Language, use, TranslationOptions, Field, FieldType } from "../translate";

import { FamilySources } from "../families/FamilySources";
import { Injectable } from '@angular/core';

import { BasketType } from '../families/BasketType';
import { HttpClient } from '@angular/common/http';
import { Sites, getLang, setLangForSite } from '../sites/sites';
import { routeStrategy } from '../asign-family/route-strategy';
import { ValueListValueConverter } from '../../../../radweb/projects/core/src/column';
import { ValueListFieldType } from '../../../../radweb/projects/core/src/remult3';


@ValueListFieldType(RemovedFromListExcelImportStrategy)
export class RemovedFromListExcelImportStrategy {
  static displayAsError = new RemovedFromListExcelImportStrategy(0, 'הצג כשגיאה');
  static showInUpdate = new RemovedFromListExcelImportStrategy(1, 'הצג במשפחות לעדכון');
  static ignore = new RemovedFromListExcelImportStrategy(2, 'התעלם והוסף משפחה חדשה');
  constructor(public id: number, public caption: string) { }
}




@Entity<ApplicationSettings>({
  key: 'ApplicationSettings',
  allowApiRead: true,
  allowApiUpdate: Roles.admin,
  saving: async (self) => {

    if (self.context.onServer) {

      await self.addressHelper.updateApiResultIfChanged();

      for (const l of [self.$.message1Link, self.$.message2Link]) {
        if (l.value) {
          if (l.value.trim().indexOf(':') < 0)
            l.value = 'http://' + l.value.trim();
        }
      }
      if (self.helpPhone)
        self.helpPhone = new Phone(Phone.fixPhoneInput(self.helpPhone.thePhone, self.context));
      if (self.forWho)
        setLangForSite(Sites.getValidSchemaFromContext(self.context), self.forWho);
      setSettingsForSite(Sites.getValidSchemaFromContext(self.context), self);
      logChanges(self._, self.context, { excludeColumns: [self.$.currentUserIsValidForAppLoadTest] });
    }
  }
})
export class ApplicationSettings extends EntityBase {

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

  lang = getLang(this.context);
  @ServerFunction({ allowed: c => c.isSignedIn() })
  static async getPhoneOptions(deliveryId: string, context?: Context) {
    let ActiveFamilyDeliveries = await (await import('../families/FamilyDeliveries')).ActiveFamilyDeliveries;
    let d = await context.for(ActiveFamilyDeliveries).findFirst(fd => fd.id.isEqualTo(deliveryId).and(ActiveFamilyDeliveries.isAllowedForUser(fd, context)));
    if (!d)
      return [];
    let Families = await (await import('../families/families')).Families;
    let family = await context.for(Families).findFirst(f => f.id.isEqualTo(d.family));
    let r: phoneOption[] = [];
    let settings = await ApplicationSettings.getAsync(context);
    for (const x of settings.getPhoneStrategy()) {
      if (x.option) {
        await x.option.build({
          family: family,
          d: d,
          context: context,

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

  @Field()
  id: number;
  @Field({ caption: use.language.organizationName })
  organisationName: string;


  @Field({
    caption: use.language.smsMessageContentCaption, validate: validateSmsContent
  })
  smsText: string;
  @Field({
    caption: use.language.smsReminderMessageContentCaption,
    validate: validateSmsContent
  })
  reminderSmsText: string;
  @Field({
    caption: use.language.emailDonorContentCaption,
    validate: validateSmsContent
  })
  registerFamilyReplyEmailText: string;
  @Field({
    caption: use.language.emailHelperContentCaption,
    validate: validateSmsContent
  })
  registerHelperReplyEmailText: string;
  @Field({ caption: "gMail UserName", includeInApi: Roles.admin })
  gmailUserName: string;
  @Field({ caption: "gMail password", includeInApi: Roles.admin })
  gmailPassword: string;
  @Field({ caption: use.language.logoUrl })
  logoUrl: string;
  @Field()
  addressApiResult: string;
  @Field({ caption: use.language.deliveryCenterAddress })
  address: string;
  addressHelper = new AddressHelper(this.context, () => this.$.address, () => this.$.addressApiResult);
  @Field({ caption: use.language.successMessageColumnName })
  commentForSuccessDelivery: string;
  @Field({ caption: use.language.leftByDoorMessageColumnName })
  commentForSuccessLeft: string;
  @Field({ caption: use.language.problemCommentColumnName })
  commentForProblem: string;
  @Field({ caption: use.language.messageForVolunteerWhenDoneCaption })
  messageForDoneDelivery: string;
  @Field({ caption: use.language.helpName })
  helpText: string;
  @Field({ caption: use.language.helpPhone })
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
  @Field({ allowApiUpdate: false })
  dataStructureVersion: number;
  @Field({ caption: use.language.successButtonSettingName })
  deliveredButtonText: string;
  @Field({ caption: use.language.freeText1ForVolunteer })
  message1Text: string;
  @Field({ caption: use.language.urlFreeText1 })
  message1Link: string;
  @Field({ caption: use.language.showText1OnlyWhenDone })
  message1OnlyWhenDone: boolean;
  @Field({ caption: use.language.freeText2ForVolunteer })
  message2Text: string;
  @Field({ caption: use.language.urlFreeText2 })
  message2Link: string;
  @Field({ caption: use.language.showText2OnlyWhenDone })
  message2OnlyWhenDone: boolean;
  @Field()
  forWho: TranslationOptions;
  @Field({ dbName: 'forSoldiers' })
  _old_for_soliders: boolean;
  @Field({ caption: use.language.enableSelfPickupModule })
  usingSelfPickupModule: boolean;

  isSytemForMlt() {
    return this.forWho == TranslationOptions.donors;
  }

  @Field({ caption: use.language.showVolunteerCompany })
  showCompanies: boolean;
  @Field({ caption: use.language.activateEscort })
  manageEscorts: boolean;
  @Field({ caption: use.language.showHelperComment })
  showHelperComment: boolean;
  @Field({ caption: use.language.filterFamilyGroups })
  showGroupsOnAssing: boolean;
  @Field({ caption: use.language.filterCity })
  showCityOnAssing: boolean;
  @Field({ caption: use.language.filterRegion })
  showAreaOnAssing: boolean;
  @Field({ caption: use.language.filterBasketType })
  showBasketOnAssing: boolean;
  @Field({ caption: use.language.selectNumberOfFamilies })
  showNumOfBoxesOnAssing: boolean;
  @Field({ caption: use.language.showLeftByHouseButton })
  showLeftThereButton: boolean;
  @Field({ caption: use.language.redTitleBar })
  redTitleBar: boolean;
  @Field({ caption: use.language.defaultPhonePrefixForExcelImport })
  defaultPrefixForExcelImport: string;
  @Field({ caption: use.language.checkIfFamilyExistsInDb })
  checkIfFamilyExistsInDb: boolean;
  @Field()
  removedFromListStrategy: RemovedFromListExcelImportStrategy;
  @Field({ caption: use.language.checkIfFamilyExistsInFile })
  checkIfFamilyExistsInFile: boolean;
  @Field({ caption: use.language.excelImportAutoAddValues })
  excelImportAutoAddValues: boolean;
  @Field({ caption: use.language.excelImportUpdateFamilyDefaultsBasedOnCurrentDelivery })
  excelImportUpdateFamilyDefaultsBasedOnCurrentDelivery: boolean;
  @Field({ caption: use.language.checkDuplicatePhones })
  checkDuplicatePhones: boolean;
  @Field({ caption: use.language.volunteerCanUpdateComment })
  volunteerCanUpdateComment: boolean;
  @Field({ caption: use.language.volunteerCanUpdateDeliveryComment })
  volunteerCanUpdateDeliveryComment: boolean;
  @Field({ caption: use.language.hideFamilyPhoneFromVolunteer })
  hideFamilyPhoneFromVolunteer: boolean;

  static serverHasPhoneProxy = false;
  @Field({ allowApiUpdate: false })
  usePhoneProxy: boolean;
  @Field({ caption: use.language.showOnlyLastNamePartToVolunteer })
  showOnlyLastNamePartToVolunteer: boolean;
  @Field({ caption: use.language.showTzToVolunteer })
  showTzToVolunteer: boolean;
  @Field({ caption: use.language.allowSendSuccessMessageOption, allowApiUpdate: false })
  allowSendSuccessMessageOption: boolean;
  @Field({ caption: use.language.sendSuccessMessageToFamily })
  sendSuccessMessageToFamily: boolean;
  @Field({ caption: use.language.successMessageText })
  successMessageText: string;
  @Field({ caption: use.language.requireEULA })
  requireEULA: boolean;
  @Field({ caption: use.language.requireConfidentialityApprove })
  requireConfidentialityApprove: boolean;
  @Field({ caption: use.language.requireComplexPassword })
  requireComplexPassword: boolean;
  @Field({ caption: use.language.timeToDisconnect })
  timeToDisconnect: number;
  @Field({ caption: use.language.daysToForcePasswordChange })
  daysToForcePasswordChange: number;
  @Field({ caption: use.language.showDeliverySummaryToVolunteerOnFirstSignIn })
  showDeliverySummaryToVolunteerOnFirstSignIn: boolean;
  @Field({ caption: use.language.showDistCenterAsEndAddressForVolunteer })
  showDistCenterAsEndAddressForVolunteer: boolean;
  @Field()
  routeStrategy: routeStrategy;
  @Field({ caption: use.language.maxDeliveriesBeforeBusy })
  BusyHelperAllowedFreq_nom: number;
  @Field({ caption: use.language.daysCountForBusy })
  BusyHelperAllowedFreq_denom: number;
  @Field({ caption: use.language.MaxItemsQuantityInDeliveryThatAnIndependentVolunteerCanSee })
  MaxItemsQuantityInDeliveryThatAnIndependentVolunteerCanSee: number;
  @Field({ caption: use.language.MaxDeliverisQuantityThatAnIndependentVolunteerCanAssignHimself })
  MaxDeliverisQuantityThatAnIndependentVolunteerCanAssignHimself: number;


  @Field({
    caption: use.language.defaultStatusType
  })
  @DataControl({
    valueList: [DeliveryStatus.ReadyForDelivery, DeliveryStatus.SelfPickup]
  })
  defaultStatusType: DeliveryStatus;


  @Field({ caption: use.language.boxes1NameCaption })
  boxes1Name: string;
  @Field({ caption: use.language.boxes2NameCaption })
  boxes2Name: string;
  @Field({ caption: use.language.customColumn + " 1 " + use.language.caption, includeInApi: Roles.admin })
  familyCustom1Caption: string;
  @Field({ caption: use.language.customColumn + " 1 " + use.language.optionalValues, includeInApi: Roles.admin })
  familyCustom1Values: string;
  @Field({ caption: use.language.customColumn + " 2 " + use.language.caption, includeInApi: Roles.admin })
  familyCustom2Caption: string;
  @Field({ caption: use.language.customColumn + " 2 " + use.language.optionalValues, includeInApi: Roles.admin })
  familyCustom2Values: string;
  @Field({ caption: use.language.customColumn + " 3 " + use.language.caption, includeInApi: Roles.admin })
  familyCustom3Caption: string;
  @Field({ caption: use.language.customColumn + " 3 " + use.language.optionalValues, includeInApi: Roles.admin })
  familyCustom3Values: string;
  @Field({ caption: use.language.customColumn + " 4 " + use.language.caption, includeInApi: Roles.admin })
  familyCustom4Caption: string;
  @Field({ caption: use.language.customColumn + " 4 " + use.language.optionalValues, includeInApi: Roles.admin })
  familyCustom4Values: string;
  @Field<ApplicationSettings>({ serverExpression: (self) => self.context.isSignedIn() })
  currentUserIsValidForAppLoadTest: boolean;
  @Field({ caption: use.language.questionForVolunteer + " 1 " + use.language.caption })
  questionForVolunteer1Caption: string;
  @Field({ caption: use.language.questionForVolunteer + " 1 " + use.language.optionalValues })
  questionForVolunteer1Values: string;
  @Field({ caption: use.language.questionForVolunteer + " 2 " + use.language.caption })
  questionForVolunteer2Caption: string;
  @Field({ caption: use.language.questionForVolunteer + " 2 " + use.language.optionalValues })
  questionForVolunteer2Values: string;
  @Field({ caption: use.language.questionForVolunteer + " 3 " + use.language.caption })
  questionForVolunteer3Caption: string;
  @Field({ caption: use.language.questionForVolunteer + " 3 " + use.language.optionalValues })
  questionForVolunteer3Values: string;
  @Field({ caption: use.language.questionForVolunteer + " 4 " + use.language.caption })
  questionForVolunteer4Caption: string;
  @Field({ caption: use.language.questionForVolunteer + " 4 " + use.language.optionalValues })
  questionForVolunteer4Values: string;
  @Field({ includeInApi: Roles.admin })
  createBasketsForAllFamiliesInCreateEvent: boolean;
  @Field({ includeInApi: Roles.admin })
  includeGroupsInCreateEvent: string;
  @Field({ includeInApi: Roles.admin })
  excludeGroupsInCreateEvent: string;




  constructor(private context: Context) {
    super()
  }

  static get(context: Context) {
    if (context.onServer) {

    }
    return context.for(ApplicationSettings).lookup(app => app.id.isEqualTo(1));

  }
  static async getAsync(context: Context): Promise<ApplicationSettings> {
    return (await context.for(ApplicationSettings).findFirst());
  }

}
export class PhoneOption {

  static assignerOrOrg = new PhoneOption("assignerOrOrg", "הטלפון ממנו יצא הSMS", async args => {
    if (args.settings.helpText) {
      args.addPhone(args.settings.helpText, args.settings.$.helpPhone.displayValue);
    }
    else {
      let h = await args.d.$.courierAssignUser.load();
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
      let h = await args.context.for((await import('../helpers/helpers')).Helpers).findId(args.family.fixedCourier);
      args.addPhone(getLang(args.context).defaultVolunteer + ": " + h.name, h.phone.displayValue);
    }
  });


  static familySource = new PhoneOption("familySource", "טלפון גורם מפנה", async args => {
    if (args.family.familySource) {
      let s = await args.family.$.familySource.load();
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
  context: Context,
  phoneItem: PhoneItem,
  settings: ApplicationSettings,
  addPhone: (name: string, value: string) => void
}


@Injectable()
export class SettingsService {
  constructor(private context: Context, private http: HttpClient) {

  }
  instance: ApplicationSettings;
  async init() {

    this.instance = await ApplicationSettings.getAsync(this.context);
    setSettingsForSite(Sites.getValidSchemaFromContext(this.context), this.instance);

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


    BasketType.boxes1Name = this.instance.boxes1Name;
    BasketType.boxes2Name = this.instance.boxes2Name;
    setCustomColumnInfo(customColumnInfo[1], this.instance.familyCustom1Caption, this.instance.familyCustom1Values, Roles.admin);
    setCustomColumnInfo(customColumnInfo[2], this.instance.familyCustom2Caption, this.instance.familyCustom2Values, Roles.admin);
    setCustomColumnInfo(customColumnInfo[3], this.instance.familyCustom3Caption, this.instance.familyCustom3Values, Roles.admin);
    setCustomColumnInfo(customColumnInfo[4], this.instance.familyCustom4Caption, this.instance.familyCustom4Values, Roles.admin);
    setCustomColumnInfo(questionForVolunteers[1], this.instance.questionForVolunteer1Caption, this.instance.questionForVolunteer1Values, true);
    setCustomColumnInfo(questionForVolunteers[2], this.instance.questionForVolunteer2Caption, this.instance.questionForVolunteer2Values, true);
    setCustomColumnInfo(questionForVolunteers[3], this.instance.questionForVolunteer3Caption, this.instance.questionForVolunteer3Values, true);
    setCustomColumnInfo(questionForVolunteers[4], this.instance.questionForVolunteer4Caption, this.instance.questionForVolunteer4Values, true);


  }

}


export const customColumnInfo: customColumnInfo[] = [{}, {}, {}, {}, {}];
export const questionForVolunteers: customColumnInfo[] = [{}, {}, {}, {}, {}];

export function getCustomColumnVisible(defs: FieldDefinitions) {
  return true;
}

export function setCustomColumnInfo(v: customColumnInfo, caption: string, values: string, role: Allowed) {

  v.visible = !!caption;
  v.caption = caption;
  v.values = undefined;
  v.role = role;
  if (values) {
    v.values = values.split(',').map(x => x.trim());
  }
}
const settingsForSite = new Map<string, ApplicationSettings>();
export function setSettingsForSite(site: string, lang: ApplicationSettings) {
  settingsForSite.set(site, lang);
}
export function getSettings(context: Context) {
  let r = settingsForSite.get(Sites.getValidSchemaFromContext(context));
  if (r)
    return r;
  if (context.onServer) {
    return new ApplicationSettings(context);
    throw "can't find application settings on server for this request";
  }
  return ApplicationSettings.get(context);;
}

interface customColumnInfo {
  caption?: string,
  visible?: boolean,
  values?: string[],
  role?: Allowed
}
export function includePhoneInApi(context: Context) {
  var s = getSettings(context);
  if (!s.hideFamilyPhoneFromVolunteer)
    return true;
  if (context.isAllowed(Roles.distCenterAdmin))
    return true
  return false;

}
export function validateSmsContent(entity: any, c: EntityField<string, any>) {
  return;
  if (c.value && c.value.indexOf("!אתר!") < 0 && c.value.indexOf("!URL!") < 0)
    c.error = this.lang.mustIncludeUrlKeyError;
}