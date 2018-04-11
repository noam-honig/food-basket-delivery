import { Component, OnInit, Input } from '@angular/core';
import { GridSettings } from 'radweb';
import { Items } from '../models';
import { foreachSync } from '../shared/utils';
import { SelectService } from '../select-popup/select-service';

@Component({
  selector: 'app-project-items',
  templateUrl: './project-items.component.html',
  styleUrls: ['./project-items.component.css']
})
export class ProjectItemsComponent implements OnInit {

  constructor
    (
    private dialog: SelectService
    ) { }
  @Input() projectId: string;
  ngOnInit() {

  }
  items = new GridSettings(new Items(), {
    allowDelete: true,
    allowUpdate: true,
    allowInsert: true,
    columnSettings: items => [
      { column: items.quantity, width: '60' },
      items.item
    ],
    get: {
      where: items => items.projectId.isEqualTo(this.projectId)
    },
    onNewRow: items => items.projectId.value = this.projectId

  });
  deleteCurrentRow() {

    let item = this.items.currentRow;
    if (item)
      this.dialog.confirmDelete(item.item.value, () => {
        if (this.items.currentRow.isNew())
          this.items.currentRow.reset();
        else
          this.items.currentRow.delete();
      });
  }
  async saveAll() {
    foreachSync(this.items.items, async item => item.save());
  }
}
