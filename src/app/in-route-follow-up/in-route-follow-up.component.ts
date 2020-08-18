import { Component, OnInit } from '@angular/core';
import { Context } from '@remult/core';
import { InRouteHelpers } from './in-route-helpers';
import { HelperAssignmentComponent } from '../helper-assignment/helper-assignment.component';
import { use } from '../translate';
import { Helpers } from '../helpers/helpers';

@Component({
  selector: 'app-in-route-follow-up',
  templateUrl: './in-route-follow-up.component.html',
  styleUrls: ['./in-route-follow-up.component.scss']
})
export class InRouteFollowUpComponent implements OnInit {

  constructor(private context: Context) { }
  helpers = this.context.for(InRouteHelpers).gridSettings({
    get: {
      limit: 50
    },
    knowTotalRows:true,
    rowButtons: [{
      name: use.language.assignDeliveryMenu,
      icon: 'list_alt',
      visible: h => !h.isNew(),
      click: async s => {
        let h = await this.context.for(Helpers).findId(s.id);
        this.context.openDialog(
          HelperAssignmentComponent, s => s.argsHelper = h)
      }
    }]
  });

  ngOnInit() {
  }

}
