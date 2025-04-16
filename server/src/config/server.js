const path = require('path');
const multer = require('multer');
const fs = require('fs-extra');

// Server configuration
const PORT = 3001;

// File storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

// Path for exports directory - MODIFIED to match reference project structure
const getExportsDirectory = () => {
  const dirPath = path.join(__dirname, '../../exports');
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  return dirPath;
};

// Path for uploads directory
const getUploadsDirectory = () => {
  const dirPath = path.join(__dirname, '../../uploads');
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  return dirPath;
};

// Get root directory
const getRootDirectory = () => path.join(__dirname, '../..');

module.exports = {
  PORT,
  upload,
  getExportsDirectory,
  getUploadsDirectory,
  getRootDirectory
};