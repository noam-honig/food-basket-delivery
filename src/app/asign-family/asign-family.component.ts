import { Component, OnInit } from '@angular/core';
import { GridSettings } from 'radweb';
import { Families, Language } from '../models';
import { AuthService } from '../auth/auth-service';
import { SelectService } from '../select-popup/select-service';

@Component({
  selector: 'app-asign-family',
  templateUrl: './asign-family.component.html',
  styleUrls: ['./asign-family.component.scss']
})
export class AsignFamilyComponent implements OnInit {

  filterLangulage = -1;
  langulages: Language[]= [
    Language.Hebrew,
    Language.Amharit,
    Language.Russian
  ];
  phone: string;
  name: string;
  findHelper() {
    this.dialog.selectHelper(h => {
      this.phone = h.phone.value;
      this.name = h.name.value;
    });
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


}
