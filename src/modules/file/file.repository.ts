import { Types } from "mongoose";

import { FileModel, type FileDocumentShape } from "./file.model.js";

import type { FileAnalysis, FileEntity, FileValidation } from "./file.types.js";

import type { FileStatus } from "./file.status.js";

export interface CreateFileData {
  id: string;
  sessionId: string;
  original: FileEntity["original"];
  storage: FileEntity["storage"];
  analysis: FileAnalysis;
  validation: FileValidation;
  status: FileStatus;
}

export class FileRepository {
  async create(file: CreateFileData): Promise<FileEntity> {
    if (!Types.ObjectId.isValid(file.id)) {
      throw new Error("Invalid file ID");
    }

    const document = await FileModel.create({
      _id: new Types.ObjectId(file.id),
      sessionId: file.sessionId,
      original: file.original,
      storage: file.storage,
      analysis: file.analysis,
      validation: file.validation,
      status: file.status,
    });

    return this.toEntity(document.toObject());
  }

  async findById(id: string): Promise<FileEntity | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }

    const document = await FileModel.findById(id).lean();

    return document ? this.toEntity(document) : null;
  }

  async findByIdAndSession(
    id: string,
    sessionId: string,
  ): Promise<FileEntity | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }

    const document = await FileModel.findOne({
      _id: id,
      sessionId,
    }).lean();

    return document ? this.toEntity(document) : null;
  }

  async findBySessionId(sessionId: string): Promise<FileEntity[]> {
    const documents = await FileModel.find({ sessionId })
      .sort({ createdAt: 1 })
      .lean();

    return documents.map((document) => this.toEntity(document));
  }

  async transitionStatus(
    id: string,
    currentStatus: FileStatus,
    nextStatus: FileStatus,
  ): Promise<FileEntity | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }

    const document = await FileModel.findOneAndUpdate(
      {
        _id: id,
        status: currentStatus,
      },
      {
        $set: {
          status: nextStatus,
        },
      },
      {
        new: true,
        runValidators: true,
      },
    ).lean();

    return document ? this.toEntity(document) : null;
  }

  async updateValidation(
    id: string,
    validation: FileValidation,
  ): Promise<FileEntity | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }

    const document = await FileModel.findByIdAndUpdate(
      id,
      {
        $set: {
          validation,
        },
      },
      {
        new: true,
        runValidators: true,
      },
    ).lean();

    return document ? this.toEntity(document) : null;
  }

  async updateAnalysis(
    id: string,
    analysis: FileAnalysis,
  ): Promise<FileEntity | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }

    const document = await FileModel.findByIdAndUpdate(
      id,
      {
        $set: {
          analysis,
        },
      },
      {
        new: true,
        runValidators: true,
      },
    ).lean();

    return document ? this.toEntity(document) : null;
  }

  async deleteById(id: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(id)) {
      return false;
    }

    const result = await FileModel.deleteOne({
      _id: id,
    });

    return result.deletedCount === 1;
  }

  private toEntity(
    document: FileDocumentShape & {
      _id: Types.ObjectId;
      __v?: number;
      createdAt?: Date;
      updatedAt?: Date;
    },
  ): FileEntity {
    const createdAt = document.createdAt ?? new Date();
    const updatedAt = document.updatedAt ?? createdAt;

    return {
      id: document._id.toString(),

      sessionId: document.sessionId,

      original: {
        filename: document.original.filename,
        mimeType: document.original.mimeType,
        size: document.original.size,
      },

      storage: {
        objectKey: document.storage.objectKey,
      },

      analysis: {
        ...(document.analysis?.pageCount !== undefined && {
          pageCount: document.analysis.pageCount,
        }),
      },
      validation: {
        status: document.validation.status,
        errors: [...document.validation.errors],
        ...(document.validation.validatedAt !== undefined && {
          validatedAt: document.validation.validatedAt,
        }),
      },

      status: document.status,

      createdAt,
      updatedAt,
    };
  }
}
