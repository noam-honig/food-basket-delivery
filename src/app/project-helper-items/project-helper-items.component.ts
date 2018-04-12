import { Component, OnInit, Input } from '@angular/core';
import { GridSettings } from 'radweb';
import { Items, ItemsPerHelper } from '../models';
import { foreachSync } from '../shared/utils';

@Component({
  selector: 'app-project-participant',
  templateUrl: './project-helper-items.component.html',
  styleUrls: ['./project-helper-items.component.scss']
})
export class ProjectHelperItemsComponent implements OnInit {

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
      let x: any = r;
      if (!r.wasChanged())
        x.__origQuantity = r.quantity.value | 0;
      return r;
    }
  }
  getTotalSoFar(item: Items) {
    let r = item.totalSoFar() | 0;
    let iph = this.helperQuantity(item);
    let x: any = iph;
    r -= x.__origQuantity | 0;
    r += iph.quantity.value | 0;
    return r;



  }

  async saveAll() {
    foreachSync(this.items.items, async item => {
      let hq = this.helperQuantity(item);
      if (hq != null) {
        if (!hq.isNew()&&hq.wasChanged() || hq.quantity.value > 0) {
          await hq.save();
          let x: any = hq;
          x.__origQuantity = hq.quantity.value | 0;
          item.resetTotalSoFar();
        }
      }
      
    });
  }
}
