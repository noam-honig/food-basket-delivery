import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
//import { ApplicationSettings } from '../manage/ApplicationSettings';
import { DataAreaSettings, DataControlInfo, StringColumn, BoolColumn, Context, BusyService, FilterBase, AndFilter, EntityWhere, Column } from '@remult/core';
import { DialogService } from '../select-popup/dialog';
import { FamilyDeliveries } from '../families/FamilyDeliveries';
import { getLang } from '../translate';
//import { buildGridButtonFromActions } from '../families/familyActionsWiring';
//import { delvieryActions } from '../family-deliveries/family-deliveries-actions';
//import { Roles } from '../auth/roles';
import { Helpers, HelperUserInfo } from '../helpers/helpers';
//import { GridDialogComponent } from '../grid-dialog/grid-dialog.component';
import { InputAreaComponent } from '../select-popup/input-area/input-area.component';
import { DeliveryStatus } from '../families/DeliveryStatus';

@Component({
  selector: 'app-delivery-reception',
  templateUrl: './delivery-reception.component.html',
  styleUrls: ['./delivery-reception.component.scss']
})
export class DeliveryReceptionComponent implements OnInit,AfterViewInit {

  courierId;
  showData=false;
  deliveries = this.context.for(FamilyDeliveries).gridSettings({
    allowUpdate: true,
    numOfColumnsInGrid: 3,
    rowCssClass: f => f.deliverStatus.getCss(),

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
          console.log(this.courierId)
          addFilter(f.courier.isEqualTo(this.courierId).and(f.archive.isEqualTo(false)));
        }
        return result;
      }
      
      , orderBy: f => f.name
    },
    columnSettings: deliveries => {
      let r=[
        {column: deliveries.name, width:'100'},
        {column: deliveries.basketType, width:'80'},
        {
          column: deliveries.quantity,
          width: '50'
        },
        { column: deliveries.receptionComments, width: '100'},
        deliveries.distributionCenter,
        { column:deliveries.deliverStatus,width:'110' },
      
        deliveries.deliveryComments,
        deliveries.internalDeliveryComment,  
        deliveries.courierComments,

        deliveries.messageStatus,        

        deliveries.createUser,
        { column: deliveries.createDate, width: '150' },

        deliveries.floor,
        deliveries.appartment,
        deliveries.entrance,
        { column: deliveries.addressComment },
        deliveries.area,
        deliveries.phone1,
        deliveries.phone1Description,
        deliveries.phone2,
        deliveries.phone2Description,
        deliveries.phone3,
        deliveries.phone3Description,
        deliveries.phone4,
        deliveries.phone4Description,
        { column: deliveries.courier, width: '100' }
      ]

    return r;
    },
  
    rowButtons: [
      {
        name: '',
        icon: 'done_all',
        showInLine: true,
        click: async d => {
          if (await this.dialog.YesNoPromise(getLang(this.context).shouldArchiveDelivery)) {
            {
              d.archive.value = true;
              let user = <HelperUserInfo>this.context.user;
              d.distributionCenter.value = user.distributionCenter;
              await d.save();
              this.refresh();
            }
          }
        }
        , textInMenu: () => getLang(this.context).receptionDone
      },
      {
        name: '',
        icon: 'report_problem',
        showInLine: true,
        click: async d => {
          d.deliverStatus.value = DeliveryStatus.FailedOther;
          let user = <HelperUserInfo>this.context.user;
          d.distributionCenter.value = user.distributionCenter;
          this.editComment(d);
        }
        , textInMenu: () => getLang(this.context).notDelivered
      }
    ]});

    
  searchString = '';
  constructor(
    private context: Context,
    public dialog: DialogService,
    private busy: BusyService,
//    public settings: ApplicationSettings
  ) { }
  
  private selectColumns(deliveries: FamilyDeliveries) {
    let r: DataControlInfo<FamilyDeliveries>[] = [
      {
        column: deliveries.receptionComments,
        width: '150'
      },
    ];
    return r;
  }

  private editComment(d: FamilyDeliveries) {
    this.context.openDialog(InputAreaComponent, x => x.args = {
      title: 'הערת קליטה',
      validate: async () => {
        if (d.receptionComments.value == '')
            throw getLang(this.context).updateComment;
      },
      ok: () => {
        d.save();
      },
      cancel: () => {
      },
      settings: {
        columnSettings: () => this.selectColumns(d)
      }
    });
  }

  async ngOnInit() {    
    
  }
  ngAfterViewInit(){

  }

  async search(form)
  {
    try{
      this.searchString=form.value.phoneNumber;
      this.courierId=await (await this.context.for(Helpers).findFirst(i=>i.phone.isEqualTo(this.searchString)));
      this.courierId=this.courierId? this.courierId.id.value : ""
      this.showData=this.courierId;
    }catch(err){
      
    }
    this.refresh();
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
