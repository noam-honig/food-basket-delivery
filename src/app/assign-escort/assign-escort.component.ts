import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Context, DataAreaSettings } from '@remult/core';
import { Helpers, HelperUserInfo, HelpersBase } from '../helpers/helpers';
import { SelectHelperComponent } from '../select-helper/select-helper.component';
import { HelpersAndStats } from '../delivery-follow-up/HelpersAndStats';
import { DialogService } from '../select-popup/dialog';
import { YesNoQuestionComponent } from '../select-popup/yes-no-question/yes-no-question.component';
import { environment } from '../../environments/environment';
import { SendSmsAction } from '../asign-family/send-sms-action';
import { ApplicationSettings } from '../manage/ApplicationSettings';

@Component({
  selector: 'app-assign-escort',
  templateUrl: './assign-escort.component.html',
  styleUrls: ['./assign-escort.component.scss']
})
export class AssignEscortComponent implements OnInit {

  constructor(private context: Context, private dialog: DialogService, private settings: ApplicationSettings) { }
  @ViewChild("phoneInput", { static: false }) phoneInput: ElementRef;
  async ngOnInit() {
    if (!environment.production) {
      this.phone = '0507330590';
      await this.searchPhone();
    }
  }
  phone: string = '';
  helper: HelpersBase;
  async searchPhone() {
    this.clearHelperInfo(false);

    if (this.phone.length == 10) {
      let h = await this.context.for(HelpersAndStats).findFirst(h => h.phone.isEqualTo(this.phone));
      if (h) {

        this.initHelper(h);
      }
      else {
        let h = this.context.for(Helpers).create();
        h.phone.value = this.phone;
        this.initHelper(h);
      }

    }
  }
  async assignForDriver(driver: HelpersAndStats) {
    if (this.helper.wasChanged()) {
      await this.helper.save();
    }

    let h = await this.context.for(Helpers).findFirst(h => h.id.isEqualTo(driver.id));
    h.escort.value = this.helper.id.value;
    await h.save();
    if (await this.context.openDialog(YesNoQuestionComponent, x => x.args = { question: 'האם גם לשלוח SMS ל' + this.helper.name.value }, x => x.yes)) {
      await SendSmsAction.SendSms(this.helper.id.value, false);
    }
    this.dialog.Info(this.helper.name.value + " הוגדר כמלווה של " + this.helper.name.value);
    this.clearHelperInfo();

  }
  async saveHelper() {
    this.helper.save();
    this.clearHelperInfo();
  }
  async sendSms() {
    await SendSmsAction.SendSms(this.helper.id.value, false);
    this.dialog.Info("נשלחה הודעת SMS למלווה " + this.helper.name.value);
    this.clearHelperInfo();
  }
  async clearEscort() {
    this.alreadyEscortingDriver.escort.value = '';
    await this.alreadyEscortingDriver.save();
    let h = await this.context.for(HelpersAndStats).findFirst(h => h.id.isEqualTo(this.helper.id));
    this.clearHelperInfo();
    this.initHelper(h);

  }
  alreadyEscortingDriver: Helpers;
  async initHelper(h: HelpersBase) {

    if (!h.isNew()) {
      let assignedFamilies = 0;
      if (h instanceof HelpersAndStats)
        assignedFamilies = h.deliveriesInProgress.value;
      else
        assignedFamilies = await (await this.context.for(HelpersAndStats).findFirst(x => x.id.isEqualTo(h.id))).deliveriesInProgress.value
      if (assignedFamilies > 0) {
        await this.context.openDialog(YesNoQuestionComponent, x =>
          x.args = {
            question: "למתנדב " + h.name.value + " כבר מוגדרות משפחות, לא ניתן להגדיר אותו כמלווה",
            showOnlyConfirm: true
          }
        );
        this.clearHelperInfo();
        return;
      }
      Helpers.addToRecent(h);
    }
    this.helper = h;
    this.phone = h.phone.value;
    this.area = new DataAreaSettings<Helpers>({
      columnSettings: () => {
        let r = [];
        if (this.settings.showCompanies.value)
          r.push([this.helper.name, this.helper.company]);
        else r.push([this.helper.name]);
        if (this.settings.showHelperComment.value)
          r.push(this.helper.eventComment);
        
        

        return r;
      }
    });
    if (this.helper.theHelperIAmEscorting.value) {
      this.alreadyEscortingDriver = await this.context.for(Helpers).findFirst(h => h.id.isEqualTo(this.helper.theHelperIAmEscorting));
    } else {
      this.optionalDrivers = await this.context.for(HelpersAndStats).find({
        where: h =>
          h.needEscort.isEqualTo(true)
            .and(h.escort.isEqualTo('')
              .and(h.theHelperIAmEscorting.isEqualTo('')))
            .and(h.id.isDifferentFrom(this.helper.id)),
        orderBy: h => [{ column: h.deliveriesInProgress, descending: true }, h.name]
      });
    }
  }
  
  findHelper() {
    this.context.openDialog(SelectHelperComponent, s => s.args = {
      distCenter:(<HelperUserInfo>this.context.user).distributionCenter,
      onSelect: async h => {
        if (h) {

          this.initHelper(h);

        }
        else {
          this.clearHelperInfo();
        }
      }
    })
  }
  optionalDrivers: HelpersAndStats[] = [];
  area: DataAreaSettings<Helpers>;
  clearHelperInfo(clearPhone = true) {
    if (clearPhone)
      this.phone = '';
    this.area = undefined;
    this.optionalDrivers = [];
    this.alreadyEscortingDriver = undefined;
    this.helper = undefined;
    if (this.phoneInput && clearPhone)
      setTimeout(() => {
        this.phoneInput.nativeElement.focus();
      }, 200);
  }
  showSave() {
    return this.helper && this.helper.wasChanged();
  }
}
