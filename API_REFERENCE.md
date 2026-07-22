# API Reference - ELIESIO MONTE

## Base URL
```
http://localhost:3000 (desenvolvimento)
https://seu-dominio.vercel.app (produção)
```

## Authentication (Cliente via WhatsApp)

### Request OTP
```bash
POST /api/auth/request-otp
Content-Type: application/json

{
  "phoneNumber": "+5511987654321"
}

# Resposta (200 OK)
{
  "success": true,
  "message": "Código enviado via WhatsApp",
  "sessionId": "uuid"
}
```

### Verify OTP
```bash
POST /api/auth/verify-otp
Content-Type: application/json

{
  "phoneNumber": "+5511987654321",
  "otpCode": "123456"
}

# Resposta (200 OK)
{
  "success": true,
  "customerId": "uuid",
  "phoneNumber": "+5511987654321"
}
```

## Appointments (Cliente)

### List Available Slots
```bash
GET /api/appointments/available?date=2026-08-15&serviceId=uuid&barberId=uuid
Authorization: Bearer token (opcional)

# Resposta
{
  "available": [
    {
      "startTime": "09:00",
      "endTime": "09:30",
      "barberId": "uuid",
      "barberName": "Carlos Silva"
    }
  ]
}
```

### Create Appointment
```bash
POST /api/appointments/create
Content-Type: application/json

{
  "customerId": "uuid",
  "barberId": "uuid",
  "serviceId": "uuid",
  "scheduledDatetime": "2026-08-15T09:00:00Z",
  "phoneNumber": "+5511987654321"
}

# Resposta (201 Created)
{
  "success": true,
  "appointmentId": "uuid",
  "message": "Agendamento confirmado!"
}
```

### Cancel Appointment
```bash
POST /api/appointments/cancel
Content-Type: application/json

{
  "appointmentId": "uuid",
  "customerId": "uuid",
  "cancellationReason": "Mudança de planos"
}

# Resposta
{
  "success": true,
  "cancellationFee": 50.00,
  "message": "Agendamento cancelado com taxa de R$ 50,00"
}
```

## Dashboard (Cliente)

### Get My Appointments
```bash
GET /api/customer/appointments?customerId=uuid

# Resposta
{
  "upcoming": [
    {
      "id": "uuid",
      "barberName": "Carlos Silva",
      "serviceName": "Corte Simples",
      "scheduledDatetime": "2026-08-15T09:00:00Z",
      "price": 50.00,
      "status": "confirmed"
    }
  ],
  "history": [
    {
      "id": "uuid",
      "barberName": "João Santos",
      "serviceName": "Fade Moderno",
      "scheduledDatetime": "2026-07-20T10:00:00Z",
      "price": 60.00,
      "status": "completed"
    }
  ]
}
```

## Admin Panel

### Login
```bash
POST /api/admin/login
Content-Type: application/json

{
  "email": "admin@eliesio.com",
  "password": "admin123"
}

# Resposta (200 OK)
{
  "success": true,
  "adminId": "uuid",
  "email": "admin@eliesio.com"
}
```

### Get KPIs
```bash
GET /api/admin/kpis?date=2026-08-15

# Resposta
{
  "revenue": 450.00,
  "totalAppointments": 8,
  "confirmedAppointments": 7,
  "cancelledAppointments": 1,
  "occupancyRate": 87.5,
  "topBarber": {
    "name": "Carlos Silva",
    "appointments": 4
  }
}
```

### List Appointments (Admin)
```bash
GET /api/admin/appointments?date=2026-08-15&status=confirmed

# Resposta
{
  "appointments": [
    {
      "id": "uuid",
      "customerName": "João Silva",
      "customerPhone": "+5511987654321",
      "barberName": "Carlos Silva",
      "serviceName": "Corte + Barba",
      "scheduledDatetime": "2026-08-15T09:00:00Z",
      "status": "confirmed",
      "price": 75.00
    }
  ]
}
```

### Get Notifications History
```bash
GET /api/admin/notifications?date=2026-08-15

# Resposta
{
  "notifications": [
    {
      "id": "uuid",
      "type": "confirmation",
      "phoneNumber": "+5511987654321",
      "message": "Seu agendamento foi confirmado...",
      "status": "sent",
      "sentAt": "2026-08-15T09:00:00Z"
    }
  ],
  "countByType": {
    "confirmation": 8,
    "reminder": 5,
    "cancellation": 1
  }
}
```

## Background Jobs

### Send Reminders
```bash
GET /api/jobs/send-reminders
# Executar a cada hora via cron job

# Resposta
{
  "success": true,
  "remindersSent": 12,
  "failureCount": 0
}
```

### Seed Database
```bash
GET /api/seed
# Executa apenas uma vez para popular dados iniciais

# Resposta
{
  "success": true,
  "message": "Database seeded successfully",
  "barbersCreated": 3,
  "servicesCreated": 5
}
```

## Error Responses

### 400 Bad Request
```json
{
  "error": "Invalid phone number format",
  "code": "INVALID_INPUT"
}
```

### 401 Unauthorized
```json
{
  "error": "Invalid OTP code",
  "code": "INVALID_OTP"
}
```

### 409 Conflict
```json
{
  "error": "Appointment time already taken",
  "code": "SLOT_UNAVAILABLE"
}
```

### 500 Server Error
```json
{
  "error": "Failed to send notification",
  "code": "NOTIFICATION_ERROR"
}
```

## Rate Limiting

- OTP Requests: 5 tentativas por telefone a cada 15 minutos
- Appointments Create: 1 por minuto por cliente
- Admin Queries: Sem limite para IPs autenticados

## Webhook Events (Optional)

Quando implementado, os seguintes eventos podem ser disparados:

- `appointment.created`
- `appointment.confirmed`
- `appointment.cancelled`
- `notification.sent`
- `notification.failed`

## Testing

### cURL Examples

```bash
# Request OTP
curl -X POST http://localhost:3000/api/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+5511987654321"}'

# Verify OTP
curl -X POST http://localhost:3000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+5511987654321", "otpCode": "123456"}'

# Get Available Slots
curl http://localhost:3000/api/appointments/available?date=2026-08-15

# Login Admin
curl -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@eliesio.com", "password": "admin123"}'
```

## Postman Collection

Import this JSON into Postman to test all endpoints:
[eliesio-monte-api.postman_collection.json](./postman-collection.json)
