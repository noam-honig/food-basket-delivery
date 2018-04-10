import { Component, OnInit, Input } from '@angular/core';
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
  items = new GridSettings(new Items(), {
    get: {
      where: i => i.projectId.isEqualTo(this.projectId)
    }
  });
  @Input() projectId: string;
  @Input() projectHelperId: string;

  helperQuantity(item: Items): ItemsPerHelper {
    if (item) {
      var r = item.lookup(new ItemsPerHelper(), iph =>
        iph.itemId.isEqualTo(item.id).and(iph.projectHelperId.isEqualTo(this.projectHelperId)));
      r.itemId.value = item.id.value;
      r.projectHelperId.value = this.projectHelperId;
      return r;
    }
  }
  async saveAll() {

    for (let i = 0; i < this.items.items.length; i++) {
      let item = this.items.items[i];
      let x = this.helperQuantity(this.items.items[i]);
      if (x != null) {
        
        if (!x.isNew() || x.quantity.value > 0)
          await x.save();
      }
    }
  }
}
