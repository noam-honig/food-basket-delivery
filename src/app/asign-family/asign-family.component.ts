import { Component, OnInit } from '@angular/core';
import { GridSettings } from 'radweb';
import { Families, Language, Helpers, DeliveryStatus } from '../models';
import { AuthService } from '../auth/auth-service';
import { SelectService } from '../select-popup/select-service';
import { AddBoxAction } from './add-box-action';
import { UserFamiliesList } from '../my-families/user-families';

@Component({
  selector: 'app-asign-family',
  templateUrl: './asign-family.component.html',
  styleUrls: ['./asign-family.component.scss']
})
export class AsignFamilyComponent implements OnInit {


  async searchPhone() {
    if (this.phone.length == 10) {
      let h = new Helpers();
      let r = await h.source.find({ where: h.phone.isEqualTo(this.phone) });
      if (r.length > 0) {
        this.name = r[0].name.value;
        this.id = r[0].id.value;
      } else {
        this.name = undefined;
        this.id = undefined;
      }
      this.familyLists.initForHelper(this.id);
    }
  }
  familyLists = new UserFamiliesList();
  filterLangulage = -1;
  langulages: Language[] = [
    Language.Hebrew,
    Language.Amharit,
    Language.Russian
  ];
  phone: string;
  name: string;
  id: string;
  findHelper() {
    this.dialog.selectHelper(h => {
      this.phone = h.phone.value;
      this.name = h.name.value;
    });
  }
  async cancelAssign(f:Families){
    f.courier.value = undefined;
    f.deliverStatus.listValue = DeliveryStatus.NotYet;
    await f.save();
    this.familyLists.remove(f);

  }
  families = new GridSettings(new Families(), {
    get: {
      where: f => f.courier.isEqualTo(this.auth.auth.info.helperId),
      limit: 9999
    }
  });
  constructor(private auth: AuthService, private dialog: SelectService) { }

  ngOnInit() {
    this.families.getRecords();
  }
  async assignItem() {
    let x = await new AddBoxAction().run({
      phone: this.phone,
      name: this.name,
      helperId: this.id
    });
    this.id = x.helperId;
    this.familyLists.initForHelper(this.id);

    console.log(x);
  }


}
