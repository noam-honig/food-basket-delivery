import { Component, OnInit, ViewChild } from '@angular/core';
import { Context, AndFilter, FieldsMetadata } from 'remult';
import { BusyService, GridSettings, InputField, openDialog, RowButton } from '@remult/angular';
import { Event, volunteersInEvent, eventStatus } from './events';
import { ApplicationSettings, getSettings } from '../manage/ApplicationSettings';
import { GridDialogComponent } from '../grid-dialog/grid-dialog.component';
import { HelperAssignmentComponent } from '../helper-assignment/helper-assignment.component';
import { Helpers } from '../helpers/helpers';
import { InputAreaComponent } from '../select-popup/input-area/input-area.component';


import { DestroyHelper, DialogService } from '../select-popup/dialog';
import * as copy from 'copy-to-clipboard';
import { Sites } from '../sites/sites';
import { Roles } from '../auth/roles';
import { columnOrderAndWidthSaver } from '../families/columnOrderAndWidthSaver';

import { DateOnlyValueConverter } from 'remult/valueConverters';
import { EventInfoComponent } from '../event-info/event-info.component';
import { EventCardComponent } from '../event-card/event-card.component';

@Component({
  selector: 'app-events',
  templateUrl: './events.component.html',
  styleUrls: ['./events.component.scss']
})
export class EventsComponent implements OnInit {
  showArchive = false;
  showPast = false;
  destroyHelper = new DestroyHelper();
  ngOnDestroy(): void {
    this.destroyHelper.destroy();
  }
  constructor(private context: Context, public settings: ApplicationSettings, private busy: BusyService, private dialog: DialogService) {
    dialog.onDistCenterChange(() => this.events.reloadData(), this.destroyHelper);
  }
  events: GridSettings<Event> = new GridSettings<Event>(this.context.for(Event), {
    allowUpdate: this.context.isAllowed(Roles.admin),
    allowInsert: this.context.isAllowed(Roles.admin),


    rowsInPage: 25,
    where: [e => [this.dialog.filterDistCenter(e.distributionCenter), this.showArchive ? undefined : e.eventStatus.isDifferentFrom(eventStatus.archive)],
    e => {
      if (!this.showPast) {
        let d = new Date();
        d.setDate(d.getDate() - 7);
        return e.eventDate.isGreaterOrEqualTo(d)
      }
    }],
    orderBy: e => [e.eventStatus, e.eventDate, e.startTime],
    newRow: async e =>
      e.distributionCenter = await this.dialog.getDistCenter(e.addressHelper.location()),

    showFilter: true,
    allowSelection: true,
    gridButtons: [

      {
        name: this.settings.lang.duplicateEvents,
        click: async () => {
          await Event.duplicateEvent(this.context, this.busy, this.events.selectedRows, () => this.events.reloadData());
        }
        , visible: () => this.events.selectedRows.length > 0

      },
      {
        name: this.settings.lang.showPast,
        click: () => {
          this.showPast = !this.showPast;
          this.events.reloadData();
        }
      },
      {
        name: this.settings.lang.showArchive,
        click: () => {
          this.showArchive = !this.showArchive;
          this.events.reloadData();
        }
      }
    ],
    numOfColumnsInGrid: 100,
    columnSettings: e => Event.displayColumns(e),
    rowButtons: Event.rowButtons(this.settings, this.dialog, this.busy)
  });
  listOptions: RowButton<any>[] = [
    {
      name: this.settings.lang.showPast,
      click: () => {
        this.showPast = !this.showPast;
        this.events.reloadData();
      }
    },
    {
      name: this.settings.lang.showArchive,
      click: () => {
        this.showArchive = !this.showArchive;
        this.events.reloadData();
      }
    }
  ];



  ngOnInit() {
    new columnOrderAndWidthSaver(this.events).load('events-component');
  }
  copyLink() {
    copy(window.origin + '/' + Sites.getOrganizationFromContext(this.context) + '/events');
    this.dialog.Info(this.settings.lang.linkCopied);
  }
  @ViewChild(EventCardComponent) card: EventCardComponent;
  add() {
    this.events.addNewRow();
    this.card.refresh();
    this.events.currentRow.openEditDialog(this.dialog, this.busy, () => {
      this.events.items.splice(this.events.items.indexOf(this.events.currentRow), 1);
      this.card.refresh();
    });
  }


}
