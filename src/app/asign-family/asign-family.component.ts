import { Component, OnInit } from '@angular/core';
import { GridSettings } from 'radweb';
import { Families, Language, Helpers, DeliveryStatus, BasketType } from '../models';
import { AuthService } from '../auth/auth-service';
import { SelectService } from '../select-popup/select-service';
import { AddBoxAction } from './add-box-action';
import { UserFamiliesList } from '../my-families/user-families';
import { SendSmsAction } from './send-sms-action';
import { GetBasketStatusAction, BasketInfo } from './get-basket-status-action';


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

      }
    }
  }
  baskets: BasketInfo[];
  refreshList() {
    SendSmsAction.generateMessage(this.id, (p, m) => this.smsMessage = m);
    this.familyLists.initForHelper(this.id);
    new GetBasketStatusAction().run({}).then(r => {
      this.baskets = r.baskets;
      console.log(r);
    });

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
    f.courier.value = undefined;
    f.deliverStatus.listValue = DeliveryStatus.NotYetAssigned;
    await f.save();
    this.refreshList();

  }

  constructor(private auth: AuthService, private dialog: SelectService) { }

  ngOnInit() {

  }
  async assignItem(basket: BasketInfo) {
    let x = await new AddBoxAction().run({
      phone: this.phone,
      name: this.name,
      basketType: basket.id,
      helperId: this.id,
    });
    if (x.ok) {
      basket.unassignedFamilies--;
      this.familyLists.initForHelper(this.id);
    }
    else {
      this.refreshList();
    }
    this.id = x.helperId;

    console.log(x);
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


}
