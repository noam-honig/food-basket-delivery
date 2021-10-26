import { Component, OnInit } from '@angular/core';
import { GridSettings } from '@remult/angular';
import { Remult } from 'remult';
import { HelperCommunicationHistory } from '../in-route-follow-up/in-route-helpers';

@Component({
  selector: 'app-incoming-messages',
  templateUrl: './incoming-messages.component.html',
  styleUrls: ['./incoming-messages.component.scss']
})
export class IncomingMessagesComponent implements OnInit {

  constructor(private remult: Remult) { }
  showAll = false;
  grid = new GridSettings(this.remult.repo(HelperCommunicationHistory), {
    where: com => !this.showAll ? com.incoming.isEqualTo(true) : undefined!,
    knowTotalRows:true,
    columnSettings: com => [
      com.message,
      com.phone,
      com.volunteer,
      com.createDate,
      com.automaticAction,
      com.createUser,
      com.apiResponse,
      com.eventId,
      com.incoming
    ],
    gridButtons: [{
      name: 'הצג גם הודעות יוצאות', click: () => {
        this.showAll = !this.showAll;
        this.grid.reloadData();
      }
    }]
  })

  ngOnInit(): void {
  }

}
