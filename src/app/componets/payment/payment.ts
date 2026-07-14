import { Component, inject, OnInit, signal } from '@angular/core';
import { form, FormField, min, required, submit } from '@angular/forms/signals';
import { UserState } from '../../states/user-state';
import { randomUUID } from 'node:crypto';
import { PaymentService } from '../../services/payment';

export interface PaymentData {
  accountId: number;
  creditCardNumber: number;
  value: number;
}

@Component({
  selector: 'app-payment',
  imports: [FormField],
  templateUrl: './payment.html',
  styleUrl: './payment.scss',
})
export class Payment implements OnInit {

  private userState = inject(UserState);
  private paymentService = inject(PaymentService);
  private paymentData = signal<PaymentData>({
    accountId: 0,
    creditCardNumber: 0,
    value: 0
  });

  ngOnInit(): void {
    this.paymentService.initTransaction()
  }

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
      
      this.paymentService.pay(payload).subscribe({
        next: (res) => {
          alert('Pago com sucesso!');
        },
        error: (err) => {
          console.error(err);
          alert('Erro ao processar. Você pode tentar novamente.');
          // Note que NÃO resetamos a chave aqui! 
        }
      });
    })
  }

}
