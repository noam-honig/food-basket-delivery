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
  deliveries = this.context.for(Helpers).gridSettings({
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
          addFilter(f.phone.isContains(this.searchString));
        }
        return result;
      }
      
      , orderBy: f => f.name
    },
    columnSettings: helpers => {
      let r=[
      {
        column: helpers.name,
        width: '150'
      },
      {
        column: helpers.phone,
        width: '150'
      },
    ];
    r.push({
      column: helpers.eventComment,
      width: '120'
    });    
    r.push({
      column: helpers.preferredDistributionAreaAddress, width: '120',
    });
    r.push({
      column: helpers.preferredDistributionAreaAddress2, width: '120',
    });
    r.push({
      column: helpers.company, width: '120'
    });

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
