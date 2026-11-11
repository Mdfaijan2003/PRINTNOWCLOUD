import type { EventBus } from "../../../shared/events/event-bus.interface.js";
import { PAYMENT_EVENTS } from "../../payment/events/payment.event.js";
import type { PrintJobService } from "../printJob.service.js";

interface PaymentSuccessfulPayload { paymentId: string; printJobId: string }

export function registerPrintJobPaymentHandlers(eventBus: EventBus, printJobService: PrintJobService): void {
  eventBus.subscribe<PaymentSuccessfulPayload>(PAYMENT_EVENTS.SUCCESSFUL, async (event) => {
    const payload = event.payload as PaymentSuccessfulPayload;
    if (!payload || typeof payload.paymentId !== "string" || typeof payload.printJobId !== "string") {
      throw new Error("Invalid payment.successful event payload");
    }
    await printJobService.handlePaymentSuccessful(payload.printJobId);
  });
}
