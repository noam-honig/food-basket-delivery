import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeliveryImagesComponent } from './delivery-images.component';

describe('DeliveryImagesComponent', () => {
  let component: DeliveryImagesComponent;
  let fixture: ComponentFixture<DeliveryImagesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DeliveryImagesComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DeliveryImagesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
