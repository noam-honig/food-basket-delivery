import { Component, OnInit } from '@angular/core';
import { BusyService } from '@remult/angular';
import { Remult, BackendMethod } from 'remult';
import { Roles } from '../auth/roles';
import { ActiveFamilyDeliveries } from '../families/FamilyDeliveries';

@Component({
  selector: 'app-print-volunteers',
  templateUrl: './print-volunteers.component.html',
  styleUrls: ['./print-volunteers.component.scss']
})
export class PrintVolunteersComponent implements OnInit {

  constructor(private remult: Remult, private busy: BusyService) { }
  volunteers: volunteer[] = [];
  total: number = 0;
  ngOnInit() {
    PrintVolunteersComponent.volunteersForPrint().then(x => {
      this.volunteers = x.volunteers;
      this.total = x.total;
    });

  }
  @BackendMethod({ allowed: Roles.admin })
  static async volunteersForPrint(remult?: Remult) {
    let total = 0;
    let volunteers: volunteer[] = [];
    for await (const d of  remult.repo(ActiveFamilyDeliveries).iterate()) {
      let v = volunteers.find(v => d.courier && v.id == d.courier.id);
      if (!v) {
        v = {
          id: d.courier.id,
          name: d.courier.name,
          quantity: 0
        }
        volunteers.push(v);
      }
      v.quantity += d.quantity;
      total++;
    }
    volunteers.sort((a, b) => a.name.localeCompare(b.name));

    return { total, volunteers };
  }

}

interface volunteer {
  id: string,
  name: string,
  quantity: number
}