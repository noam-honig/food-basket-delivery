import { Component, OnInit } from '@angular/core';
import { Context, Column, DataControlInfo, StringColumn, BusyService, EntityWhere } from '@remult/core';
import { InRouteHelpers, HelperCommunicationHistory } from './in-route-helpers';
import { HelperAssignmentComponent } from '../helper-assignment/helper-assignment.component';
import { use } from '../translate';
import { Helpers } from '../helpers/helpers';
import { GridDialogComponent } from '../grid-dialog/grid-dialog.component';
import { ActiveFamilyDeliveries } from '../families/FamilyDeliveries';
import { helperHistoryInfo } from '../delivery-history/delivery-history.component';
import { InputAreaComponent } from '../select-popup/input-area/input-area.component';
import { DeliveryStatus } from '../families/DeliveryStatus';
import { saveToExcel } from '../shared/saveToExcel';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { DialogService } from '../select-popup/dialog';

@Component({
  selector: 'app-in-route-follow-up',
  templateUrl: './in-route-follow-up.component.html',
  styleUrls: ['./in-route-follow-up.component.scss']
})
export class InRouteFollowUpComponent implements OnInit {

  constructor(private context: Context, private settings: ApplicationSettings, private busy: BusyService,private dialog:DialogService) { }
  helpers = this.context.for(InRouteHelpers).gridSettings({
    get: {
      limit: 25,
      where: x => this.currentOption.where(x)
    },
    knowTotalRows: true,
    showFilter: true,
    numOfColumnsInGrid: 99,
    gridButtons: [{
      name: use.language.exportToExcel,
      click: () => saveToExcel(this.settings, this.context.for(InRouteHelpers), this.helpers, "מתנדבים בדרך", this.busy)
    }],
    rowCssClass: x => {
      if ((x.minAssignDate.value < daysAgo(7)) && (!x.lastCommunicationDate.value || x.lastCommunicationDate.value < daysAgo(7)))
        return 'addressProblem';
      else
        return '';
    },
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
            numOfColumnsInGrid: 7,
            knowTotalRows: true,
            rowCssClass: fd => fd.deliverStatus.getCss(),

            columnSettings: fd => {
              let r: DataControlInfo[] = [
                fd.name,
                fd.address,
                { column: fd.internalDeliveryComment, width: '400' },

                fd.courierAssingTime,
                fd.deliverStatus,
                fd.deliveryStatusDate,
                fd.basketType,
                fd.quantity,
                fd.distributionCenter,
                fd.courierComments,
                { column: fd.courierComments, width: '400' }
              ]
              r.push(...fd.columns.toArray().filter(c => !r.includes(c) && c != fd.id && c != fd.familySource).sort((a, b) => a.defs.caption.localeCompare(b.defs.caption)));
              return r;
            },
            get: {
              where: fd => fd.courier.isEqualTo(h.id).and(fd.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery)),
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
    },
    {
      name: 'הוסף תכתובת',
      click: async s => {
        s.addCommunication(() => { });
      }
    },
    {
      name: use.language.volunteerInfo,
      click: async s => {
        let h = await this.context.for(Helpers).findId(s.id);
        h.displayEditDialog(this.dialog,this.busy);
      }
    }]
  });

  ngOnInit() {
  }

  radioOption: filterOptions[] = [
    {
      text: 'כולם',
      where: () => undefined
    },
    {
      text: 'לא ראו אף שיוך',
      where: s => s.seenFirstAssign.isEqualTo(false).and(s.minAssignDate.isLessOrEqualTo(daysAgo(2)))
    },
    {
      text: 'שיוך ראשון לפני יותר מ 7 ימים',
      where: s => s.minAssignDate.isLessOrEqualTo(daysAgo(7))
    }
  ]
  currentOption = this.radioOption[0];

}

interface filterOptions {
  text: string,
  where: EntityWhere<InRouteHelpers>
}
function daysAgo(num: number) {
  let d = new Date();
  d.setDate(d.getDate() - num);
  return d;
}