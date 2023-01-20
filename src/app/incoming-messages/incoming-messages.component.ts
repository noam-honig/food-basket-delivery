import { Component, OnInit } from '@angular/core';
import { BusyService } from '../common-ui-elements';
import { GridSettings } from '../common-ui-elements/interfaces';
import { remult } from 'remult';
import { HelperCommunicationHistory } from '../in-route-follow-up/in-route-helpers';
import { DialogService } from '../select-popup/dialog';

@Component({
  selector: 'app-incoming-messages',
  templateUrl: './incoming-messages.component.html',
  styleUrls: ['./incoming-messages.component.scss']
})
export class IncomingMessagesComponent implements OnInit {

  constructor(private dialog: DialogService, private busy: BusyService) { }
  showAll = true;
  grid = new GridSettings(remult.repo(HelperCommunicationHistory), {
    where: () => ({ incoming: !this.showAll ? true : undefined }),
    knowTotalRows: true,
    columnSettings: com => [
      com.message,
      com.phone,
      com.volunteer,
      com.incoming,
      com.createDate,
      com.automaticAction,
      com.createUser,
      com.apiResponse,
      com.eventId
    ],
    rowButtons: [{

      textInMenu: remult.context.lang.volunteerInfo,
      click: async (com) => {
        const h = await com.volunteer.getHelper();
        h.displayEditDialog(this.dialog);
      },
      visible: com => Boolean(com.volunteer)

    }, {

      textInMenu: remult.context.lang.smsMessages,
      click: async (com) => {
        const h = await com.volunteer.getHelper();
        h.smsMessages(this.dialog);
      },
      visible: com => Boolean(com.volunteer)

    },
    {
      textInMenu: remult.context.lang.customSmsMessage,
      click: async (com) => {
        const h = await com.volunteer.getHelper();
        h.sendSmsToCourier(this.dialog);
      },
      visible: com => Boolean(com.volunteer)

    }],
    gridButtons: [{
      name: remult.context.lang.showOnlyIncoming, click: () => {
        this.showAll = !this.showAll;
        this.grid.reloadData();
      }
    }]
  })

  ngOnInit(): void {
  }

}
