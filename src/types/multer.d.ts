// src/types/multer.d.ts
declare namespace Express {
  namespace Multer {
    interface File {
      /** Field name specified in the form */
      fieldname: string;
      /** Name of the file on the user's computer */
      originalname: string;
      /** Encoding of the file */
      encoding: string;
      /** MIME type of the file */
      mimetype: string;
      /** Size of the file in bytes */
      size: number;
      /** Destination folder where the file is stored */
      destination: string;
      /** Name of the file within the destination */
      filename: string;
      /** Full path to the stored file */
      path: string;
      /** File contents as a Buffer (if in‑memory storage) */
      buffer: Buffer;
    }
  }
}
