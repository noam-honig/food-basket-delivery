import { Component, OnInit } from '@angular/core';
import { CustomComponentArgs, CustomDataComponent } from '../common-ui-elements/interfaces';

@Component({
  selector: 'app-button-data',
  templateUrl: './button-data.component.html',
  styleUrls: ['./button-data.component.scss']
})
export class ButtonDataComponent implements OnInit, CustomDataComponent {

  args: CustomComponentArgs;
  constructor() { }

  ngOnInit(): void {
    
  }

}
