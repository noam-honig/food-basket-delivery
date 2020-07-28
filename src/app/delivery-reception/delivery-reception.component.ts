import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { DataAreaSettings, StringColumn, BoolColumn, Context, BusyService, FilterBase, AndFilter, EntityWhere, Column } from '@remult/core';
import { DialogService } from '../select-popup/dialog';
import { ActiveFamilyDeliveries, FamilyDeliveries } from '../families/FamilyDeliveries';
import { getLang } from '../translate';
import { buildGridButtonFromActions } from '../families/familyActionsWiring';
import { delvieryActions } from '../family-deliveries/family-deliveries-actions';
import { FamilyDeliveriesComponent, getDeliveryGridButtons } from '../family-deliveries/family-deliveries.component';
import { saveToExcel } from '../shared/saveToExcel';
import { Roles } from '../auth/roles';
import { Helpers } from '../helpers/helpers';

@Component({
  selector: 'app-delivery-reception',
  templateUrl: './delivery-reception.component.html',
  styleUrls: ['./delivery-reception.component.scss']
})
export class DeliveryReceptionComponent implements OnInit,AfterViewInit {


  showData=false;
  deliveries = this.context.for(FamilyDeliveries).gridSettings({
    allowUpdate: false,
    numOfColumnsInGrid: 5,

    knowTotalRows: true,
    get: {
      limit: 25,
      where: f => {
        let index = 0;
        let result: FilterBase = undefined;        
        let addFilter = (filter: FilterBase) => {
          if (result)
            result = new AndFilter(result, filter);
          else result = filter;
        }
        if (this.searchString) {
          addFilter(f.phone1.isContains(this.searchString));
        }
        return result;
      }
      
      , orderBy: f => f.name
    },
    columnSettings: deliveries => {
      let r=[
        {
          column: deliveries.name,
          width: '200'
        },
        {
          column: deliveries.address,
          width: '250',
          cssClass: f => {
            if (!f.addressOk.value)
              return 'addressProblem';
            return '';
          }
        },
        deliveries.basketType,
        {
          column: deliveries.quantity,
          width: '50'
        },

        { column: deliveries.createDate, width: '150' },
        deliveries.distributionCenter,

        deliveries.deliveryComments,
        deliveries.internalDeliveryComment,  
        deliveries.special,
        deliveries.createUser,

        deliveries.familySource,

        { column: deliveries.addressOk, width: '110' },
        deliveries.floor,
        deliveries.appartment,
        deliveries.entrance,
        { column: deliveries.addressComment },
        { column: deliveries.city, width: '100' },
        deliveries.area,
        deliveries.phone1,
        deliveries.phone1Description,
        deliveries.phone2,
        deliveries.phone2Description,
        deliveries.phone3,
        deliveries.phone3Description,
        deliveries.phone4,
        deliveries.phone4Description,
        { column: deliveries.courier, width: '100' },

        deliveries.courierAssignUser,  
        { column: deliveries.courierAssingTime, width: '150' },
        { column: deliveries.deliveryStatusUser, width: '100' },
        deliveries.deliveryStatusDate,
        { column: deliveries.courierComments, width: '120' }, 
        { column: deliveries.internalDeliveryComment, width: '120' }, 
        deliveries.needsWork,
        deliveries.needsWorkDate,
        deliveries.needsWorkUser,
        deliveries.fixedCourier,
        deliveries.familyMembers,
        { column: deliveries.messageStatus, width: '130' }
      ]

    return r;
    }});
  searchString = '';
  constructor(
    private context: Context,
    public dialog: DialogService,
    private busy: BusyService,
    public settings: ApplicationSettings
  ) { }
  
  ngOnInit() {
    
  }
  ngAfterViewInit(){

  }

  search(form)
  {
    try{
      this.searchString=form.value.phoneNumber;
      this.showData=true;
    }catch(err){
      
    }
  }

  refresh() {
    this.refreshFamilyGrid();
    // this.refreshStats();
  }
  async refreshFamilyGrid() {
    this.deliveries.page = 1;
    await this.deliveries.getRecords();
  }
  
  clearSearch() {
    this.searchString = '';
    this.doSearch();
  }
  async doSearch() {
    if (this.deliveries.currentRow && this.deliveries.currentRow.wasChanged())
      return;
    this.busy.donotWait(async () =>
      await this.refreshFamilyGrid());
  }

}
