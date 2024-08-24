import { Component, OnInit, ViewChild } from '@angular/core'
import type {
  ChartConfiguration,
  ChartData,
  ChartEvent,
  ChartType
} from 'chart.js'
import { BaseChartDirective } from 'ng2-charts'

@Component({
  selector: 'app-test-map',
  templateUrl: './test-map.component.html',
  styleUrls: ['./test-map.component.scss']
})
export class TestMapComponent {
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
}
