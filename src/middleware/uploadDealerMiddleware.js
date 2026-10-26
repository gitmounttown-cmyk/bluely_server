const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const uploadDirectory = path.join(
  process.cwd(),
  "uploads",
  "dealers"
);

// Create upload directory if it does not exist
fs.mkdirSync(uploadDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDirectory);
  },
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${Date.now()}-${crypto.randomUUID()}${extension}`;
    cb(null, uniqueName);
  },
});

const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];
const allowedMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

const fileFilter = (req, file, cb) => {
  const extension = path.extname(file.originalname).toLowerCase();

  if (
    allowedExtensions.includes(extension) &&
    allowedMimeTypes.includes(file.mimetype)
  ) {
    return cb(null, true);
  }

  cb(
    new Error("Only JPG, JPEG, PNG, WebP images and PDF documents are allowed")
  );
};

const uploadDealerDocuments = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit per file
  },
}).fields([
  { name: "aadhar", maxCount: 1 },
  { name: "pan", maxCount: 1 },
  { name: "gstin", maxCount: 1 },
  { name: "tradeLicense", maxCount: 1 },
  { name: "cancelledCheque", maxCount: 1 },
]);

module.exports = uploadDealerDocuments;