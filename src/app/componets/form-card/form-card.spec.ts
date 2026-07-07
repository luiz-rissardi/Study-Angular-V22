import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FormCard } from './form-card';

describe('FormCard', () => {
  let component: FormCard;
  let fixture: ComponentFixture<FormCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormCard],
    }).compileComponents();

    fixture = TestBed.createComponent(FormCard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
