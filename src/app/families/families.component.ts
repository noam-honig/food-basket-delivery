import { Component, OnInit, ViewChild, Sanitizer } from '@angular/core';
import { GridSettings } from 'radweb';
import { Families, Helpers, CallStatus, BasketType, FamilySources, DeliveryStatus } from '../models';
import { SelectService } from '../select-popup/select-service';
import { GeocodeInformation, GetGeoInformation } from '../shared/googleApiHelpers';

import { DomSanitizer } from '@angular/platform-browser';
import * as XLSX from 'xlsx';
import { FilterBase } from 'radweb/utils/dataInterfaces1';

@Component({
  selector: 'app-families',
  templateUrl: './families.component.html',
  styleUrls: ['./families.component.scss']
})
export class FamiliesComponent implements OnInit {

  statistics: FaimilyStatistics[] = [
    new FaimilyStatistics('הכל', f => undefined),
    new FaimilyStatistics('טרם שוייכו', f => f.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery.id).and(f.courier.isEqualTo(''))),
    new FaimilyStatistics('שוייכו וטרם נמסרו', f => f.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery.id).and(f.courier.IsDifferentFrom(''))),
    new FaimilyStatistics('נמסרו', f => f.deliverStatus.isEqualTo(DeliveryStatus.Success.id))
  ];
  filterBy(s:FaimilyStatistics){
    this.families.get({
      where:s.rule,
      limit:this.limit
    });
  }
  limit:10;
  saveToExcel() {


    let wb = XLSX.utils.book_new();
    let data = [];
    let title = [];
    let doneTitle = false;
    this.families.items.forEach(f => {
      let row = [];

      f.__iterateColumns().forEach(c => {
        if (!doneTitle) {
          title.push(c.caption);
        }
        let v = c.displayValue;
        if (v == undefined)
          v = '';
        v = v.toString();
        row.push(v);
      });
      if (!doneTitle) {
        data.push(title);
        doneTitle = true;
      }
      data.push(row);

    });
    let ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'test');
    XLSX.writeFile(wb, 'משפחות.xlsx');
    return;
  }

  families = new GridSettings(new Families(), {

    allowUpdate: true,
    allowInsert: true,
    numOfColumnsInGrid: 10,


    get: { limit: this.limit, orderBy: f => f.name },
    hideDataArea: true,
    knowTotalRows: true,
    columnSettings: families => [

      {
        column: families.name,
        width: '150'
      },

      {
        column: families.familyMembers,
        width: '50'
      },
      {
        column: families.language,
        dropDown: {
          items: families.language.getOptions()
        },
        width: '100'
      },
      {
        column: families.basketType,
        dropDown: { source: new BasketType() },
        width: '100'
      },
      {
        column: families.familySource,
        dropDown: { source: new FamilySources() },
        width: '150'
      },
      families.courier.getColumn(this.dialog),
      families.deliverStatus.getColumn()
    ],
    rowButtons: [
      {
        name: 'עדכני',
        click: f => this.gridView = !this.gridView
      }
    ]
  });
  familiesInfo = this.families.addArea({
    columnSettings: families => [
      families.name,
      families.familyMembers,
      {
        column: families.language,
        dropDown: {
          items: families.language.getOptions()
        }
      },
      {
        column: families.basketType,
        dropDown: { source: new BasketType() }
      },
      {
        column: families.familySource,
        dropDown: { source: new FamilySources() }
      },
      families.internalComment,
      families.deliveryComments,
      families.createDate,
      families.createUser




    ],
  });
  familiesAddress = this.families.addArea({
    columnSettings: families => [
      families.address,
      families.floor,
      families.appartment,
      families.addressComment,
    ]
  });
  phones = this.families.addArea({
    columnSettings: families => [
      families.phone1,
      families.phone1Description,
      families.phone2,
      families.phone2Description
    ]
  });
  callInfo = this.families.addArea({
    columnSettings: families => [
      {
        column: families.callStatus,
        dropDown: {
          items: families.callStatus.getOptions()
        }
      },
      families.callTime,
      families.callHelper,
      families.callComments,
    ]
  })
  deliverInfo = this.families.addArea({
    columnSettings: families => [
      families.courier.getColumn(this.dialog),
      families.courierAssingTime,
      families.courierAssignUser,
      families.deliverStatus.getColumn(),
      families.deliveryStatusDate,
      families.deliveryStatusUser,
      families.courierComments,
    ]
  });
  gridView = true;
  constructor(private dialog: SelectService, private san: DomSanitizer) { }


  ngOnInit() {

  }


  static route = 'families';
  static caption = 'משפחות';


}
class FaimilyStatistics {
  constructor(public name: string, public rule: (f: Families) => FilterBase) {

  }
  private _count = -2;
  count() {
    switch (this._count) {
      case -2:
        this._count = -1;
        let f = new Families();
        f.source.count(this.rule(f)).then(c => this._count = c);
        return '';
      case -1:
        return '';
      default:
        return this._count;
    }
  }

}
