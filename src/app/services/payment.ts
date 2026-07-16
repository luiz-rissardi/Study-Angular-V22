import { HttpClient, HttpContext, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ConfirmPaymentResponse, InitiatePaymentRequest, InitiatePaymentResponse, PaymentData } from '../componets/payment/payment';
import { IDEMPOTENCY_KEY } from './shared/httpContext';
import { catchError, concatMap, Observable, tap, throwError } from 'rxjs';
import { UserState } from '../states/user-state';

@Injectable({
    providedIn: 'root'
})
export class PaymentService {
    private http = inject(HttpClient);
    private userState = inject(UserState)


    public executeSecurePayment(payload: PaymentData) {
        return this.http.post<InitiatePaymentResponse>(`payment/initiate`, { ...payload, userId: this.userState.userState().id })
            .pipe(
                concatMap((initiateRes) => {
                    return this.http.post<ConfirmPaymentResponse>(
                        `payment/confirm`,
                        payload,
                        {
                            context: new HttpContext().set(IDEMPOTENCY_KEY, initiateRes.idempotencyToken)
                        }
                    );
                })
            );
    }
}
