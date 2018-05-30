import { Component, OnInit, Input } from '@angular/core';
import { Families } from '../models';

@Component({
  selector: 'app-family-info',
  templateUrl: './family-info.component.html',
  styleUrls: ['./family-info.component.scss']
})
export class FamilyInfoComponent implements OnInit {

  constructor() { }
  @Input() f: Families;
  ngOnInit() {
  }

}
