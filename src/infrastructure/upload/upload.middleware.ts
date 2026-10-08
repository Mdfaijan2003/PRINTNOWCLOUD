import multer from "multer";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";

const TEMP_UPLOAD_DIR = path.resolve(
  process.env.TEMP_UPLOAD_DIR ?? "./tmp/uploads",
);

mkdirSync(TEMP_UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, TEMP_UPLOAD_DIR);
  },

  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname);

    cb(null, `${randomUUID()}${extension}`);
  },
});

export const uploadMiddleware = multer({
  storage,

  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB
    files: 1,
  },
});
