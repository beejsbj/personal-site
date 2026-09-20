export class ActivityEngineError extends Error {
  constructor(message, code = "ACTIVITY_ENGINE_ERROR") {
    super(message);
    this.name = "ActivityEngineError";
    this.code = code;
  }
}

export class ValidationError extends ActivityEngineError {
  constructor(message) {
    super(message, "VALIDATION_ERROR");
  }
}

export class PolicyError extends ActivityEngineError {
  constructor(message) {
    super(message, "POLICY_ERROR");
  }
}
