import { Component, OnInit, Input } from '@angular/core';
import { Families } from '../families/families';

@Component({
  selector: 'app-family-in-list',
  templateUrl: './family-in-list.component.html',
  styleUrls: ['./family-in-list.component.scss']
})
export class FamilyInListComponent implements OnInit {

  constructor() { }
  @Input() f: Families;
  @Input() i: number;
  @Input() newAssign:boolean;
  ngOnInit() {
  }

}
