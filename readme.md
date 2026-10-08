/*Outbox q use kr rhe hai.*/
Ans: Suppose payment module se payment complete hogya and DB write bhi complete hogaya.
After that, Event Bus the through payment.successful ka event publish hua.
But, at the same time server crash hogya hence payment event publish nhi hopaya.

Toh, kabhi printjob printing queue mein jaa hi nhi paya.


Ab iss case ko solve krne ke liye we are using OUTBOX.

So, Outbox ek MongoDB collection/table hai jahan hum events temporarily store karte hain.

Mtlb, event ko pehle safely database mein rakh do, phir asynchronously publish karo.

Payment Service
      │
      │ MongoDB Transaction
      ▼
┌─────────────────────────┐
│ Payment                 │
│ status = SUCCESSFUL     │
│                         │
│ Outbox                  │
│ event = payment.successful
└─────────────────────────┘
      │
      │ COMMIT
      ▼
   Database

So either dono successful hoga ya dono rollback honge.


Now, 
Outbox worker kya krta hai?
Ans: Event database mein stored hai. Worker continuously dekhta hai  
Outbox Worker
      ↓
"Any PENDING events?"
      ↓
      YES
      ↓
Publish event
      ↓
EventBus
      ↓
PrintJob Module


What if worker publish krte waqt crash hojaye?

Iske liye hum EventId ka use kr rhe hai.

eventId = abc123
eventName = payment.successful

agr fail hua toh phir se same event publish hoga ab this time Processing nhi hoga q ki id se identify krlenge then iss job ko directly printing queue mein de dia jayega.


Complete Module

                    PAYMENT MODULE
                          │
                          │
                 Payment SUCCESSFUL
                          │
                          ▼
                 ┌─────────────────┐
                 │ MongoDB         │
                 │ Transaction     │
                 │                 │
                 │ Payment         │
                 │ SUCCESSFUL      │
                 │       +         │
                 │ Outbox Event    │
                 │ PENDING         │
                 └─────────────────┘
                          │
                       COMMIT
                          │
                          ▼
                  ┌──────────────┐
                  │ Outbox       │
                  │ Worker       │
                  └──────────────┘
                          │
                          │ publish
                          ▼
                 ┌─────────────────┐
                 │ EventBus        │
                 │                 │
                 │ eventId: abc123 │
                 │ payment.successful
                 └─────────────────┘
                          │
                          ▼
                   PRINTJOB MODULE
                          │
                          ▼
                  PrintJob → QUEUED
                          │
                          ▼
                    System Node
                          │
                          ▼
                       Printer