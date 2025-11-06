import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class NavService {
    // Valor inicial null para indicar que aún no se cargó desde backend
    private _convocatoriaEnabled = new BehaviorSubject<boolean | null>(null);
    convocatoriaEnabled$ = this._convocatoriaEnabled.asObservable();

    setConvocatoriaEnabled(value: boolean) {
        this._convocatoriaEnabled.next(value);
    }
}
