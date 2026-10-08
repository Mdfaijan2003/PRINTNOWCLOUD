# PrintNow — File Module API

The File Module handles customer file uploads, validation, basic analysis, cloud storage, and file management for a PrintNow print session.

The frontend should interact with this module only through the APIs documented below. Internal implementation details such as MongoDB, Cloudinary, validators, repositories, and processors are not required for frontend integration.

> **Frontend developers: You do not need to inspect the File Module source code to integrate with it. This document is the API contract for the File Module.**

## Base URL

Development:

```text
http://localhost:5000/files
```

Production:

```text
https://<deployed-backend-url>/files
```

## File Upload Flow

```text
Customer scans QR
       ↓
Print Session created
       ↓
Customer selects/uploads file
       ↓
POST /files
       ↓
Backend validates + analyzes file
       ↓
File becomes READY or FAILED
       ↓
Frontend uses returned File ID
       ↓
Create PrintJob
```

File validation and analysis happen synchronously during the upload request.

The frontend does **not** need to call a separate processing API.

## Supported Files

| File Type | MIME Type |
|---|---|
| PDF | `application/pdf` |
| JPEG | `image/jpeg` |
| PNG | `image/png` |

## 1. Upload File

### Endpoint

```http
POST /files
```

### Headers

```http
X-Session-ID: <session-id>
```

The request uses `multipart/form-data`.

### Body

| Field | Type | Required |
|---|---|---|
| `file` | File | Yes |

The field name **must** be `file`.

### Postman

```text
POST http://localhost:5000/files
```

Header:

```text
X-Session-ID: test-session-001
```

Body → form-data:

```text
Key: file
Type: File
Value: sample.pdf
```

### Successful Response

```http
201 Created
```

```json
{
  "success": true,
  "data": {
    "id": "6ac014478fe5ed862ac0e7dd",
    "sessionId": "test-session-009",
    "original": {
      "filename": "RoyalTurf_Invoice_0F0076.pdf",
      "mimeType": "application/pdf",
      "size": 5266
    },
    "status": "READY",
    "validation": {
      "status": "VALID",
      "errors": [],
      "validatedAt": "2026-10-02T20:30:00.283Z"
    },
    "analysis": {
      "pageCount": 1
    },
    "createdAt": "2026-10-02T20:29:59.887Z"
  }
}
```

## Response Fields

### `id`

Unique File ID. Store this because it is required when creating a PrintJob.

### `sessionId`

The session to which the file belongs.

### `original`

```json
{
  "filename": "document.pdf",
  "mimeType": "application/pdf",
  "size": 5266
}
```

- `filename`: Original filename.
- `mimeType`: MIME type declared during upload.
- `size`: File size in bytes.

## File Status

Possible values:

```text
RECEIVED
PROCESSING
READY
FAILED
```

### `READY`

The file passed validation and analysis and is ready for a PrintJob.

### `FAILED`

The file could not be processed successfully.

Only files with:

```text
status = READY
```

should proceed to Print Configuration / PrintJob creation.

## Validation Status

Possible values:

```text
PENDING
VALID
INVALID
```

Successful example:

```json
{
  "status": "READY",
  "validation": {
    "status": "VALID",
    "errors": []
  }
}
```

Invalid example:

```json
{
  "status": "FAILED",
  "validation": {
    "status": "INVALID",
    "errors": [
      "Unable to determine file type"
    ]
  }
}
```

## Analysis

Currently the API exposes:

```json
{
  "pageCount": 1
}
```

For PDF, `pageCount` is the actual number of PDF pages.

For supported images, `pageCount` is `1`.

The frontend can use `pageCount` when configuring page selection.

# 2. Get File

Returns a specific file belonging to the current session.

### Endpoint

```http
GET /files/:fileId
```

### Headers

```http
X-Session-ID: <session-id>
```

### Example

```http
GET /files/6ac014478fe5ed862ac0e7dd
```

### Successful Response

```http
200 OK
```

```json
{
  "success": true,
  "data": {
    "id": "6ac014478fe5ed862ac0e7dd",
    "sessionId": "test-session-009",
    "original": {
      "filename": "RoyalTurf_Invoice_0F0076.pdf",
      "mimeType": "application/pdf",
      "size": 5266
    },
    "analysis": {
      "pageCount": 1
    },
    "validation": {
      "status": "VALID",
      "errors": [],
      "validatedAt": "2026-10-02T20:30:00.283Z"
    },
    "status": "READY",
    "createdAt": "2026-10-02T20:29:59.887Z",
    "updatedAt": "2026-10-02T20:30:00.500Z"
  }
}
```

# 3. Get All Files for a Session

### Endpoint

```http
GET /files/session/:sessionId
```

### Example

```http
GET /files/session/test-session-009
```

### Successful Response

```http
200 OK
```

```json
{
  "success": true,
  "data": [
    {
      "id": "6ac014478fe5ed862ac0e7dd",
      "sessionId": "test-session-009",
      "original": {
        "filename": "RoyalTurf_Invoice_0F0076.pdf",
        "mimeType": "application/pdf",
        "size": 5266
      },
      "analysis": {
        "pageCount": 1
      },
      "validation": {
        "status": "VALID",
        "errors": [],
        "validatedAt": "2026-10-02T20:30:00.283Z"
      },
      "status": "READY",
      "createdAt": "2026-10-02T20:29:59.887Z",
      "updatedAt": "2026-10-02T20:30:00.500Z"
    }
  ]
}
```

If there are no files:

```json
{
  "success": true,
  "data": []
}
```

# 4. Delete File

### Endpoint

```http
DELETE /files/:fileId
```

### Headers

```http
X-Session-ID: <session-id>
```

### Example

```http
DELETE /files/6ac014478fe5ed862ac0e7dd
```

### Successful Response

```http
204 No Content
```

There is no response body.

# Error Responses

All errors follow:

```json
{
  "success": false,
  "message": "Error message"
}
```

## 400 — Bad Request

Missing file:

```json
{
  "success": false,
  "message": "File is required"
}
```

Missing session ID:

```json
{
  "success": false,
  "message": "Session ID is required"
}
```

## 404 — File Not Found

```json
{
  "success": false,
  "message": "File not found"
}
```

This can happen when the file ID does not exist or the file does not belong to the supplied session.

## 409 — Invalid State Transition

```json
{
  "success": false,
  "message": "Invalid file status transition: PROCESSING -> READY"
}
```

This normally indicates a backend state-management problem and should not be manually handled by the frontend.

## File Size Error

```json
{
  "success": false,
  "message": "File size exceeds the allowed limit"
}
```

## 500 — Server Error

```json
{
  "success": false,
  "message": "Internal server error"
}
```

# Important Frontend Rules

## 1. Always send Session ID

For APIs that operate on a specific file:

```http
X-Session-ID: <session-id>
```

Retain the session ID throughout the customer's QR printing session.

## 2. Do not use a File ID from another session

```text
Session A
 └── File A

Session B
 └── File B
```

A session should not be able to access another session's file.

## 3. Only READY files should proceed to PrintJob

```text
status === "READY"
        ↓
Allow Print Configuration
```

If:

```text
status === "FAILED"
```

display the validation errors and allow the customer to select/upload another file.

# Recommended Frontend Upload Handling

```text
User selects file
      ↓
Show local upload/loading state
      ↓
POST /files
      ↓
Wait for response
      ↓
        ┌───────────────┐
        │               │
     READY           FAILED
        │               │
        ↓               ↓
Show file          Show validation
as available       error
        │
        ↓
Configure printing
        │
        ↓
Create PrintJob
```

There is **no polling** and no separate file-processing API.

The upload request itself performs validation and analysis.

# Postman Test Collection

```text
PrintNow
└── File Module
    ├── Upload PDF
    ├── Upload Image
    ├── Upload Invalid File
    ├── Upload MIME Mismatch
    ├── Get File
    ├── Get Session Files
    ├── Delete File
    └── Get File With Wrong Session
```

Recommended Postman environment variable:

```text
baseUrl = http://localhost:5000
```

Requests:

```text
{{baseUrl}}/files
{{baseUrl}}/files/{{fileId}}
```

# Quick API Reference

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/files` | Upload and process file |
| `GET` | `/files/:fileId` | Get one file |
| `GET` | `/files/session/:sessionId` | Get session files |
| `DELETE` | `/files/:fileId` | Delete file |

# Frontend Integration Summary

### Upload

```http
POST /files
X-Session-ID: <sessionId>
Content-Type: multipart/form-data
```

### Get File

```http
GET /files/:fileId
X-Session-ID: <sessionId>
```

### Get Session Files

```http
GET /files/session/:sessionId
```

### Delete File

```http
DELETE /files/:fileId
X-Session-ID: <sessionId>
```

The most important response fields are:

```text
id
original.filename
original.mimeType
original.size
status
validation.status
validation.errors
analysis.pageCount
```

The frontend should **not depend on internal storage information such as Cloudinary object keys**.
