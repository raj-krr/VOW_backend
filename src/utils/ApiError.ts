interface ApiErrorDetail {
  field?: string;
  message: string;
}

class ApiError extends Error {
  statusCode: number;
  data: unknown;
  success: boolean;
  message: string;
  errors: ApiErrorDetail[];

  constructor(
    statusCode: number,
    message: string = "Something went wrong",
    errors: ApiErrorDetail[] = [],
    stack: string = ""
  ) {
    super(message);

    this.statusCode = statusCode;
    this.data = null;
    this.message = message;
    this.success = false;
    this.errors = errors;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export { ApiError, ApiErrorDetail };