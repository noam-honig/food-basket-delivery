import { StringColumn, NumberColumn, BoolColumn } from '@remult/core';
import { GeocodeInformation, GetGeoInformation } from "../shared/googleApiHelpers";
import { Entity, Context, EntityClass } from '@remult/core';
import { PhoneColumn } from "../model-shared/types";
import { Roles } from "../auth/roles";
import { DeliveryStatusColumn, DeliveryStatus } from "../families/DeliveryStatus";
import { translate, translationConfig } from "../translate";
import { Families } from "../families/families";
import { FamilySources } from "../families/FamilySources";
import { Injectable } from '@angular/core';
import { Helpers } from '../helpers/helpers';
import { BasketType } from '../families/BasketType';
@EntityClass
export class ApplicationSettings extends Entity<number>  {
  async getPhoneOptions(family: Families, context: Context) {
    let r: phoneOption[] = [];
    for (const x of this.getPhoneStrategy()) {
      if (x.option) {
        await x.option.build({
          family: family,
          context: context,
          phoneItem: x,
          settings: this,
          addPhone: (name, phone) => r.push({ name: name, phone: phone })
        });
      }
    }
    return r;
  }

  id = new NumberColumn();
  organisationName = new StringColumn('שם הארגון');
  smsText = new StringColumn({
    caption: 'תוכן הודעת SMS', validate: () => {
      if (this.smsText.value.indexOf("!אתר!") < 0)
        this.smsText.validationError =  " חייב להכיל את המלל !אתר!, אחרת לא ישלח קישור";

    }
  });
  reminderSmsText = new StringColumn({
    caption: 'תוכן הודעת תזכורת SMS',
    validate: () => {
      if (this.reminderSmsText.value.indexOf("!אתר!") < 0)
        this.reminderSmsText.validationError =  " חייב להכיל את המלל !אתר!, אחרת לא ישלח קישור";
    }
  });
  logoUrl = new StringColumn('לוגו URL');
  address = new StringColumn("כתובת מרכז השילוח");
  commentForSuccessDelivery = new StringColumn('הודעה למשנע כאשר נמסר בהצלחה');
  commentForSuccessLeft = new StringColumn('הודעה למשנע כאשר הושאר ליד הבית');
  commentForProblem = new StringColumn('הודעה למשנע כאשר יש בעיה');
  messageForDoneDelivery = new StringColumn(translate('הודעה למשנע כאשר סיים את כל המשפחות'));

  helpText = new StringColumn('שם חלופי');
  helpPhone = new PhoneColumn('טלפון חלופי');
  phoneStrategy = new StringColumn();
  getPhoneStrategy(): PhoneItem[] {
    try {
      return JSON.parse(this.phoneStrategy.value).map(x => {
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
      return JSON.parse(this.commonQuestions.value);
    }
    catch
    {
      return [];
    }
  }
  commonQuestions = new StringColumn();
  dataStructureVersion = new NumberColumn({ allowApiUpdate: false });
  deliveredButtonText = new StringColumn("מלל כפתור נמסר בהצלחה");
  message1Text = new StringColumn('מלל חופשי 1 למתנדב');
  message1Link = new StringColumn('כתובת אינטרנט ללחיצה על מלל חופשי 1 למתנדב');
  message1OnlyWhenDone = new BoolColumn('להציג מלל חופשי 1 רק כאשר המתנדב סיים אל כל הסלים');
  message2Text = new StringColumn('מלל חופשי 2 למתנדב');
  message2Link = new StringColumn('כתובת אינטרנט ללחיצה על מלל חופשי 2 למתנדב');
  message2OnlyWhenDone = new BoolColumn('להציג מלל חופשי 2 רק כאשר המתנדב סיים אל כל הסלים');
  forSoldiers = new BoolColumn('המערכת היא עבור חיילים לא משפחות');

  usingSelfPickupModule = new BoolColumn('ישנן משפחות שבאות לקחת ממרכז החלוקה');
  showCompanies = new BoolColumn('שמור מטעם איזה חברה הגיע המתנדב');
  manageEscorts = new BoolColumn('הפעל ניהול מלווים לנהגים');
  showHelperComment = new BoolColumn('שמור הערה למתנדב');
  showGroupsOnAssing = new BoolColumn('סינון קבוצת חלוקה');
  showCityOnAssing = new BoolColumn('סינון עיר');
  showBasketOnAssing = new BoolColumn('סינון סוג סל');
  showNumOfBoxesOnAssing = new BoolColumn('בחירת מספר משפחות');
  showLeftThereButton = new BoolColumn('הצג למתנדב כפתור השארתי ליד הבית');
  redTitleBar = new BoolColumn("כותרת דף בצבע אדום");
  defaultPrefixForExcelImport = new StringColumn("קידומת טלפון ברירת מחדל בקליטה מאקסל");
  addressApiResult = new StringColumn();
  defaultStatusType = new DeliveryStatusColumn({
    caption: translate('סטטוס משלוח ברירת מחדל למשפחות חדשות')
  }, [DeliveryStatus.ReadyForDelivery, DeliveryStatus.SelfPickup, DeliveryStatus.NotInEvent]);
  private _lastString: string;
  private _lastGeo: GeocodeInformation;
  getGeocodeInformation() {
    if (this._lastString == this.addressApiResult.value)
      return this._lastGeo ? this._lastGeo : new GeocodeInformation();
    this._lastString = this.addressApiResult.value;
    return this._lastGeo = GeocodeInformation.fromString(this.addressApiResult.value);
  }
  boxes1Name = new StringColumn("שם כמות 1 בסוגי סלים");
  boxes2Name = new StringColumn("שם כמות 2 בסוגי סלים");


  constructor(context: Context) {
    super({
      name: 'ApplicationSettings',
      allowApiRead: true,
      allowApiUpdate: Roles.admin,
      savingRow: async () => {
        if (context.onServer) {
          if (this.address.value != this.address.originalValue || !this.getGeocodeInformation().ok()) {
            let geo = await GetGeoInformation(this.address.value);
            this.addressApiResult.value = geo.saveToString();
            if (geo.ok()) {
            }
          }
          for (const l of [this.message1Link, this.message2Link]) {
            if (l.value) {
              if (l.value.trim().indexOf(':') < 0)
                l.value = 'http://' + l.value.trim();
            }
          }
        }
      }
    })
  }

  static get(context: Context) {
    return context.for(ApplicationSettings).lookup(app => app.id.isEqualTo(1));

  }
  static async getAsync(context: Context): Promise<ApplicationSettings> {
    return (await context.for(ApplicationSettings).findFirst());
  }

}
export class PhoneOption {

  static assignerOrOrg = new PhoneOption("assignerOrOrg", "הטלפון ממנו יצא הSMS", async args => {
    if (args.settings.helpText.value) {
      args.addPhone(args.settings.helpText.value, args.settings.helpPhone.displayValue);
    }
    else
      args.addPhone(args.family.courierAssignUserName.value, args.family.courierAssignUserPhone.displayValue);
  });
  static familyHelpPhone = new PhoneOption("familyHelpPhone", "איש קשר לבירור כפי שמוגדר למשפחה", async args => {
    if (args.family.socialWorker.value && args.family.socialWorkerPhone1.value) {
      args.addPhone(args.family.socialWorker.value, args.family.socialWorkerPhone1.displayValue);
    }
    if (args.family.socialWorker.value && args.family.socialWorkerPhone2.value) {
      args.addPhone(args.family.socialWorker.value, args.family.socialWorkerPhone2.displayValue);
    }
  });

  static familySource = new PhoneOption("familySource", "טלפון גורם מפנה", async args => {
    if (args.family.familySource.value) {
      let s = await args.context.for(FamilySources).findFirst(x => x.id.isEqualTo(args.family.familySource.value));
      if (s && s.phone.value) {
        let name = s.contactPerson.value;
        if (!name || name.length == 0) {
          name = s.name.value;
        }
        args.addPhone(name, s.phone.displayValue);
      }
    }
  });
  static otherPhone = new PhoneOption("otherPhone", "טלפון אחר", async args => {
    if (args.phoneItem.phone) {
      args.addPhone(args.phoneItem.name, PhoneColumn.formatPhone(args.phoneItem.phone));
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
  family: Families,
  context: Context,
  phoneItem: PhoneItem,
  settings: ApplicationSettings,
  addPhone: (name: string, value: string) => void
}
@Injectable()
export class SettingsService {
  constructor(private context: Context) {

  }
  instance: ApplicationSettings;
  async init() {
    this.instance = await ApplicationSettings.getAsync(this.context);
    translationConfig.activateTranslation = this.instance.forSoldiers.value;
    DeliveryStatus.usingSelfPickupModule = this.instance.usingSelfPickupModule.value;
    Helpers.usingCompanyModule = this.instance.showCompanies.value;

    BasketType.boxes1Name = this.instance.boxes1Name.value;
    BasketType.boxes2Name = this.instance.boxes2Name.value;

  }

}
