import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MltFamiliesComponent } from './mlt-families.component';

describe('MltFamiliesComponent', () => {
  let component: MltFamiliesComponent;
  let fixture: ComponentFixture<MltFamiliesComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MltFamiliesComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MltFamiliesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
