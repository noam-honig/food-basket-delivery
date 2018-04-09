import { Component, OnInit } from '@angular/core';
import { GridSettings } from 'radweb';
import { Items, ItemsPerHelper } from '../models';

@Component({
  selector: 'app-project-participant',
  templateUrl: './project-participant.component.html',
  styleUrls: ['./project-participant.component.scss']
})
export class ProjectParticipantComponent implements OnInit {

  ngOnInit(): void {
    this.items.getRecords();
  }
  items = new GridSettings(new Items());

  helperQuantity(item: Items): ItemsPerHelper {
    if (item) {
      var r = item.lookup(new ItemsPerHelper(), item.id);
      r.itemId.value = item.id.value;
      return r;
    }
  }
  async saveAll() {
    
    for (let i = 0; i < this.items.items.length; i++) {
      let item = this.items.items[i];
      let x = this.helperQuantity(this.items.items[i]);
      if (x != null) {
        console.log(x.isNew(),x.quantity.value);
        if (!x.isNew() || x.quantity.value > 0)
          await x.save();
      }
    }
  }
}
