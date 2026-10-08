# PrintNow — PrintJob Module

The **PrintJob module** manages the lifecycle of a customer's confirmed printing request.

It is responsible for:

- Creating a PrintJob
- Storing the selected print configuration
- Tracking PrintJob status
- Retrieving a PrintJob
- Validating allowed status transitions

It does **not** handle file uploads, payment processing, document processing, queue execution, or printer communication.

---

## Module Flow

```text
File Upload
     ↓
File Analysis / Preview
     ↓
Customer selects print configuration
     ↓
Customer clicks "Print"
     ↓
Create PrintJob
     ↓
CREATED
     ↓
PROCESSING
     ↓
PAYMENT_REQUIRED
     ↓
QUEUED
     ↓
DISPATCHED
     ↓
PRINTING
     ↓
COMPLETED
```

Failure / cancellation states:

```text
PROCESSING_FAILED
PRINT_FAILED
CANCELLED
```

---

# API

Base path:

```text
/api/print-jobs
```

## Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/print-jobs` | Create a PrintJob |
| `GET` | `/api/print-jobs/:id` | Get a PrintJob |
| `PATCH` | `/api/print-jobs/:id/status` | Update PrintJob status |

> The status endpoint is currently useful for backend development/testing. The frontend should not arbitrarily change PrintJob status in normal application flow.

---

# 1. Create PrintJob

Creates a new PrintJob after the customer confirms the printing configuration.

### Request

```http
POST /api/print-jobs
Content-Type: application/json
```

### Request Body

```json
{
  "sourceFileIds": [
    "550e8400-e29b-41d4-a716-446655440000"
  ],
  "printConfiguration": {
    "colorMode": "COLOR",
    "paperSize": "A4",
    "orientation": "PORTRAIT",
    "duplex": "SINGLE",
    "copies": 2,
    "pageSelection": {
      "type": "PAGES",
      "pages": [1, 3, 5]
    }
  }
}
```

### Request Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `sourceFileIds` | `string[]` | Yes | IDs of uploaded source files |
| `printConfiguration` | `object` | Yes | Customer's confirmed print settings |
| `colorMode` | `string` | Yes | `COLOR` or `BW` |
| `paperSize` | `string` | Yes | `A4` or `A3` |
| `orientation` | `string` | Yes | `PORTRAIT` or `LANDSCAPE` |
| `duplex` | `string` | Yes | `SINGLE` or `DOUBLE` |
| `copies` | `number` | Yes | Number of copies, `1–100` |
| `pageSelection.type` | `string` | Yes | `ALL`, `PAGES`, or `RANGES` |
| `pageSelection.pages` | `number[]` | Conditional | Used when type is `PAGES` |
| `pageSelection.ranges` | `object[]` | Conditional | Used when type is `RANGES` |

### Page Selection — All Pages

```json
{
  "pageSelection": {
    "type": "ALL"
  }
}
```

### Page Selection — Specific Pages

```json
{
  "pageSelection": {
    "type": "PAGES",
    "pages": [1, 3, 7]
  }
}
```

### Page Selection — Ranges

```json
{
  "pageSelection": {
    "type": "RANGES",
    "ranges": [
      {
        "start": 1,
        "end": 5
      },
      {
        "start": 10,
        "end": 15
      }
    ]
  }
}
```

### Successful Response

**HTTP `201 Created`**

```json
{
  "success": true,
  "data": {
    "id": "PRINT_JOB_ID",
    "sourceFileIds": [
      "550e8400-e29b-41d4-a716-446655440000"
    ],
    "printConfiguration": {
      "colorMode": "COLOR",
      "paperSize": "A4",
      "orientation": "PORTRAIT",
      "duplex": "SINGLE",
      "copies": 2,
      "pageSelection": {
        "type": "PAGES",
        "pages": [1, 3, 5]
      }
    },
    "status": "CREATED",
    "createdAt": "2026-09-29T07:19:00.000Z",
    "updatedAt": "2026-09-29T07:19:00.000Z"
  }
}
```

---

# 2. Get PrintJob

Returns an existing PrintJob by its ID.

### Request

```http
GET /api/print-jobs/:id
```

### URL Parameter

| Parameter | Type | Required | Description |
|---|---|---|---|
| `id` | `string` | Yes | PrintJob ID |

### Example

```http
GET /api/print-jobs/PRINT_JOB_ID
```

### Successful Response

**HTTP `200 OK`**

```json
{
  "success": true,
  "data": {
    "id": "PRINT_JOB_ID",
    "sourceFileIds": [
      "550e8400-e29b-41d4-a716-446655440000"
    ],
    "printConfiguration": {
      "colorMode": "COLOR",
      "paperSize": "A4",
      "orientation": "PORTRAIT",
      "duplex": "SINGLE",
      "copies": 2,
      "pageSelection": {
        "type": "PAGES",
        "pages": [1, 3, 5]
      }
    },
    "status": "PROCESSING",
    "createdAt": "2026-09-29T07:19:00.000Z",
    "updatedAt": "2026-09-29T07:20:00.000Z"
  }
}
```

---

# 3. Update PrintJob Status

Updates the status of an existing PrintJob.

### Request

```http
PATCH /api/print-jobs/:id/status
Content-Type: application/json
```

### Request Body

```json
{
  "status": "PROCESSING"
}
```

### Allowed Status Values

```text
CREATED
PROCESSING
PAYMENT_REQUIRED
QUEUED
DISPATCHED
PRINTING
COMPLETED
PROCESSING_FAILED
PRINT_FAILED
CANCELLED
```

### Successful Response

**HTTP `200 OK`**

```json
{
  "success": true,
  "data": {
    "id": "PRINT_JOB_ID",
    "status": "PROCESSING"
  }
}
```

---

# PrintJob Statuses

| Status | Meaning |
|---|---|
| `CREATED` | Customer's confirmed PrintJob has been created |
| `PROCESSING` | Document is being prepared for printing |
| `PAYMENT_REQUIRED` | Processing is complete but the required payment condition is not satisfied |
| `QUEUED` | Print-ready job is waiting for a System Node |
| `DISPATCHED` | Job has been assigned/sent to a System Node |
| `PRINTING` | System Node has started printing |
| `COMPLETED` | Printing completed successfully |
| `PROCESSING_FAILED` | Document preparation failed |
| `PRINT_FAILED` | Printing failed |
| `CANCELLED` | PrintJob was cancelled |

---

# Valid Status Transitions

A PrintJob cannot move directly between arbitrary statuses.

```text
CREATED
 ├── PROCESSING
 └── CANCELLED

PROCESSING
 ├── PAYMENT_REQUIRED
 ├── PROCESSING_FAILED
 └── CANCELLED

PAYMENT_REQUIRED
 ├── QUEUED
 └── CANCELLED

QUEUED
 ├── DISPATCHED
 └── CANCELLED

DISPATCHED
 ├── PRINTING
 └── PRINT_FAILED

PRINTING
 ├── COMPLETED
 └── PRINT_FAILED

PROCESSING_FAILED
 ├── PROCESSING
 └── CANCELLED

PRINT_FAILED
 ├── QUEUED
 └── CANCELLED

COMPLETED
 └── No further transition

CANCELLED
 └── No further transition
```

---

# Frontend Integration Flow

The frontend should treat the PrintJob as the order created after the customer confirms their print request.

```text
1. Upload file
       ↓
2. Receive sourceFileId
       ↓
3. Show file preview
       ↓
4. Customer selects:
       - Color / B&W
       - Paper size
       - Orientation
       - Duplex
       - Copies
       - Pages / ranges
       ↓
5. Customer clicks "Print"
       ↓
6. POST /api/print-jobs
       ↓
7. Receive PrintJob ID + status
       ↓
8. Continue with Payment flow
       ↓
9. Track PrintJob status
```

The frontend should **not** create a PrintJob during file upload.

---

# Frontend Status Display

The frontend can map backend statuses to user-facing messages:

| Backend Status | Suggested UI Message |
|---|---|
| `CREATED` | Preparing your print job |
| `PROCESSING` | Processing your document |
| `PAYMENT_REQUIRED` | Payment required |
| `QUEUED` | Waiting for printer |
| `DISPATCHED` | Sending job to printer |
| `PRINTING` | Printing your document |
| `COMPLETED` | Printing completed |
| `PROCESSING_FAILED` | Document processing failed |
| `PRINT_FAILED` | Printing failed |
| `CANCELLED` | Print job cancelled |

These UI messages are suggestions; the frontend can choose its own presentation.

---

# Validation Rules

The API validates incoming requests using Zod.

Important validation rules:

- At least one `sourceFileId` is required.
- `colorMode` must be `COLOR` or `BW`.
- `paperSize` must be `A4` or `A3`.
- `orientation` must be `PORTRAIT` or `LANDSCAPE`.
- `duplex` must be `SINGLE` or `DOUBLE`.
- `copies` must be an integer between `1` and `100`.
- Page numbers must be positive integers.
- Status must be one of the supported PrintJob statuses.
- Status transitions must follow the defined transition rules.

---

# Module Responsibilities

### This module handles

- PrintJob creation
- PrintJob retrieval
- Print configuration storage
- PrintJob lifecycle state
- Status transition validation

### This module does NOT handle

- File upload
- File storage
- Document/image processing
- OCR
- Payment processing
- Pricing calculation
- Payment verification
- Queue management
- System Node communication
- Printer communication

Those responsibilities belong to their respective modules.

---

# Important API Contract

The following entities are intentionally separated:

```text
File
  ↓
PrintJob
  ↓
Payment
  ↓
Queue
  ↓
System Node
  ↓
Printer
```

A PrintJob contains references to source files and the customer's confirmed print configuration.

Payment information is handled by the **Payment module**, not the PrintJob module.

---

# Current Module Structure

```text
src/modules/printJob/

├── printJob.controller.ts
├── printJob.model.ts
├── printJob.repository.ts
├── printJob.routes.ts
├── printJob.schema.ts
├── printJob.service.ts
├── printJob.status.ts
├── printJob.transitions.ts
└── printJob.types.ts
```

---

# Notes

This README describes the current PrintJob API contract.

As the PrintNow backend evolves, additional APIs may be introduced for:

- PrintJob history
- Cancellation
- Retry
- Real-time status updates
- Customer-facing tracking
- System Node dispatch
- Queue management

Those concerns are intentionally kept separate from the current core PrintJob API.
