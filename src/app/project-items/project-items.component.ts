import { Component, OnInit, Input } from '@angular/core';
import { GridSettings } from 'radweb';
import { Items } from '../models';

@Component({
  selector: 'app-project-items',
  templateUrl: './project-items.component.html',
  styleUrls: ['./project-items.component.css']
})
export class ProjectItemsComponent implements OnInit {

  constructor() { }
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
    if (this.items.currentRow)
      if (this.items.currentRow.isNew())
        this.items.currentRow.reset();
      else
        this.items.currentRow.delete();
  }
  async saveAll() {

    for (let i = 0; i < this.items.items.length; i++) {
      await this.items.items[i].save();
    }
  }
}
