import { Component, OnInit, Input } from '@angular/core';
import { GridSettings } from 'radweb';
import { Items, ItemsPerHelper } from '../models';
import { foreachSync, foreachEntityItem } from '../shared/utils';
import { SelectService } from '../select-popup/select-service';

@Component({
  selector: 'app-project-items',
  templateUrl: './project-items.component.html',
  styleUrls: ['./project-items.component.scss']
})
export class ProjectItemsComponent implements OnInit {

  constructor
    (
    private dialog: SelectService
    ) { }
  @Input() projectId: string;
  ngOnInit() {
    this.items.getRecords();
  }
  items = new GridSettings(new Items(), {
    allowDelete: true,
    allowUpdate: true,
    allowInsert: true,
    numOfColumnsInGrid: 0,
    columnSettings: items => [
      items.item,
      { column: items.quantity }
    ],
    get: {
      where: items => items.projectId.isEqualTo(this.projectId)
    },
    onNewRow: items => items.projectId.value = this.projectId

  });

  delete(item: Items) {
    if (item)
      this.dialog.confirmDelete(item.item.value, () => {
        if (this.items.currentRow.isNew())
          this.items.currentRow.reset();
        else
          this.items.currentRow.delete();
      });
  }

  //tab implementation becaust mat tab sucks!!!!
  selectedTab = 0;
  tabs = ["פרטים", "מי מביאה?"];
  //end tab implementation
  async saveAll() {
    foreachSync(this.items.items, async item => {
      if (item.wasChanged())
        item.save();
    });
    
  }
}
