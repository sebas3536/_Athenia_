import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Convocatorias } from './convocatorias';

describe('Convocatorias', () => {
  let component: Convocatorias;
  let fixture: ComponentFixture<Convocatorias>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Convocatorias]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Convocatorias);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
