import { Component, OnInit } from '@angular/core';
import { GridSettings } from 'radweb';
import { Items } from '../models';

@Component({
  selector: 'app-projects',
  templateUrl: './projects.component.html',
  styleUrls: ['./projects.component.scss']
})
export class ProjectsComponent {

  items = new GridSettings(new Items(), {
    allowDelete: true,
    allowUpdate: true,
    allowInsert: true,
    columnSettings: items => [
      { column: items.quantity, width: '60' },
      items.item
    ]

  });
  deleteCurrentRow() {
    if (this.items.currentRow)
      if (this.items.currentRow.isNew())
        this.items.currentRow.reset();
      else
        this.items.currentRow.delete();
  }
  async saveAll() {
    console.log(this.items.items);
    for (let i = 0; i < this.items.items.length; i++) {
      await this.items.items[i].save();
    }
  }

}
