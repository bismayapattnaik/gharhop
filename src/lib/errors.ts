export class AppError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, 404);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string) {
    super(message, 403);
  }
}

export class PaymentRequiredError extends AppError {
  constructor(message: string) {
    super(message, 402);
  }
}
