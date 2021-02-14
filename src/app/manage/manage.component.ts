import { Component, OnInit } from '@angular/core';
import { ApplicationImages } from "./ApplicationImages";
import { FamilySources } from "../families/FamilySources";
import { BasketType } from "../families/BasketType";

import { SendSmsAction } from '../asign-family/send-sms-action';
import { ApplicationSettings, PhoneItem, PhoneOption, qaItem, SettingsService } from './ApplicationSettings';


import { BusyService } from '@remult/angular';
import { Context, IdEntity, IdColumn, StringColumn, EntityClass, Entity, NumberColumn, DataAreaSettings, ServerFunction, DataControlInfo, ServerProgress } from '@remult/core';
import { DialogService } from '../select-popup/dialog';
import { AdminGuard, Roles } from '../auth/roles';
import { Route } from '@angular/router';
import { Families } from '../families/families';
import { SqlBuilder } from '../model-shared/types';
import { DomSanitizer } from '@angular/platform-browser';
import { DistributionCenters, DistributionCenterId } from './distribution-centers';

import { InputAreaComponent } from '../select-popup/input-area/input-area.component';
import { DeliveryStatus } from '../families/DeliveryStatus';
import { ActiveFamilyDeliveries } from '../families/FamilyDeliveries';
import { FamilyStatus, FamilyStatusColumn } from '../families/FamilyStatus';
import { pagedRowsIterator } from '../families/familyActionsWiring';
import { getLang } from '../sites/sites';
import { saveToExcel } from '../shared/saveToExcel';
import { Groups } from './groups';
import { EmailSvc } from '../shared/utils';
import { GetVolunteerFeedback } from '../update-comment/update-comment.component';

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

      this.context.clearAllCache();
      this.dialog.refreshFamiliesAndDistributionCenters();
      await this.settingService.init();
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
  constructor(private dialog: DialogService, private context: Context, private sanitization: DomSanitizer, public settings: ApplicationSettings, private busy: BusyService, private settingService: SettingsService) { }

  basketType = this.context.for(BasketType).gridSettings({
    showFilter: true,
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
    saving: () => this.refreshEnvironmentAfterSave(),

    rowsInPage: 25,
    orderBy: f => [f.name]
    ,
    newRow: b => b.boxes.value = 1,
    allowUpdate: true,
    allowInsert: true,
    allowDelete: true,
    confirmDelete: (h) => this.dialog.confirmDelete(h.name.value)
  });
  showArchivedDistributionCenters = false;
  distributionCenters = this.context.for(DistributionCenters).gridSettings({
    gridButtons: [
      {
        name: this.settings.lang.showDeletedDistributionCenters,
        click: () => {
          this.showArchivedDistributionCenters = !this.showArchivedDistributionCenters;
          this.distributionCenters.reloadData();
        }
      }
      ,
      {
        name: this.settings.lang.exportToExcel,
        click: async () => {
          await saveToExcel(this.settings, this.context.for(DistributionCenters), this.distributionCenters, this.settings.lang.distributionLists, this.busy, (d: DistributionCenters, c) => c == d.id);
        }
        , visible: () => this.context.isAllowed(Roles.admin)
      },
    ],
    rowCssClass: c => c.archive.value ? 'deliveredProblem' : c.isFrozen.value ? 'forzen' : '',
    rowButtons: [{
      name: this.settings.lang.distributionCenterDetails,
      click: async d => {
        this.context.openDialog(InputAreaComponent, x => x.args = {
          title: d.name.value,
          ok: async () => await d.save(),
          settings: {
            columnSettings: () => [
              d.name,
              d.address,
              {
                caption: this.settings.lang.addressByGoogle,
                getValue: () => d.address.getGeocodeInformation().getAddress()
              },
              d.comments,
              [d.phone1, d.phone1Description],
              [d.phone2, d.phone2Description],
              d.isFrozen,
              d.semel
            ]
          }
        });
      }
    },
    {
      textInMenu: c => c.archive.value ? this.settings.lang.unDeleteDistributionCenter : this.settings.lang.deleteDistributionCenter,
      icon: 'delete',
      click: async c => {
        if (!c.archive.value && (await this.context.for(DistributionCenters).count(x => x.isActive().and(x.id.isDifferentFrom(c.id)))) == 0) {
          this.dialog.Error(this.settings.lang.mustHaveAtLeastOneActiveDistributionList);
          return;
        }
        c.archive.value = !c.archive.value;
        await c.save();
        this.refreshEnvironmentAfterSave();
      }
    }
    ],
    columnSettings: x => [
      x.name,

      {
        column: x.address,
      },
      {
        caption: this.settings.lang.addressByGoogle,
        getValue: s => s.address.getGeocodeInformation().getAddress()
      },
      x.comments,
      x.isFrozen,
      x.phone1,
      x.phone1Description,
      x.phone2,
      x.phone2Description,
      {
        column: x.semel,
        width: '100px'
      }
    ],

    rowsInPage: 25,
    where: d => {
      if (!this.showArchivedDistributionCenters)
        return d.archive.isEqualTo(false);
    },
    orderBy: f => [f.name],

    saving: f => {
      this.refreshEnvironmentAfterSave();

    },
    numOfColumnsInGrid: this.settings.isSytemForMlt() ? 7 : 4,
    allowUpdate: true,
    allowInsert: true,

    confirmDelete: (h) => this.dialog.confirmDelete(h.name.value)
  });

  refreshEnvironmentAfterSave() {
    setTimeout(() => {
      this.dialog.refreshFamiliesAndDistributionCenters();
    }, 1000);
  }
  sources = this.context.for(FamilySources).gridSettings({
    showFilter: true,
    columnSettings: s => [
      s.name,
      s.phone,
      s.contactPerson
    ], allowUpdate: true,
    allowInsert: true,
    allowDelete: true,

    rowsInPage: 25,
    orderBy: f => [f.name]
    ,
    confirmDelete: (h) => this.dialog.confirmDelete(h.name.value)
  });
  groups = this.context.for(Groups).gridSettings({
    showFilter: true,
    saving: () => this.refreshEnvironmentAfterSave(),

    columnSettings: s => [
      s.name,
    ], allowUpdate: true,
    allowInsert: true,
    allowDelete: true,

    rowsInPage: 25,
    orderBy: f => [f.name]
    ,
    confirmDelete: (h) => this.dialog.confirmDelete(h.name.value)
  });
  settingsArea = new DataAreaSettings({



    columnSettings: () => [
      this.settings.organisationName,
      this.settings.address,
      {
        caption: 'כתובת כפי שגוגל הבין',
        getValue: s => this.settings.address.getGeocodeInformation().getAddress()
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
  async saveAndPreview() {
    await this.save();
    let f = this.context.for(ActiveFamilyDeliveries).create();
    this.context.openDialog(GetVolunteerFeedback, x => x.args = {
      family: f,
      comment: f.courierComments.value,
      helpText: () => this.settings.commentForSuccessDelivery,
      questionsArea: new DataAreaSettings({
        columnSettings: () => [
          f.a1, f.a2, f.a3, f.a4
        ]
      }),
      ok: async (comment) => {
      },
      cancel: () => {

      }
    });
  }
  settingsMessages = new DataAreaSettings({
    columnSettings: s => [
      this.settings.deliveredButtonText,
      this.settings.commentForSuccessDelivery,
      this.settings.commentForSuccessLeft,
      this.settings.commentForProblem,
      [this.settings.questionForVolunteer1Caption, this.settings.questionForVolunteer1Values],
      [this.settings.questionForVolunteer2Caption, this.settings.questionForVolunteer2Values],
      [this.settings.questionForVolunteer3Caption, this.settings.questionForVolunteer3Values],
      [this.settings.questionForVolunteer4Caption, this.settings.questionForVolunteer4Values]





    ]
  });
  settings2Messages = new DataAreaSettings({
    columnSettings: s => [


      this.settings.messageForDoneDelivery,
      this.settings.message1Text,
      this.settings.message1Link,
      this.settings.message1OnlyWhenDone,
      this.settings.message2Text,
      this.settings.message2Link,
      this.settings.message2OnlyWhenDone



    ]
  });
  emailConfiguration = new DataAreaSettings({
    columnSettings: () => [this.settings.gmailUserName, this.settings.gmailPassword]
  });
  async sendTestEmail() {
    var sc = new StringColumn('email');
    await this.context.openDialog(InputAreaComponent, x => x.args = {
      settings: {
        columnSettings: () => [sc]
      },
      title: 'בדיקת מייל',
      ok: async () => {
        let x = await ManageComponent.TestSendEmail(sc.value, this.testEmailDonor());
        if (x) {
          this.dialog.Info('נשלח בהצלחה');
        }
        else
          throw 'לא נשלח';

      }
    });
  }
  @ServerFunction({ allowed: Roles.admin })
  static async TestSendEmail(to: string, text: string, context?: Context) {
    return await EmailSvc.sendMail("test email", text, to, context);
  }

  prefereces = new DataAreaSettings({
    columnSettings: s => {
      let r = [
        this.settings.requireEULA,
        this.settings.requireConfidentialityApprove,
        this.settings.requireComplexPassword,
        this.settings.daysToForcePasswordChange,
        this.settings.timeToDisconnect,
        this.settings.defaultStatusType,
        this.settings.usingSelfPickupModule,
        this.settings.showLeftThereButton,
        this.settings.hideFamilyPhoneFromVolunteer,
        this.settings.showOnlyLastNamePartToVolunteer,
        this.settings.showTzToVolunteer,
        this.settings.boxes1Name,
        this.settings.boxes2Name,
        this.settings.showCompanies,
        this.settings.showHelperComment,
        this.settings.volunteerCanUpdateComment,
        this.settings.routeStrategy,
        this.settings.showDistCenterAsEndAddressForVolunteer,
        this.settings.defaultPrefixForExcelImport,
        this.settings.redTitleBar,
        this.settings.manageEscorts,
        [this.settings.familyCustom1Caption, this.settings.familyCustom1Values],
        [this.settings.familyCustom2Caption, this.settings.familyCustom2Values],
        [this.settings.familyCustom3Caption, this.settings.familyCustom3Values],
        [this.settings.familyCustom4Caption, this.settings.familyCustom4Values],
        this.settings.forWho,
      ];

      if (this.settings.isSytemForMlt())
        r.push(this.settings.BusyHelperAllowedFreq_nom, this.settings.BusyHelperAllowedFreq_denom);
      return r;
    }
  });


  testSms() {
    return SendSmsAction.getMessage(this.settings.smsText.value, this.settings.organisationName.value, 'משפחת ישראלי', 'ישראל ישראלי', this.context.user.name, window.location.origin + '/x/zxcvdf');
  }
  testSmsReminder() {
    return SendSmsAction.getMessage(this.settings.reminderSmsText.value, this.settings.organisationName.value, 'משפחת ישראלי', 'ישראל ישראלי', this.context.user.name, window.location.origin + '/x/zxcvdf');
  }
  testEmailHelper() {
    if (this.settings.registerHelperReplyEmailText.value)
      return SendSmsAction.getMessage(this.settings.registerHelperReplyEmailText.value, this.settings.organisationName.value, 'משפחת ישראלי', 'ישראל ישראלי', this.context.user.name, window.location.origin + '/x/zxcvdf');
  }
  testEmailDonor() {
    if (this.settings.registerFamilyReplyEmailText.value)
      return SendSmsAction.getMessage(this.settings.registerFamilyReplyEmailText.value, this.settings.organisationName.value, 'משפחת ישראלי', 'ישראל ישראלי', this.context.user.name, window.location.origin + '/x/zxcvdf');
  }
  testSuccessSms() {
    return SendSmsAction.getSuccessMessage(this.settings.successMessageText.value, this.settings.organisationName.value, 'ישראל ישראלי');
  }
  images = this.context.for(ApplicationImages).gridSettings({
    showFilter: true,
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

    this.images.reloadData();
  }
  helpPhones: PhoneItem[] = [{
    option: PhoneOption.assignerOrOrg
  }];
  qaItems: qaItem[] = [];
  phoneOptions = [
    PhoneOption.assignerOrOrg
    , PhoneOption.familyHelpPhone
    , PhoneOption.defaultVolunteer
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
    let codeWord = new StringColumn(this.settings.lang.codeWord);
    let codeWords = ["נועם", "יעל", "עופרי", "מעיין", "איתמר", "יוני", "ניצן", "חגי", "נגה"];
    if (!(this.settings.lang.languageCode == 'iw')) {
      codeWords = ["Noam", "Yoni", "Itamar", "Maayan", "Nitzan", "Hagai", "Noga", "Ofri"]

    }
    let correctCodeWord = codeWords[Math.trunc(Math.random() * codeWords.length)];
    let doIt = false;
    let count = await this.context.for(Families).count(f => f.status.isEqualTo(FamilyStatus.ToDelete));
    if (!await this.dialog.YesNoPromise(this.settings.lang.areYouSureYouWantToDelete + " " + count + this.settings.lang.families + "?"))
      return;
    await this.context.openDialog(InputAreaComponent, x => {
      x.args = {
        title: this.settings.lang.toConfirmPleaseTypeTheCodeWord + '"' + correctCodeWord + '"',
        settings: { columnSettings: () => [codeWord] }, ok: () => doIt = true, cancel: () => doIt = false
      }
    })
    if (!doIt)
      return;
    if (codeWord.value != correctCodeWord) {
      this.dialog.Error(this.settings.lang.wrongCodeWordProcessAborted);
      return;
    }
    let r = await ManageComponent.deleteFamiliesOnServer();
    this.dialog.Info(this.settings.lang.deleted + ' ' + r + ' ' + this.settings.lang.families);
  }
  async resetToDefault() {
    this.settings.id.value = 1;

    this.settings.smsText.value = this.settings.lang.defaultSmsText;
    this.settings.reminderSmsText.value = this.settings.lang.reminderSmsText;
    this.settings.commentForSuccessDelivery.value = this.settings.lang.commentForSuccessDelivery;
    this.settings.commentForSuccessLeft.value = this.settings.lang.commentForSuccessLeft;
    this.settings.commentForProblem.value = this.settings.lang.commentForProblem;
    this.settings.messageForDoneDelivery.value = this.settings.lang.messageForDoneDelivery;
    this.settings.deliveredButtonText.value = this.settings.lang.deliveredButtonText;
    this.settings.boxes1Name.value = this.settings.lang.boxes1Name;
    this.settings.boxes2Name.value = this.settings.lang.boxes2Name;
    var b = await this.context.for(BasketType).findFirst();
    if (b) {
      b.name.value = this.settings.lang.foodParcel;
      await b.save();
      this.basketType.reloadData();
    }
    let d = await this.context.for(DistributionCenters).findFirst();
    if (d) {
      d.name.value = this.settings.lang.defaultDistributionListName;
      await d.save();
      this.distributionCenters.reloadData();
    }
  }
  @ServerFunction({ allowed: Roles.admin, queue: true })
  static async deleteFamiliesOnServer(context?: Context, progress?: ServerProgress) {
    
    
    let i = 0;
    for await (const f of context.for(Families).iterate({
      where: f => f.status.isEqualTo(FamilyStatus.ToDelete),
      orderBy: f => [{ column: f.createDate, descending: true }],
      progress
    })) {
      await f.delete();
      i++;
    }
    return i;
  }



}

@EntityClass
export class GroupsStatsPerDistributionCenter extends Entity<string> implements GroupsStats {
  name = new StringColumn();
  distCenter = new DistributionCenterId(this.context);
  familiesCount = new NumberColumn();
  constructor(private context: Context) {
    super({
      allowApiRead: Roles.distCenterAdmin,
      defaultOrderBy: () => [this.name],
      name: 'GroupsStatsPerDistributionCenter',
      dbName: () => {
        let f = context.for(ActiveFamilyDeliveries).create();
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
@EntityClass
export class GroupsStatsForAllDeliveryCenters extends Entity<string> implements GroupsStats {
  name = new StringColumn();
  familiesCount = new NumberColumn();
  constructor(private context: Context) {
    super({
      allowApiRead: Roles.distCenterAdmin,
      name: 'GroupsStatsForAllDeliveryCenters',
      defaultOrderBy: () => [this.name],
      dbName: () => {
        let f = context.for(ActiveFamilyDeliveries).create();
        let g = context.for(Groups).create();

        let sql = new SqlBuilder();
        sql.addEntity(f, 'Families');
        sql.addEntity(g, 'groups');
        return sql.entityDbName(
          {
            select: () => [g.name, sql.countInnerSelect({
              from: f,

              where: () => [
                sql.build(f.groups, ' like \'%\'||', g.name, '||\'%\''),
                f.readyFilter().and(f.distributionCenter.isAllowedForUser())]


            }, this.familiesCount)],
            from: g


          })
      }
    });
  }
}
export interface GroupsStats {
  name: StringColumn;
  familiesCount: NumberColumn;
}