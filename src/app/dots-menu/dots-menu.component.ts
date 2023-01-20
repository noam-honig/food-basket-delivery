import { Component, Input, OnInit } from '@angular/core';
import { RowButton } from '../common-ui-elements/interfaces';


@Component({
  selector: 'app-dots-menu',
  templateUrl: './dots-menu.component.html',
  styleUrls: ['./dots-menu.component.css']
})
export class DotsMenuComponent implements OnInit {

  constructor() { }
  @Input() buttons: RowButton<any>[];
  @Input() item: any;
  ngOnInit(): void {
  }

}
