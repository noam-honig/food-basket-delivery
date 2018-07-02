import { Component, OnInit, ViewChild } from '@angular/core';
import { GridSettings } from 'radweb';
import { Families, Language, Helpers, DeliveryStatus, BasketType } from '../models';
import { AuthService } from '../auth/auth-service';
import { SelectService } from '../select-popup/select-service';
import { AddBoxAction } from './add-box-action';
import { UserFamiliesList } from '../my-families/user-families';
import { SendSmsAction } from './send-sms-action';
import { GetBasketStatusAction, BasketInfo } from './get-basket-status-action';
import { MapComponent } from '../map/map.component';


@Component({
  selector: 'app-asign-family',
  templateUrl: './asign-family.component.html',
  styleUrls: ['./asign-family.component.scss']
})
export class AsignFamilyComponent implements OnInit {


  async searchPhone() {
    this.name = undefined;
    this.id = undefined;
    if (this.phone.length == 10) {
      let h = new Helpers();
      let r = await h.source.find({ where: h.phone.isEqualTo(this.phone) });
      if (r.length > 0) {
        this.name = r[0].name.value;
        this.id = r[0].id.value;
        this.refreshList();
      } else {
        this.refreshList();
      }
    }
  }
  baskets: BasketInfo[];
  async refreshList() {

    
      SendSmsAction.generateMessage(this.id, (p, m) => this.smsMessage = m);
      this.familyLists.initForHelper(this.id).then(() => {
        this.map.test(this.familyLists.allFamilies);
        if (this.map.mapVisible)
          this.map.mapVisible = this.familyLists.allFamilies.length > 0;
      });
      this.baskets = (await new GetBasketStatusAction().run({})).baskets;
    
  }
  familyLists = new UserFamiliesList();
  filterLangulage = -1;
  langulages: Language[] = [
    new Language(-1, 'הכל'),
    Language.Hebrew,
    Language.Amharit,
    Language.Russian
  ];
  phone: string;
  name: string;
  id: string;
  clearHelper() {
    this.phone = undefined;
    this.name = undefined;
    this.id = undefined;
    this.clearList();

  }
  clearList() {
    this.familyLists.clear();
    this.map.test([]);
    this.map.mapVisible = false;
  }
  findHelper() {
    this.dialog.selectHelper(h => {
      this.phone = h.phone.value;
      this.name = h.name.value;
      this.id = h.id.value;

      this.refreshList();
    });
  }
  async cancelAssign(f: Families) {
    f.courier.value = '';

    await f.save();
    this.refreshList();

  }

  constructor(private auth: AuthService, private dialog: SelectService) { }

  ngOnInit() {

  }
  async assignItem(basket: BasketInfo, filterLangulage: number) {
    
      let x = await new AddBoxAction().run({
        phone: this.phone,
        name: this.name,
        basketType: basket.id,
        helperId: this.id,
        language: filterLangulage
      });
      if (x.ok) {
        basket.unassignedFamilies--;
        this.id = x.helperId;
        await this.refreshList();

      }
      else {
        this.refreshList();
        this.dialog.Info("לא נמצאה משפחה מתאימה");
      }
      this.id = x.helperId;

    
  }

  sendSms() {
    new SendSmsAction().run({ helperId: this.id });
  }
  showSms() {
    SendSmsAction.generateMessage(this.id, (p, m) =>
      this.dialog.Info(m));
  }
  smsMessage: string;
  async sendSmsFromPhone() {
    window.open('sms:' + this.phone + ';?&body=' + encodeURI(this.smsMessage), '_blank');
  }

  @ViewChild("map") map: MapComponent;
}
