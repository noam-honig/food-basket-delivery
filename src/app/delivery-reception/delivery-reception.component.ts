import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { Context, Filter, AndFilter, EntityWhere, Column, ServerFunction, SqlDatabase } from '@remult/core';
import { BusyService, DataControlInfo, GridSettings, InputControl, openDialog } from '@remult/angular';
import { DialogService } from '../select-popup/dialog';
import { FamilyDeliveries } from '../families/FamilyDeliveries';

import { currentUser, Helpers, HelperUserInfo } from '../helpers/helpers';
import { InputAreaComponent } from '../select-popup/input-area/input-area.component';
import { DeliveryStatus } from '../families/DeliveryStatus';

import { getLang } from '../sites/sites';
import { ActivatedRoute } from '@angular/router';
import { FamilyDeliveriesComponent } from '../family-deliveries/family-deliveries.component';
import { DistributionCenters } from '../manage/distribution-centers';

@Component({
  selector: 'app-delivery-reception',
  templateUrl: './delivery-reception.component.html',
  styleUrls: ['./delivery-reception.component.scss']
})
export class DeliveryReceptionComponent implements OnInit, AfterViewInit {

  courier: Helpers;
  showData = false;
  urlParams = new URLSearchParams(window.location.search);
  deliveriesForPhone: string[] = [];

  deliveries = new GridSettings(this.context.for(FamilyDeliveries), {
    allowUpdate: false,
    numOfColumnsInGrid: 3,
    rowCssClass: f => f.deliverStatus.getCss(),

    knowTotalRows: true,

    rowsInPage: 100,
    where: f =>
      f.id.isIn(this.deliveriesForPhone)
    , orderBy: f => f.name
    ,
    columnSettings: deliveries => {
      let r = [
        { column: deliveries.name, width: '100' },
        { column: deliveries.basketType, width: '80' },
        {
          column: deliveries.quantity,
          width: '50'
        },
        { column: deliveries.receptionComments, width: '100' },
        deliveries.distributionCenter,
        { column: deliveries.deliverStatus, width: '110' },

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
              d.archive = true;
              
              d.distributionCenter = this.context.get(currentUser).distributionCenter; 
              d.deliverStatus = DeliveryStatus.Success;
              await d.save();
              await this.refreshFamilyGrid();
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
          d.deliverStatus = DeliveryStatus.FailedOther;
          d.distributionCenter = this.context.get(currentUser).distributionCenter;
          this.editComment(d);
        }
        , textInMenu: () => getLang(this.context).notDelivered
      }
    ]
  });

  phone = new InputControl<string>({ caption: "טלפון של תורם או מתנדב", inputType: 'tel' });

  constructor(
    private context: Context,
    public dialog: DialogService,
    private busy: BusyService,
    private route: ActivatedRoute
  ) { }

  private receptionCommentEntry(deliveries: FamilyDeliveries) {
    let r: DataControlInfo<FamilyDeliveries>[] = [
      {
        column: deliveries.$.receptionComments,
        width: '150'
      },
    ];
    return r;
  }

  private editComment(d: FamilyDeliveries) {
    openDialog(InputAreaComponent, x => x.args = {
      title: getLang(this.context).commentForReception,
      validate: async () => {
        if (d.receptionComments == '')
          throw getLang(this.context).updateComment;
      },
      ok: () => {
        d.save();
      },
      cancel: () => {
      },
      settings: {
        columnSettings: () => this.receptionCommentEntry(d)
      }
    });
  }

  async ngOnInit() {
    this.checkUrlParams();
  }
  ngAfterViewInit() {

  }

  async checkUrlParams() {
    if (this.urlParams.has('phone')) {
      this.phone.value = this.urlParams.get('phone');
      this.search();
    }
  }

  async search() {
    try {
      this.deliveriesForPhone = (await FamilyDeliveriesComponent.getDeliveriesByPhone(this.phone.value)).map(x => x.id);
      this.showData = (this.deliveriesForPhone.length > 0);
    } catch (err) {

    }
    this.refreshFamilyGrid();
  }

  async refreshFamilyGrid() {
    this.deliveries.page = 1;
    await this.deliveries.reloadData();
  }
}
