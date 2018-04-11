import { Component, OnInit } from '@angular/core';
import { GridSettings } from 'radweb';
import { Categories } from '../models';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {

  constructor() { }

  ngOnInit() {
  }
  tabs = ['Tab1', 'Tab2', 'Tab3'];
  selectedTab = 0;

}
