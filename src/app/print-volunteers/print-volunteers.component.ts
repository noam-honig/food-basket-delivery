import { Component, OnInit } from '@angular/core';
import { BusyService } from '@remult/angular';
import { Context, ServerFunction } from '@remult/core';
import { Roles } from '../auth/roles';
import { ActiveFamilyDeliveries } from '../families/FamilyDeliveries';
import { HelperId } from '../helpers/helpers';
import { PromiseThrottle } from '../shared/utils';

@Component({
  selector: 'app-print-volunteers',
  templateUrl: './print-volunteers.component.html',
  styleUrls: ['./print-volunteers.component.scss']
})
export class PrintVolunteersComponent implements OnInit {

  constructor(private context: Context, private busy: BusyService) { }
  volunteers: volunteer[] = [];
  total: number = 0;
  ngOnInit() {
    PrintVolunteersComponent.volunteersForPrint().then(x => {
      this.volunteers = x.volunteers;
      this.total = x.total;
    });

  }
  @ServerFunction({ allowed: Roles.admin })
  static async volunteersForPrint(context?: Context) {
    let total = 0;
    let volunteers: volunteer[] = [];
    for await (const d of context.for(ActiveFamilyDeliveries).iterate()) {
      await d.$.courier.load();
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