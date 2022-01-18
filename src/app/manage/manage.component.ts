import { Component, OnInit } from '@angular/core';
import { ApplicationImages } from "./ApplicationImages";
import { FamilySources } from "../families/FamilySources";
import { BasketType } from "../families/BasketType";

import { SendSmsAction, SendSmsUtils } from '../asign-family/send-sms-action';
import { ApplicationSettings, PhoneItem, PhoneOption, qaItem, SettingsService } from './ApplicationSettings';


import { BusyService, DataAreaSettings, GridSettings, InputField, openDialog } from '@remult/angular';
import { Remult, IdEntity, Entity, BackendMethod, ProgressListener, FieldRef, EntityBase, FieldsMetadata, Controller, getFields } from 'remult';
import { DialogService } from '../select-popup/dialog';
import { AdminGuard, Roles } from '../auth/roles';
import { Route } from '@angular/router';
import { Families } from '../families/families';
import { SqlBuilder, SqlFor } from "../model-shared/SqlBuilder";
import { DomSanitizer } from '@angular/platform-browser';
import { DistributionCenters } from './distribution-centers';

import { InputAreaComponent } from '../select-popup/input-area/input-area.component';
import { ActiveFamilyDeliveries, FamilyDeliveries } from '../families/FamilyDeliveries';
import { FamilyStatus } from '../families/FamilyStatus';
import { saveToExcel } from '../shared/saveToExcel';
import { Groups } from './groups';
import { EmailSvc } from '../shared/utils';
import { GetVolunteerFeedback } from '../update-comment/update-comment.component';
import { Field, use } from '../translate';
import { Sites } from '../sites/sites';
import { EditCommentDialogComponent } from '../edit-comment-dialog/edit-comment-dialog.component';
import { MyFamiliesComponent } from '../my-families/my-families.component';

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
      (this.settings._.wasChanged() ||
        this.images.currentRow._.wasChanged() ||
        this.settings.$.phoneStrategy.originalValue != this.serializePhones() ||
        this.settings.$.commonQuestions.originalValue != this.serializeQa()
      );
  }
  async save() {
    this.settings.phoneStrategy = this.serializePhones();
    this.settings.commonQuestions = this.serializeQa();
    try {
      await this.settings.save();

      this.remult.clearAllCache();
      this.dialog.refreshFamiliesAndDistributionCenters();
      await this.settingService.init();
    } catch (err) {
      let x = "שגיאה בשמירה: ";
      for (const c of this.settings.$) {
        if (c.error) {
          x += c.metadata.caption + " - " + c.error + " ";
        }
      }
      this.dialog.Error(x);
    }
    this.images.currentRow.save();
  }
  reset() {
    this.settings._.undoChanges();
    this.images.currentRow._.undoChanges();
    this.helpPhones = this.settings.getPhoneStrategy();
    this.qaItems = this.settings.getQuestions();
  }
  constructor(private dialog: DialogService, private remult: Remult, private sanitization: DomSanitizer, public settings: ApplicationSettings, private busy: BusyService, private settingService: SettingsService) { }

  basketType = new GridSettings(this.remult.repo(BasketType), {
    columnSettings: x => [
      x.name,
      {
        field: x.boxes,
        width: '100px'
      },
      {
        field: x.boxes2,
        width: '100px'
      }, {
        field: x.whatToTake,
        click: b => {
          openDialog(EditCommentDialogComponent, x => x.args = {
            title: use.language.whatToTake,
            comment: b.whatToTake.split(',').join("\n"),
            save: (c) => {
              b.whatToTake = c.split("\n").join(", ")
            }
          });
        }
      }
    ],
    saving: () => this.refreshEnvironmentAfterSave(),

    rowsInPage: 25,
    orderBy: { name: "asc" }
    ,
    newRow: b => b.boxes = 1,
    allowUpdate: true,
    allowInsert: true,
    allowDelete: true,
    confirmDelete: (h) => this.dialog.confirmDelete(h.name)
  });
  showArchivedDistributionCenters = false;
  distributionCenters = new GridSettings(this.remult.repo(DistributionCenters), {
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
          await saveToExcel(this.settings, this.remult.repo(DistributionCenters), this.distributionCenters, this.settings.lang.distributionLists, this.busy, (d: DistributionCenters, c) => c == d.$.id);
        }
        , visible: () => this.remult.isAllowed(Roles.admin)
      },
    ],
    rowCssClass: c => c.archive ? 'deliveredProblem' : c.isFrozen ? 'forzen' : '',
    rowButtons: [{
      name: this.settings.lang.distributionCenterDetails,
      click: async d => {
        openDialog(InputAreaComponent, x => x.args = {
          title: d.name,
          ok: async () => await d.save(),
          settings: {
            fields: () => [
              d.$.name,
              d.$.address,
              {
                caption: this.settings.lang.addressByGoogle,
                getValue: () => d.addressHelper.getGeocodeInformation.getAddress()
              },
              d.$.comments,
              [d.$.phone1, d.$.phone1Description],
              [d.$.phone2, d.$.phone2Description],
              d.$.isFrozen,
              d.$.semel
            ]
          }
        });
      }
    },
    {
      textInMenu: c => c.archive ? this.settings.lang.unDeleteDistributionCenter : this.settings.lang.deleteDistributionCenter,
      icon: 'delete',
      click: async c => {
        if (!c.archive && (await this.remult.repo(DistributionCenters).count({ $and: [DistributionCenters.isActive], id: { "!=": c.id } })) == 0) {
          this.dialog.Error(this.settings.lang.mustHaveAtLeastOneActiveDistributionList);
          return;
        }
        c.archive = !c.archive;
        await c.save();
        this.refreshEnvironmentAfterSave();
      }
    }
    ],
    columnSettings: (x: FieldsMetadata<DistributionCenters>) => [
      x.name,

      {
        field: x.address,
      },
      {
        caption: this.settings.lang.addressByGoogle,
        getValue: s => s.addressHelper.getGeocodeInformation.getAddress()
      },
      x.comments,
      x.isFrozen,
      x.phone1,
      x.phone1Description,
      x.phone2,
      x.phone2Description,
      {
        field: x.semel,
        width: '100px'
      }
    ],

    rowsInPage: 25,
    where: {
      archive: !this.showArchivedDistributionCenters ? false : undefined
    },
    orderBy: { name: "asc" },

    saving: f => {
      this.refreshEnvironmentAfterSave();

    },
    numOfColumnsInGrid: this.settings.isSytemForMlt ? 7 : 4,
    allowUpdate: true,
    allowInsert: true,

    confirmDelete: (h) => this.dialog.confirmDelete(h.name)
  });

  refreshEnvironmentAfterSave() {
    setTimeout(() => {
      this.dialog.refreshFamiliesAndDistributionCenters();
    }, 1000);
  }
  sources = new GridSettings(this.remult.repo(FamilySources), {
    columnSettings: s => [
      s.name,
      s.phone,
      s.contactPerson
    ], allowUpdate: true,
    allowInsert: true,
    allowDelete: true,

    rowsInPage: 25,
    orderBy: { name: "asc" }
    ,
    confirmDelete: (h) => this.dialog.confirmDelete(h.name)
  });
  groups = new GridSettings(this.remult.repo(Groups), {
    saving: () => this.refreshEnvironmentAfterSave(),

    columnSettings: s => [
      s.name,
    ], allowUpdate: true,
    allowInsert: true,
    allowDelete: true,

    rowsInPage: 25,
    orderBy: { name: "asc" }
    ,
    confirmDelete: (h) => this.dialog.confirmDelete(h.name)
  });
  settingsArea = new DataAreaSettings({



    fields: () => [
      this.settings.$.organisationName,
      this.settings.$.address,
      {
        caption: 'כתובת כפי שגוגל הבין',
        getValue: s => this.settings.addressHelper.getGeocodeInformation.getAddress()
      }

    ]
  });
  settingsMore = new DataAreaSettings({
    fields: s =>
      [
        this.settings.$.helpText,
        this.settings.$.helpPhone
      ]

  });


  settingsLogo = new DataAreaSettings({
    fields: s => [this.settings.$.logoUrl]
  });
  async previewVolunteer(){
    openDialog(MyFamiliesComponent);
  }
  async saveAndPreview() {
    await this.save();
    let f = this.remult.repo(ActiveFamilyDeliveries).create();
    openDialog(GetVolunteerFeedback, x => x.args = {
      family: f,
      comment: f.courierComments,
      helpText: () => this.settings.commentForSuccessDelivery,
      questionsArea: new DataAreaSettings({
        fields: () => [
          f.$.a1, f.$.a2, f.$.a3, f.$.a4
        ]
      }),
      ok: async (comment) => {
      },
      cancel: () => {

      }
    });
  }
  settingsMessages = new DataAreaSettings({
    fields: s => [
      this.settings.$.message1Text,
      this.settings.$.message1Link,
      this.settings.$.message1OnlyWhenDone,
      this.settings.$.message2Text,
      this.settings.$.message2Link,
      this.settings.$.message2OnlyWhenDone,
      this.settings.$.deliveredButtonText,
      this.settings.$.commentForSuccessDelivery,
      this.settings.$.commentForSuccessLeft,
      this.settings.$.problemButtonText,
      this.settings.$.commentForProblem,

      [this.settings.$.questionForVolunteer1Caption, this.settings.$.questionForVolunteer1Values],
      [this.settings.$.questionForVolunteer2Caption, this.settings.$.questionForVolunteer2Values],
      [this.settings.$.questionForVolunteer3Caption, this.settings.$.questionForVolunteer3Values],
      [this.settings.$.questionForVolunteer4Caption, this.settings.$.questionForVolunteer4Values],
      this.settings.$.askVolunteerForLocationOnDelivery,
      this.settings.$.askVolunteerForAPhotoToHelp,
      this.settings.$.questionForVolunteerWhenUploadingPhoto







    ]
  });
  settings2Messages = new DataAreaSettings({
    fields: s => [


      this.settings.$.messageForDoneDelivery,
      this.settings.$.AddressProblemStatusText,
      this.settings.$.NotHomeProblemStatusText,
      this.settings.$.DoNotWantProblemStatusText,
      this.settings.$.OtherProblemStatusText




    ]
  });
  emailConfiguration = new DataAreaSettings({
    fields: () => [this.settings.$.gmailUserName, this.settings.$.gmailPassword]
  });
  async sendTestEmail() {
    var sc = new InputField<string>({ caption: 'email' });
    await openDialog(InputAreaComponent, x => x.args = {
      settings: {
        fields: () => [sc]
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
  @BackendMethod({ allowed: Roles.admin })
  static async TestSendEmail(to: string, text: string, remult?: Remult) {
    return await EmailSvc.sendMail("test email", text, to, remult);
  }

  prefereces = new DataAreaSettings({
    fields: s => {
      let r = [
        this.settings.$.requireEULA,
        this.settings.$.requireConfidentialityApprove,
        this.settings.$.requireComplexPassword,
        this.settings.$.daysToForcePasswordChange,
        this.settings.$.timeToDisconnect,
        this.settings.$.hideFamilyPhoneFromVolunteer,
        this.settings.$.showOnlyLastNamePartToVolunteer,
        this.settings.$.showTzToVolunteer,
        this.settings.$.donotShowEventsInGeneralList,
        this.settings.$.defaultStatusType,
        this.settings.$.usingSelfPickupModule,
        this.settings.$.showLeftThereButton,
        this.settings.$.allowVolunteerToSeePreviousActivities,
        this.settings.$.volunteerCanUpdateDeliveryComment,
        this.settings.$.showDeliverySummaryToVolunteerOnFirstSignIn,
        this.settings.$.boxes1Name,
        this.settings.$.boxes2Name,
        this.settings.$.showCompanies,
        this.settings.$.showHelperComment,
        this.settings.$.volunteerCanUpdateComment,
        this.settings.$.routeStrategy,
        this.settings.$.showDistCenterAsEndAddressForVolunteer,
        this.settings.$.defaultPrefixForExcelImport,
        this.settings.$.redTitleBar,
        this.settings.$.manageEscorts,
        [this.settings.$.familyCustom1Caption, this.settings.$.familyCustom1Values],
        [this.settings.$.familyCustom2Caption, this.settings.$.familyCustom2Values],
        [this.settings.$.familyCustom3Caption, this.settings.$.familyCustom3Values],
        [this.settings.$.familyCustom4Caption, this.settings.$.familyCustom4Values],
        this.settings.$.forWho
      ];

      if (this.settings.isSytemForMlt)
        r.push(this.settings.$.BusyHelperAllowedFreq_nom, this.settings.$.BusyHelperAllowedFreq_denom, this.settings.$.MaxItemsQuantityInDeliveryThatAnIndependentVolunteerCanSee, this.settings.$.MaxDeliverisQuantityThatAnIndependentVolunteerCanAssignHimself);
      return r;
    }
  });
  configureSmsGlobal() {
    openDialog(InputAreaComponent, a => a.args = {
      title: use.language.smsProviderConfiguration,
      settings: {
        fields: () => [this.settings.$.smsClientNumber,
        this.settings.$.smsUsername,
        this.settings.$.smsPasswordInput,
        this.settings.$.smsVirtualPhoneNumber]
      },
      ok: () => this.settings.save()
      , buttons: [{
        text: use.language.testSmsMessage,
        click: async () => {
          await this.settings.save()
          var message = new SendTestSms(this.remult);
          message.phone = (await this.remult.getCurrentUser()).phone.thePhone;
          message.message = this.testSms();
          openDialog(InputAreaComponent, x => x.args = {
            settings: {
              fields: () => [...getFields(message)]
            },
            title: use.language.testSmsMessage,
            ok: async () => {
              let result = await message.sendTestMessage();
              this.dialog.Error(result);
            }

          })
        }
      }]
    }); ""
  }

  testSms() {
    return SendSmsAction.getMessage(this.settings.smsText, this.settings.organisationName, 'משפחת ישראלי', 'ישראל ישראלי', this.remult.user.name, window.location.origin + '/x/zxcvdf');
  }
  testSmsReminder() {
    return SendSmsAction.getMessage(this.settings.reminderSmsText, this.settings.organisationName, 'משפחת ישראלי', 'ישראל ישראלי', this.remult.user.name, window.location.origin + '/x/zxcvdf');
  }
  testEmailHelper() {
    if (this.settings.registerHelperReplyEmailText)
      return SendSmsAction.getMessage(this.settings.registerHelperReplyEmailText, this.settings.organisationName, 'משפחת ישראלי', 'ישראל ישראלי', this.remult.user.name, window.location.origin + '/x/zxcvdf');
  }
  testEmailDonor() {
    if (this.settings.registerFamilyReplyEmailText)
      return SendSmsAction.getMessage(this.settings.registerFamilyReplyEmailText, this.settings.organisationName, 'משפחת ישראלי', 'ישראל ישראלי', this.remult.user.name, window.location.origin + '/x/zxcvdf');
  }
  testSuccessSms() {
    return SendSmsAction.getSuccessMessage(this.settings.successMessageText, this.settings.organisationName, 'ישראל ישראלי');
  }
  images = new GridSettings(this.remult.repo(ApplicationImages), {
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
      'data:image;base64,' + this.images.currentRow.base64PhoneHomeImage);
  }

  onFileChange(id: string, column: FieldRef<any, string>) {
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

  private async loadFiles(files: any) {
    for (let index = 0; index < files.length; index++) {
      const file = files[index];
      let f: File = file;
      await new Promise((res) => {
        var fileReader = new FileReader();

        fileReader.onload = async (e: any) => {
          var img = new Image();

          var canvas = document.createElement("canvas");
          if (true) {
            img.onload = async () => {
              var ctx = canvas.getContext("2d");
              ctx.drawImage(img, 0, 0);

              var MAX_WIDTH = 120;
              var MAX_HEIGHT = 120;
              var width = img.width;
              var height = img.height;

              if (width > height) {
                if (width > MAX_WIDTH) {
                  height *= MAX_WIDTH / width;
                  width = MAX_WIDTH;
                }
              } else {
                if (height > MAX_HEIGHT) {
                  width *= MAX_HEIGHT / height;
                  height = MAX_HEIGHT;
                }
              }
              canvas.width = width;
              canvas.height = height;
              var ctx = canvas.getContext("2d");
              ctx.drawImage(img, 0, 0, width, height);

              var x = canvas.toDataURL("image/png");

              let y = x.indexOf(',');
              this.images.currentRow.base64PhoneHomeImage = x.substring(y + 1).trim();
            }
            img.src = e.target.result.toString();
          }
          //   this.image.image.value = e.target.result.toString();
          //   this.image.fileName.value = f.name;
          res({});

        };
        fileReader.readAsDataURL(f);
      });
    }
  }

  onFileInput(e: any) {
    this.loadFiles(e.target.files);
  }


  getIcon() {
    return this.sanitization.bypassSecurityTrustResourceUrl(
      'data:image;base64,' + this.images.currentRow.base64Icon);
  }
  async deleteFamilies() {
    let codeWord = new InputField<string>({ caption: this.settings.lang.codeWord });
    let codeWords = ["נועם", "יעל", "עופרי", "מעיין", "איתמר", "יוני", "ניצן", "חגי", "נגה"];
    if (!(this.settings.lang.languageCode == 'iw')) {
      codeWords = ["Noam", "Yoni", "Itamar", "Maayan", "Nitzan", "Hagai", "Noga", "Ofri"]

    }
    let correctCodeWord = codeWords[Math.trunc(Math.random() * codeWords.length)];
    let doIt = false;
    let count = await this.remult.repo(Families).count({ status: FamilyStatus.ToDelete });
    if (!await this.dialog.YesNoPromise(this.settings.lang.areYouSureYouWantToDelete + " " + count + this.settings.lang.families + "?"))
      return;
    await openDialog(InputAreaComponent, x => {
      x.args = {
        title: this.settings.lang.toConfirmPleaseTypeTheCodeWord + '"' + correctCodeWord + '"',
        settings: { fields: () => [codeWord] }, ok: () => doIt = true, cancel: () => doIt = false
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
    this.settings.id = 1;

    this.settings.smsText = this.settings.lang.defaultSmsText;
    this.settings.reminderSmsText = this.settings.lang.reminderSmsText;
    this.settings.commentForSuccessDelivery = this.settings.lang.commentForSuccessDelivery;
    this.settings.commentForSuccessLeft = this.settings.lang.commentForSuccessLeft;
    this.settings.commentForProblem = this.settings.lang.commentForProblem;
    this.settings.messageForDoneDelivery = this.settings.lang.messageForDoneDelivery;
    this.settings.deliveredButtonText = this.settings.lang.deliveredButtonText;
    this.settings.setDefaultsForProblemStatuses();
    this.settings.boxes1Name = this.settings.lang.boxes1Name;
    this.settings.boxes2Name = this.settings.lang.boxes2Name;
    this.settings.questionForVolunteerWhenUploadingPhoto = this.settings.lang.defaultQuestionForVolunteerWhenUploadingPhoto;
    var b = await this.remult.repo(BasketType).findFirst();
    if (b) {
      b.name = this.settings.lang.foodParcel;
      await b.save();
      this.basketType.reloadData();
    }
    let d = await this.remult.repo(DistributionCenters).findFirst();
    if (d) {
      d.name = this.settings.lang.defaultDistributionListName;
      await d.save();
      this.distributionCenters.reloadData();
    }
  }


  @BackendMethod({ allowed: Roles.admin, queue: true })
  static async deleteFamiliesOnServer(remult?: Remult, progress?: ProgressListener) {


    let i = 0;
    for await (const f of remult.repo(Families).query({
      where: { status: FamilyStatus.ToDelete },
      orderBy: { createDate: "desc" },
      progress
    })) {
      await f.delete();
      i++;
    }
    return i;
  }



}

@Entity<GroupsStatsPerDistributionCenter>('GroupsStatsPerDistributionCenter', {
  allowApiRead: Roles.distCenterAdmin,
  defaultOrderBy: { name: "asc" }
},
  (options, remult) =>
    options.sqlExpression = async (self) => {
      let f = SqlFor(remult.repo(ActiveFamilyDeliveries));
      let g = SqlFor(remult.repo(Groups));
      let d = SqlFor(remult.repo(DistributionCenters));
      let sql = new SqlBuilder(remult);
      sql.addEntity(f, 'Families');
      sql.addEntity(g, 'groups');
      return sql.entityDbName(
        {
          select: () => [g.name, sql.columnWithAlias(d.id, self.distCenter), sql.countInnerSelect({
            from: f,

            where: () => [
              sql.build(f.groups, ' like \'%\'||', g.name, '||\'%\''),
              f.where(FamilyDeliveries.readyFilter()),
              sql.eq(f.distributionCenter, d.id)]

          }, self.familiesCount)],
          from: g,
          crossJoin: () => [d],

        })
    })
export class GroupsStatsPerDistributionCenter extends EntityBase implements GroupsStats {
  @Field()
  name: string;
  @Field()
  distCenter: DistributionCenters;
  @Field()
  familiesCount: number;

  constructor(private remult: Remult) {
    super();
  }

}
@Entity<GroupsStatsForAllDeliveryCenters>('GroupsStatsForAllDeliveryCenters', {
  allowApiRead: Roles.distCenterAdmin,
  defaultOrderBy: { name: "asc" },
},
  (options, remult) => {
    options.sqlExpression = async (self) => {
      let f = SqlFor(remult.repo(ActiveFamilyDeliveries));
      let g = SqlFor(remult.repo(Groups));

      let sql = new SqlBuilder(remult);
      sql.addEntity(f, 'Families');
      sql.addEntity(g, 'groups');
      return sql.entityDbName(
        {
          select: async () => [g.name, await sql.countInnerSelect({
            from: f,
            where: () => [
              sql.build(f.groups, ' like \'%\'||', g.name, '||\'%\''),
              f.where(FamilyDeliveries.readyFilter())]
          }, self.familiesCount)],
          from: g
        })
    }
  })
export class GroupsStatsForAllDeliveryCenters extends EntityBase implements GroupsStats {
  @Field()
  name: string;
  @Field()
  familiesCount: number;

  constructor(private remult: Remult) {
    super();
  }
}
export interface GroupsStats {
  name: string;
  familiesCount: number;

}

@Controller("sendTestSms")
export class SendTestSms {
  constructor(private remult: Remult) {


  }
  @Field({ translation: l => l.phone })
  phone: string;
  @Field({ translation: l => l.customSmsMessage })
  message: string;
  @BackendMethod({ allowed: Roles.admin })
  async sendTestMessage() {
    let settings = await ApplicationSettings.getAsync(this.remult);
    if (!settings.bulkSmsEnabled)
      throw "can only use this with bulk sms enabled";
    return await new SendSmsUtils().sendSms(this.phone, this.message, this.remult, undefined);
  }

}