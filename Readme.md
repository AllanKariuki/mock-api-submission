# Transaction Service

## Overview
This project is a transaction service that allows users to transfer funds, check account balances, view transaction history, and simulate M-Pesa transactions. It uses Node.js, Express, and PostgreSQL, and includes JWT-based authentication, logging, and RabbitMQ for message queueing.

## Prerequisites
- Node.js (version 16 or higher)
- Docker
- Docker Compose

## Setup

### Clone the repository
```bash
git clone https://github.com/AllanKariuki/transaction-service.git
cd transaction-service
```
### Install dependencies
```bash
npm install
```
### Environment variables
Create a .env file at the root directory and add the following environment variables:
```bash
JWT_SECRET=your_jwt_secret
RABBITMQ_URL=amqp://localhost
DB_HOST=postgres
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=transaction_db
```

## Running the application
### Using docker
Build and start the application using Docker compose:
```bash
docker-compose up --build
```

Change the value of the DB_HOST environment variable in the .env file to localhost if you are not using Docker.

### Without Docker
Start the application without Docker:
```bash
npm start
```

## API Endpoints
### Authentication
```bash
POST /api/auth/login
Request body: { "email": "user@example.com", "password": "password" }
Response: { "token": "jwt_token", "userId": 1 }
```
User Profile
GET /api/auth/profile
Headers: { "Authorization": "Bearer jwt_token" }
Response: { "id": 1, "username": "user", "email": "user@example.com", "phone_number": "+254712345678", "account_balance": 1000.00 }

### Transactions
```bash
POST /api/transactions/transfer  
Headers: { "Authorization": "Bearer jwt_token" }
Request body: { "recipient_id": 2, "amount": 50.00, "description": "Payment for services" }
Response: { "success": true, "message": "Transfer successful" }
```

```bash
GET /api/transactions/balance  
Headers: { "Authorization": "Bearer jwt_token" }
Response: { "success": true, "balance": 1000.00 }
```


```bash
GET /api/transactions/history  
Headers: { "Authorization": "Bearer jwt_token" }
Query parameters: page, limit
Response: { "success": true, "transactions": [...], "total": 100, "page": 1, "totalPages": 10 }
```

```bash
POST /api/transactions/simulate-mpesa  
Headers: { "Authorization": "Bearer jwt_token" }
Request body: { "phone_number": "+254712345678", "amount": 100.00, "transaction_type": "DEPOSIT" }
Response: { "success": true, "message": "M-Pesa transaction simulated" }
```


### Logging
Logs are written to logs/app.log. The logging service provides info and error methods to log messages with metadata.  
### Queueing
RabbitMQ is used for message queueing. The queueingService.js file includes methods to connect to RabbitMQ, send transaction notifications, and consume messages from the queue.