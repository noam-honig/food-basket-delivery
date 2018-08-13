import { Component, OnInit, ViewChild } from '@angular/core';
import { GridSettings, ColumnHashSet } from 'radweb';
import { Families, Language,  DeliveryStatus, BasketType, YesNo } from '../models';
import { Helpers } from '../helpers/helpers';
import { AuthService } from '../auth/auth-service';
import { SelectService } from '../select-popup/select-service';
import { AddBoxAction } from './add-box-action';
import { UserFamiliesList } from '../my-families/user-families';
import { SendSmsAction } from './send-sms-action';
import { GetBasketStatusAction, BasketInfo, CityInfo } from './get-basket-status-action';
import { MapComponent } from '../map/map.component';
import { environment } from '../../environments/environment';


@Component({
  selector: 'app-asign-family',
  templateUrl: './asign-family.component.html',
  styleUrls: ['./asign-family.component.scss']
})
export class AsignFamilyComponent implements OnInit {


  async searchPhone() {
    this.name = undefined;
    this.shortUrl = undefined;
    this.id = undefined;
    if (this.phone.length == 10) {
      let h = new Helpers();
      let r = await h.source.find({ where: h.phone.isEqualTo(this.phone) });
      if (r.length > 0) {
        this.name = r[0].name.value;
        this.shortUrl = r[0].shortUrlKey.value;
        this.id = r[0].id.value;
        this.refreshList();
      } else {
        this.refreshList();
      }
    }
  }
  filterCity = '';
  selectCity() {
    this.refreshBaskets();
  }
  langChange() {
    this.refreshBaskets();
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
    this.specialFamilies = r.special;
  }
  baskets: BasketInfo[] = [];
  cities: CityInfo[] = [];
  specialFamilies = 0;
  async refreshList() {
    this.refreshBaskets();
    this.familyLists.initForHelper(this.id, this.name);

  }
  familyLists = new UserFamiliesList();
  filterLangulage = -1;
  langulages: Language[] = [
    new Language(-1, 'כל השפות'),
    Language.Hebrew,
    Language.Amharit,
    Language.Russian
  ];
  phone: string;
  name: string;
  shortUrl: string;
  id: string;
  clearHelper() {
    this.phone = undefined;
    this.name = undefined;
    this.shortUrl = undefined;
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
      this.shortUrl = h.shortUrlKey.value;
      this.id = h.id.value;

      this.refreshList();
    });
  }


  constructor(private auth: AuthService, private dialog: SelectService) {
    
   }

  ngOnInit() {
    if (!environment.production) {
      this.phone = '0507330590';
      this.searchPhone();
    }
  }
  async assignItem(basket: BasketInfo) {

    let x = await new AddBoxAction().run({
      phone: this.phone,
      name: this.name,
      basketType: basket.id,
      helperId: this.id,
      language: this.filterLangulage,
      city: this.filterCity
    });
    if (x.ok) {
      basket.unassignedFamilies--;
      this.id = x.helperId;
      this.familyLists.initForFamilies(this.id, this.name, x.families);
      this.baskets = x.basketInfo.baskets;
      this.cities = x.basketInfo.cities;
      this.specialFamilies = x.basketInfo.special;
    }
    else {
      this.refreshList();
      this.dialog.Info("לא נמצאה משפחה מתאימה");
    }
    this.id = x.helperId;


  }
  addSpecial() {
    this.dialog.selectFamily({
      where: f => f.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery.id).and(
        f.courier.isEqualTo('').and(f.special.isEqualTo(YesNo.Yes.id))),
      onSelect: async f => {
        f.courier.value = this.id;
        await f.save();
        this.refreshList();
      }
    })
  }

}
