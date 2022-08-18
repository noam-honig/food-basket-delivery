import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Controller } from 'remult';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { FamilySelfOrderController } from './family-self-order.controller';

@Component({
  selector: 'app-family-self-order',
  templateUrl: './family-self-order.component.html',
  styleUrls: ['./family-self-order.component.scss']
})
@Controller('family-self-order')
export class FamilySelfOrderComponent extends FamilySelfOrderController implements OnInit {

  constructor( public settings: ApplicationSettings, private route: ActivatedRoute) {
    super();
  }

  ngOnInit(): void {
    this.familyUrl = this.route.snapshot.params['id'];
    this.load();
  }
}
