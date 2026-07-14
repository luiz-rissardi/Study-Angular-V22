import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { PaymentData } from '../componets/payment/payment';
import { IDEMPOTENCY_KEY } from './shared/httpContext';
import { tap } from 'rxjs';

@Service()
export class PaymentService {
    private http = inject(HttpClient);
    private activeIdempotencyKey: string | null = null;

    initTransaction() {
        this.activeIdempotencyKey = crypto.randomUUID();
    }

    pay(data: PaymentData) {

        if (!this.activeIdempotencyKey) this.initTransaction();

        return this.http.post("/payment", data, {
            context: new HttpContext().set(IDEMPOTENCY_KEY, this.activeIdempotencyKey)
        }).pipe(
            tap(() => this.clearTransaction())
        )
    }

    clearTransaction(): void {
        this.activeIdempotencyKey = null;
    }
}
