import { Component, OnInit } from '@angular/core';
import { Context } from '@remult/core';
import { Event, volunteersInEvent } from './events';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { GridDialogComponent } from '../grid-dialog/grid-dialog.component';
import { HelperAssignmentComponent } from '../helper-assignment/helper-assignment.component';
import { Helpers } from '../helpers/helpers';
import { InputAreaComponent } from '../select-popup/input-area/input-area.component';

@Component({
  selector: 'app-events',
  templateUrl: './events.component.html',
  styleUrls: ['./events.component.scss']
})
export class EventsComponent implements OnInit {

  constructor(private context: Context, private settings: ApplicationSettings) { }
  events = this.context.for(Event).gridSettings({
    allowUpdate: true,
    allowInsert: true,
    get: {
      limit: 25,
      orderBy: e => [e.eventStatus, e.eventDate, e.startTime]
    },

    numOfColumnsInGrid: 100,
    columnSettings: e => this.eventDisplayColumns(e),
    rowButtons: [
      {
        name: this.settings.lang.eventInfo,
        click: async e => {
          this.context.openDialog(InputAreaComponent, x => x.args = {
            title: this.settings.lang.eventInfo,
            settings: {
              columnSettings: () => this.eventDisplayColumns(e)
            },
            ok: () => e.save(),
            cancel: () => e.undoChanges(),
            buttons: [
              {
                text: this.settings.lang.volunteers,
                click: () => e.showVolunteers()
              }
            ]
          });
        }
      },
      {
        name: this.settings.lang.volunteers,
        click: async e => {
          e.showVolunteers()
        }
      }
    ]
  });
  private eventDisplayColumns(e: Event) {
    return [
      e.name,
      e.registeredVolunteers,
      e.requiredVolunteers,
      e.eventDate,
      e.startTime,
      e.endTime,
      e.eventStatus,
      e.description
    ];
  }

  ngOnInit() {
  }

}
