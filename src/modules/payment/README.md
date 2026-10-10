# PrintNow Payment Webhook Patch

These files are a coordinated patch for the Payment module's Razorpay order/webhook flow.

## Included files
- `payment.service.ts`: creates payments, verifies webhook signatures, handles `payment.captured` idempotently, updates status + outbox in one MongoDB transaction.
- `payment.repository.ts`: lookup by Razorpay order ID and atomic successful transition.
- `payment.model.ts`: separate `providerOrderId` and `providerPaymentId`, and persists customer details.
- `provider/payment-provider.interface.ts`: provider response names the Razorpay Order ID correctly.
- `provider/razorpay.provider.ts`: creates orders in paise and verifies checkout signatures.

## Required wiring
1. Keep the webhook route/controller that calls `paymentService.handleRazorpayWebhook(req.body, signature)`.
2. Register raw body parsing **before** `express.json()`:
   ```ts
   app.use("/payments/webhook/razorpay", express.raw({ type: "application/json" }));
   app.use(express.json());
   ```
3. In the payment router, register `POST /webhook/razorpay` to the webhook controller.
4. Set `RAZORPAY_WEBHOOK_SECRET` to the same secret configured for the webhook in the Razorpay Dashboard. Do not commit it.
5. `payment.captured` is processed; `payment.failed` is intentionally acknowledged as a no-op because it represents one payment attempt and a customer may retry against the same order. Do not mark the aggregate PrintNow payment failed from that event alone.
6. MongoDB transactions require a replica set (MongoDB Atlas supports this).

## Amount convention
The service/database store `amount` in whole INR rupees. The Razorpay adapter converts rupees to paise. If your existing database already stores amounts in paise, do **not** use this patch unchanged; first migrate the amount convention consistently.

## Existing data
Existing documents with the Razorpay order ID in `providerPaymentId` must be migrated to `providerOrderId` before relying on webhook lookup. Back up the database before running any migration.
