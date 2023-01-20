import { Component, OnInit } from '@angular/core';
import { GridSettings } from '../common-ui-elements/interfaces';
import { remult } from 'remult';
import { DialogService } from '../select-popup/dialog';
import { Callers } from './callers';

@Component({
  selector: 'app-manage-callers',
  templateUrl: './manage-callers.component.html',
  styleUrls: ['./manage-callers.component.scss']
})
export class ManageCallersComponent implements OnInit {

  constructor(private ui: DialogService) { }

  grid = new GridSettings(remult.repo(Callers), {
    knowTotalRows: true,
    allowUpdate: true,
    allowSelection: true,
    gridButtons: [{
      name: "הוסף",
      click: async () => {
        this.ui.selectHelper({

          onSelect: async hb => {
            const h = await hb.getHelper();
            h.caller = true;
            await h.save();
            this.grid.reloadData();
          }
        })

      },

    }, {
      name: "הסר",
      click: async () => {
        this.ui.doWhileShowingBusy(async () => {
          const items = this.grid.selectedRows;
          if (items.length == 0)
            items.push(this.grid.currentRow);
          for (const h of items) {
            h.caller = false;
            await h.save();
          }
          this.grid.reloadData();
        })
      }
    }],
    columnSettings: x => [
      x.name,
      x.callQuota,
      x.callsCompleted,
      x.lastCallDate,
      x.includeGroups,
      x.excludeGroups
    ]
  });

  ngOnInit(): void {
  }

}
