import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TwoVerification } from './two-verification';

describe('TwoVerification', () => {
  let component: TwoVerification;
  let fixture: ComponentFixture<TwoVerification>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TwoVerification]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TwoVerification);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
