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


    public executeSecurePayment(payload: InitiatePaymentRequest) {
        return this.http.post<InitiatePaymentResponse>(`payment/initiate`, { ...payload, userId: this.userState.userState().id })
            .pipe(
                concatMap((initiateRes) => {
                    return this.http.post<ConfirmPaymentResponse>(
                        `payment/confirm`,
                        {},
                        {
                            context: new HttpContext().set(IDEMPOTENCY_KEY, initiateRes.idempotencyToken)
                        }
                    );
                }),
                catchError(this.handleHttpError)
            );
    }

    private handleHttpError(error: HttpErrorResponse): Observable<never> {
        let errorMessage = 'Ocorreu um erro inesperado no processamento do pagamento.';

        if (error.error && error.error.message) {
            errorMessage = error.error.message;
        } else if (error.status === 0) {
            errorMessage = 'Não foi possível conectar ao servidor de pagamentos. Verifique sua conexão.';
        }

        return throwError(() => new Error(errorMessage));
    }
}
