import { Component, OnInit, ViewChild } from '@angular/core';
import { GridSettings } from 'radweb';
import { Families, Language, Helpers, DeliveryStatus, BasketType } from '../models';
import { AuthService } from '../auth/auth-service';
import { SelectService } from '../select-popup/select-service';
import { AddBoxAction } from './add-box-action';
import { UserFamiliesList } from '../my-families/user-families';
import { SendSmsAction } from './send-sms-action';
import { GetBasketStatusAction, BasketInfo, CityInfo } from './get-basket-status-action';
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
        this.refreshBaskets();
      }
    }
  }
  filterCity = '';
  selectCity(value: string) {
    this.refreshBaskets();
  }
  langChange(lang: string) {
    if (this.filterLangulage != +lang) {
      this.filterLangulage = +lang;
      this.refreshList();
    }
  }
  assignmentCanceled() {
    this.refreshBaskets();
  }
  async refreshBaskets() {
    let r = (await new GetBasketStatusAction().run({
      filterLanguage: this.filterLangulage,
      filterCity: this.filterCity
    }))
    this.baskets = r.baskets;
    this.cities = r.cities;
  }
  baskets: BasketInfo[];
  cities: CityInfo[];
  async refreshList() {
    this.refreshBaskets();
    this.familyLists.initForHelper(this.id);

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

}
