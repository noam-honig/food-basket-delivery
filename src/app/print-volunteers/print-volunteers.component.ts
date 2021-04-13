import { Component, OnInit } from '@angular/core';
import { BusyService } from '@remult/angular';
import { Context } from '@remult/core';
import { ActiveFamilyDeliveries } from '../families/FamilyDeliveries';

@Component({
  selector: 'app-print-volunteers',
  templateUrl: './print-volunteers.component.html',
  styleUrls: ['./print-volunteers.component.scss']
})
export class PrintVolunteersComponent implements OnInit {

  constructor(private context: Context, private busy: BusyService) { }
  volunteers: {
    id: string,
    name: string,
    quantity: number
  }[] = [];
  total: number = 0;
  ngOnInit() {
    this.busy.doWhileShowingBusy(async () => {
      for await (const d of this.context.for(ActiveFamilyDeliveries).iterate()) {
        let v = this.volunteers.find(v => v.id == d.courier.value);
        if (!v) {
          v = {
            id: d.courier.value,
            name: await d.courier.getTheName(),
            quantity: 0
          }
          this.volunteers.push(v);
        }
        v.quantity += d.quantity.value;
        this.total++;
      }
      this.volunteers.sort((a, b) => a.name.localeCompare(b.name));
    });

  }

}

