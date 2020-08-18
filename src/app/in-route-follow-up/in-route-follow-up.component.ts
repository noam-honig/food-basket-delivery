import { Component, OnInit } from '@angular/core';
import { Context, Column, DataControlInfo, StringColumn } from '@remult/core';
import { InRouteHelpers, HelperCommunicationHistory } from './in-route-helpers';
import { HelperAssignmentComponent } from '../helper-assignment/helper-assignment.component';
import { use } from '../translate';
import { Helpers } from '../helpers/helpers';
import { GridDialogComponent } from '../grid-dialog/grid-dialog.component';
import { ActiveFamilyDeliveries } from '../families/FamilyDeliveries';
import { helperHistoryInfo } from '../delivery-history/delivery-history.component';
import { InputAreaComponent } from '../select-popup/input-area/input-area.component';

@Component({
  selector: 'app-in-route-follow-up',
  templateUrl: './in-route-follow-up.component.html',
  styleUrls: ['./in-route-follow-up.component.scss']
})
export class InRouteFollowUpComponent implements OnInit {

  constructor(private context: Context) { }
  helpers = this.context.for(InRouteHelpers).gridSettings({
    get: {
      limit: 50
    },
    knowTotalRows: true,
    rowButtons: [{
      textInMenu: () => use.language.assignDeliveryMenu,
      icon: 'list_alt',
      showInLine: true,
      visible: h => !h.isNew(),
      click: async s => {
        s.showAssignment();
      }
    }, {
      name: use.language.ActiveDeliveries,
      visible: h => !h.isNew(),
      click: async h => {
        this.context.openDialog(GridDialogComponent, x => x.args = {
          title: use.language.deliveriesFor + ' ' + h.name.value,
          buttons: [
            {
              text: 'תכתובות',
              click: () => h.showHistory()
            },
            {
              text: 'שיוך משלוחים',
              click: () => h.showAssignment()
            }
          ],
          settings: this.context.for(ActiveFamilyDeliveries).gridSettings({
            numOfColumnsInGrid: 6,
            knowTotalRows: true,
            rowCssClass: fd => fd.deliverStatus.getCss(),

            columnSettings: fd => {
              let r: DataControlInfo[] = [
                fd.name,
                fd.address,
                { column: fd.internalDeliveryComment, width: '400' },
                { column: fd.courierComments, width: '400' },
                fd.deliverStatus,
                fd.deliveryStatusDate,
                fd.basketType,
                fd.quantity,
                fd.distributionCenter,
                fd.courierComments
              ]
              r.push(...fd.columns.toArray().filter(c => !r.includes(c) && c != fd.id && c != fd.familySource).sort((a, b) => a.defs.caption.localeCompare(b.defs.caption)));
              return r;
            },
            get: {
              where: fd => fd.courier.isEqualTo(h.id),
              orderBy: fd => [{ column: fd.deliveryStatusDate, descending: true }],
              limit: 25
            }
          })
        });
      }
    },
    {
      name: 'תכתובות',
      click: async h => {
        h.showHistory();
      }
    }]
  });

  ngOnInit() {
  }

}
