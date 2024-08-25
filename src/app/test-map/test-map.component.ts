import { Component, OnInit, ViewChild, inject } from '@angular/core'
import type {
  ChartConfiguration,
  ChartData,
  ChartEvent,
  ChartType
} from 'chart.js'
import { BaseChartDirective } from 'ng2-charts'
import { BusyService, openDialog } from '../common-ui-elements'
import { WaitComponent } from '../common-ui-elements/src/angular/wait/wait.component'
import { MatDialog } from '@angular/material/dialog'

@Component({
  selector: 'app-test-map',
  templateUrl: './test-map.component.html',
  styleUrls: ['./test-map.component.scss']
})
export class TestMapComponent implements OnInit {
  private dialog = inject(MatDialog)
  ngOnInit(): void {}

  @ViewChild(BaseChartDirective) chart: BaseChartDirective | undefined

  public pieChartOptions: ChartConfiguration['options'] = {
    plugins: {
      legend: {
        display: true,
        position: 'top'
      }
    }
  }
  public pieChartData: ChartData<'pie', number[], string | string[]> = {
    labels: [['Download', 'Sales'], ['In', 'Store', 'Sales'], 'Mail Sales'],
    datasets: [
      {
        data: [300, 500, 100]
      }
    ]
  }
  update() {
    this.pieChartData.datasets[0].data = [
      Math.random() * 100,
      Math.random() * 100,
      Math.random() * 100
    ]
    this.chart?.update()
  }
}
