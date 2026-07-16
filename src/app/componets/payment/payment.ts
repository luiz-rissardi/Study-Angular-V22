import { Component, inject, OnInit, signal } from '@angular/core';
import { form, FormField, min, required, submit } from '@angular/forms/signals';
import { UserState } from '../../states/user-state';

import { PaymentService } from '../../services/payment';

export interface PaymentData {
  accountId: number;
  creditCardNumber: number;
  value: number;
}

export interface InitiatePaymentRequest {
  amount: number;
  destination: number;
}

export interface InitiatePaymentResponse {
  idempotencyToken: string;
}

export interface ConfirmPaymentResponse {
  message: string;
  transactionId: string;
  timestamp: string;
}

@Component({
  selector: 'app-payment',
  imports: [FormField],
  templateUrl: './payment.html',
  styleUrl: './payment.scss',
})
export class Payment {

  private userState = inject(UserState);
  private paymentService = inject(PaymentService);
  private paymentData = signal<PaymentData>({
    accountId: 0,
    creditCardNumber: 0,
    value: 0
  });

  protected paymentForm = form(this.paymentData, (fields) => {
    required(fields.accountId, { message: "campo obrigátorio" });
    required(fields.creditCardNumber, { message: "campo obrigátorio" });
    required(fields.value, { message: "campo obrigátorio" });
    min(fields.value, 100, { message: "valor minimo de transação: 100$" })
  })

  async onSubmit(event: Event) {
    event.preventDefault();
    submit(this.paymentForm, async () => {
      const payload = this.paymentForm().value();

      this.paymentService.executeSecurePayment(payload).subscribe({
        next: (res) => {
          console.log(res);
          alert('Pago com sucesso!');
        },
        error: (err) => {
          console.log(err);
          console.log("Erro ao processar. Você pode tentar novamente.");
          // Note que NÃO resetamos a chave aqui! 
        }
      });
    })
  }

}
