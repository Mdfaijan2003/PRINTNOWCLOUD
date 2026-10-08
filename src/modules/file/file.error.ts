export class FileError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "FileError";
  }
}

export class FileNotFoundError extends FileError {
  constructor() {
    super("File not found");
    this.name = "FileNotFoundError";
  }
}

export class FileStorageError extends FileError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "FileStorageError";
  }
}

export class FileMetadataError extends FileError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "FileMetadataError";
  }
}

export class FileDeletionError extends FileError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "FileDeletionError";
  }
}

export class InvalidFileTransitionError extends FileError {
  constructor(currentStatus: string, nextStatus: string) {
    super(`Invalid file status transition: ${currentStatus} -> ${nextStatus}`);

    this.name = "InvalidFileTransitionError";
  }
}
