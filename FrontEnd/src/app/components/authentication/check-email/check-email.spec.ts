import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CheckEmail } from './check-email';

describe('CheckEmail', () => {
  let component: CheckEmail;
  let fixture: ComponentFixture<CheckEmail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CheckEmail]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CheckEmail);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
