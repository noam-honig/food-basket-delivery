import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Remult } from 'remult';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { FamilySelfOrderController } from './family-self-order.controller';

@Component({
  selector: 'app-family-self-order',
  templateUrl: './family-self-order.component.html',
  styleUrls: ['./family-self-order.component.scss']
})
export class FamilySelfOrderComponent extends FamilySelfOrderController implements OnInit {

  constructor(remult: Remult, public settings: ApplicationSettings, private route: ActivatedRoute) {
    super(remult);
  }

  ngOnInit(): void {
    this.familyUrl = this.route.snapshot.params['id'];
    this.load();
  }
}
