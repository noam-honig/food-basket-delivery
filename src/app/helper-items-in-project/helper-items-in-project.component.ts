import { Component, OnInit, Input } from '@angular/core';
import { GridSettings } from 'radweb';
import { Items, ItemsPerHelper } from '../models';
import { foreachSync } from '../shared/utils';

@Component({
  selector: 'app-project-participant',
  templateUrl: './helper-items-in-project.component.html',
  styleUrls: ['./helper-items-in-project.component.scss']
})
export class HelperItemsInProjectComponent implements OnInit {

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
    foreachSync(this.items.items, async item => {
      let x = this.helperQuantity(item);
      if (x != null) {
        if (!x.isNew() || x.quantity.value > 0)
          await x.save();
      }
    });

  }

}
