import { Component, OnInit } from '@angular/core';
import { ApplicationImages } from "./ApplicationImages";
import { FamilySources } from "../families/FamilySources";
import { BasketType } from "../families/BasketType";

import { SendSmsAction } from '../asign-family/send-sms-action';
import { ApplicationSettings, PhoneItem, PhoneOption, qaItem } from './ApplicationSettings';


import { Context, IdEntity, IdColumn, StringColumn, EntityClass, Entity, NumberColumn, RouteHelperService, DataAreaSettings, ServerFunction } from '@remult/core';
import { DialogService } from '../select-popup/dialog';
import { AdminGuard, Roles } from '../auth/roles';
import { Route } from '@angular/router';
import { Families } from '../families/families';
import { SqlBuilder } from '../model-shared/types';
import { DomSanitizer } from '@angular/platform-browser';
import { DistributionCenters, DistributionCenterId } from './distribution-centers';

import { InputAreaComponent } from '../select-popup/input-area/input-area.component';
import { DeliveryStatus } from '../families/DeliveryStatus';

@Component({
  selector: 'app-manage',
  templateUrl: './manage.component.html',
  styleUrls: ['./manage.component.scss']
})
export class ManageComponent implements OnInit {
  static route: Route = {
    path: 'manage',
    component: ManageComponent,
    data: {
      name: 'הגדרות מערכת'
    }, canActivate: [AdminGuard]
  }

  wasChange() {
    return this.settings &&
      this.images.currentRow &&
      (this.settings.wasChanged() ||
        this.images.currentRow.wasChanged() ||
        this.settings.phoneStrategy.originalValue != this.serializePhones() ||
        this.settings.commonQuestions.originalValue != this.serializeQa()
      );
  }
  async save() {
    this.settings.phoneStrategy.value = this.serializePhones();
    this.settings.commonQuestions.value = this.serializeQa();
    try {
      await this.settings.save();
      this.dialog.refreshFamiliesAndDistributionCenters();
    } catch (err) {
      let x = "שגיאה בשמירה: ";
      for (const c of this.settings.columns) {
        if (c.validationError) {
          x += c.defs.caption + " - " + c.validationError + " ";
        }
      }
      this.dialog.Error(x);
    }
    this.images.currentRow.save();
  }
  reset() {
    this.settings.undoChanges();
    this.images.currentRow.undoChanges();
    this.helpPhones = this.settings.getPhoneStrategy();
    this.qaItems = this.settings.getQuestions();
  }
  constructor(private dialog: DialogService, private context: Context, private sanitization: DomSanitizer, public settings: ApplicationSettings) { }

  basketType = this.context.for(BasketType).gridSettings({
    hideDataArea: true,
    columnSettings: x => [
      x.name,
      {
        column: x.boxes,
        width: '100px'
      },
      {
        column: x.boxes2,
        width: '100px'
      }
    ],
    onSavingRow:()=>this.refreshEnvironmentAfterSave(),
    get: {
      limit: 25,
      orderBy: f => [f.name]
    },
    onNewRow: b => b.boxes.value = 1,
    allowUpdate: true,
    allowInsert: true,
    allowDelete: true,
    confirmDelete: (h, yes) => this.dialog.confirmDelete(h.name.value, yes)
  });
  distributionCenters = this.context.for(DistributionCenters).gridSettings({
    hideDataArea: true,
    columnSettings: x => [
      x.name,
      {
        column: x.semel,
        width: '100px'
      },
      {
        column: x.address,
      },
      {
        caption: 'כתובת כפי שגוגל הבין',
        getValue: s => s.getGeocodeInformation().getAddress()
      }
    ],
    get: {
      limit: 25,
      orderBy: f => [f.name]
    }, onSavingRow: f => {
      this.refreshEnvironmentAfterSave();

    },

    allowUpdate: true,
    allowInsert: true,

    confirmDelete: (h, yes) => this.dialog.confirmDelete(h.name.value, yes)
  });

  refreshEnvironmentAfterSave() {
    setTimeout(() => {
      this.dialog.refreshFamiliesAndDistributionCenters();
    }, 1000);
  }
  sources = this.context.for(FamilySources).gridSettings({
    hideDataArea: true,
    columnSettings: s => [
      s.name,
      s.phone,
      s.contactPerson
    ], allowUpdate: true,
    allowInsert: true,
    allowDelete: true,
    get: {
      limit: 25,
      orderBy: f => [f.name]
    },
    confirmDelete: (h, yes) => this.dialog.confirmDelete(h.name.value, yes)
  });
  groups = this.context.for(Groups).gridSettings({
    onSavingRow:()=>this.refreshEnvironmentAfterSave(),
    hideDataArea: true,
    columnSettings: s => [
      s.name,
    ], allowUpdate: true,
    allowInsert: true,
    allowDelete: true,
    get: {
      limit: 25,
      orderBy: f => [f.name]
    },
    confirmDelete: (h, yes) => this.dialog.confirmDelete(h.name.value, yes)
  });
  settingsArea = new DataAreaSettings({



    columnSettings: () => [
      this.settings.organisationName,
      this.settings.address,
      {
        caption: 'כתובת כפי שגוגל הבין',
        getValue: s => this.settings.getGeocodeInformation().getAddress()
      }

    ]
  });
  settingsMore = new DataAreaSettings({
    columnSettings: s =>
      [
        this.settings.helpText,
        this.settings.helpPhone
      ]

  });


  settingsLogo = new DataAreaSettings({
    columnSettings: s => [this.settings.logoUrl]
  });
  settingsMessages = new DataAreaSettings({
    columnSettings: s => [
      this.settings.messageForDoneDelivery,
      this.settings.message1Text,
      this.settings.message1Link,
      this.settings.message1OnlyWhenDone,
      this.settings.message2Text,
      this.settings.message2Link,
      this.settings.message2OnlyWhenDone,
      this.settings.deliveredButtonText,
      this.settings.commentForSuccessDelivery,
      this.settings.commentForSuccessLeft,
      this.settings.commentForProblem,




    ]
  });
  prefereces = new DataAreaSettings({
    columnSettings: s => [
      this.settings.defaultStatusType,
      this.settings.usingSelfPickupModule,
      this.settings.showLeftThereButton,
      this.settings.boxes1Name,
      this.settings.boxes2Name,
      this.settings.showCompanies,
      this.settings.showHelperComment,
      this.settings.defaultPrefixForExcelImport,
      this.settings.redTitleBar,
      this.settings.forSoldiers,
      this.settings.manageEscorts
    ]
  });


  testSms() {
    return SendSmsAction.getMessage(this.settings.smsText.value, this.settings.organisationName.value, 'ישראל ישראלי', this.context.user.name, window.location.origin + '/x/zxcvdf');
  }
  testSmsReminder() {
    return SendSmsAction.getMessage(this.settings.reminderSmsText.value, this.settings.organisationName.value, 'ישראל ישראלי', this.context.user.name, window.location.origin + '/x/zxcvdf');
  }
  images = this.context.for(ApplicationImages).gridSettings({
    numOfColumnsInGrid: 0,
    allowUpdate: true,
    columnSettings: i => [
      i.base64Icon,
      i.base64PhoneHomeImage

    ]
  });

  ngOnInit() {

    try {
      this.helpPhones = this.settings.getPhoneStrategy();
      this.qaItems = this.settings.getQuestions();
    }
    catch
    {
      this.helpPhones = [];
    }

    this.images.getRecords();
  }
  helpPhones: PhoneItem[] = [{
    option: PhoneOption.assignerOrOrg
  }];
  qaItems: qaItem[] = [];
  phoneOptions = [
    PhoneOption.assignerOrOrg
    , PhoneOption.familyHelpPhone

    , PhoneOption.familySource
    , PhoneOption.otherPhone
  ];
  addPhoneOption() {
    let x: PhoneItem = {
      option: PhoneOption.otherPhone
    }
    for (const op of this.phoneOptions) {
      let f = this.helpPhones.find(x => x.option == op);
      if (!f) {
        x.option = op;
        break;
      }
    }
    this.helpPhones.push(x);
  }
  addQuestion() {
    let x: qaItem = {
    }
    this.qaItems.push(x);
  }
  showNameAndPhone(p: PhoneItem) {
    return p.option == PhoneOption.otherPhone;
  }
  move(p: PhoneItem, dir: number) {
    let x = this.helpPhones.indexOf(p);
    this.helpPhones.splice(x, 1);
    this.helpPhones.splice(x + dir, 0, p);
  }
  moveQuestion(p: qaItem, dir: number) {
    let x = this.qaItems.indexOf(p);
    this.qaItems.splice(x, 1);
    this.qaItems.splice(x + dir, 0, p);
  }
  delete(p: PhoneItem) {
    let x = this.helpPhones.indexOf(p);
    this.helpPhones.splice(x, 1);
  }
  deleteQuestion(p: qaItem) {
    let x = this.qaItems.indexOf(p);
    this.qaItems.splice(x, 1);
  }
  serializePhones() {
    return JSON.stringify(this.helpPhones.map(x => {
      return {
        name: x.name,
        phone: x.phone,
        option: x.option.key
      }
    }));
  }
  serializeQa() {
    return JSON.stringify(this.qaItems);
  }
  getLogo() {
    return this.sanitization.bypassSecurityTrustResourceUrl(
      'data:image;base64,' + this.images.currentRow.base64PhoneHomeImage.value);
  }
  onFileChange(id: string, column: StringColumn) {
    const inputNode: any = document.querySelector('#' + id);

    if (typeof (FileReader) !== 'undefined') {
      const reader = new FileReader();

      reader.onload = (e: any) => {
        let x = e.target.result;
        let y = x.indexOf(',');
        column.value = x.substring(y + 1).trim();
      };

      reader.readAsDataURL(inputNode.files[0]);
    }
  }
  getIcon() {
    return this.sanitization.bypassSecurityTrustResourceUrl(
      'data:image;base64,' + this.images.currentRow.base64Icon.value);
  }
  async deleteFamilies() {
    let codeWord = new StringColumn('מילת קוד');
    let codeWords = ["נועם", "יעל", "עופרי", "מעיין", "איתמר", "יוני", "ניצן"];
    let correctCodeWord = codeWords[Math.trunc(Math.random() * codeWords.length)];
    let doIt = false;
    let count = await this.context.for(Families).count(f => f.deliverStatus.isEqualTo(DeliveryStatus.RemovedFromList));
    if (!await this.dialog.YesNoPromise("האם אתה בטוח שאתה רוצה למחוק " + count + " משפחות?"))
      return;
    await this.context.openDialog(InputAreaComponent, x => {
      x.args = {
        title: 'אנא הקלד "' + correctCodeWord + '" בשדה מילת קוד לאישור המחיקה',
        settings: { columnSettings: () => [codeWord] }, ok: () => doIt = true, cancel: () => doIt = false
      }
    })
    if (!doIt)
      return;
    if (codeWord.value != correctCodeWord) {
      this.dialog.Error("מילת קוד שגויה - התהליך מופסק");
      return;
    }
    let r = await ManageComponent.deleteFamiliesOnServer();
    this.dialog.Info('נתחקו ' + r + ' משפחות');
  }
  @ServerFunction({ allowed: Roles.admin })
  static async deleteFamiliesOnServer(context?: Context) {
    let count = 0;
    for (const f of await context.for(Families).find({ where: f => f.deliverStatus.isEqualTo(DeliveryStatus.RemovedFromList) })) {
      await f.delete();
      count++;
    }
    return count;
  }


}
@EntityClass
export class Groups extends IdEntity {

  name = new StringColumn("קבוצה");

  constructor(context: Context) {
    super({
      name: "groups",
      allowApiRead: Roles.admin,
      allowApiCRUD: Roles.admin,
    });
  }
}

@EntityClass
export class GroupsStats extends Entity<string> {
  name = new StringColumn();
  distCenter = new DistributionCenterId(this.context);
  familiesCount = new NumberColumn();
  constructor(private context: Context) {
    super({
      allowApiRead: Roles.distCenterAdmin,
      name: 'groupsStats',
      dbName: () => {
        let f = context.for(Families).create();
        let g = context.for(Groups).create();
        let d = context.for(DistributionCenters).create();
        let sql = new SqlBuilder();
        sql.addEntity(f, 'Families');
        sql.addEntity(g, 'groups');
        return sql.entityDbName(
          {
            select: () => [g.name, sql.columnWithAlias(d.id, this.distCenter), sql.countInnerSelect({
              from: f,
              
              where: () => [
                sql.build(f.groups, ' like \'%\'||', g.name, '||\'%\''),
                f.readyFilter().and(f.distributionCenter.isAllowedForUser()),
                sql.eq(f.distributionCenter, d.id)]

            }, this.familiesCount)],
            from: g,
            crossJoin: () => [d],

          })
      }
    });
  }
}