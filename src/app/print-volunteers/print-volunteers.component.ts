import { Component, OnInit } from '@angular/core';
import { BusyService } from '@remult/angular';
import { PrintVolunteersController, volunteer } from './print-volunteers.controller';

@Component({
  selector: 'app-print-volunteers',
  templateUrl: './print-volunteers.component.html',
  styleUrls: ['./print-volunteers.component.scss']
})
export class PrintVolunteersComponent implements OnInit {

  constructor(private busy: BusyService) { }
  volunteers: volunteer[] = [];
  total: number = 0;
  ngOnInit() {
    PrintVolunteersController.volunteersForPrint().then(x => {
      this.volunteers = x.volunteers;
      this.total = x.total;
    });
  }
}