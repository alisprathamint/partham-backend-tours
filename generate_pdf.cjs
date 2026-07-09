const PDFDocument = require('pdfkit');
const fs = require('fs');

const doc = new PDFDocument({ margin: 50 });

doc.pipe(fs.createWriteStream('C:\\Users\\DELL\\Desktop\\pratham-tours\\Website_Images_Dimensions.pdf'));

// Add Title
doc
  .fontSize(24)
  .font('Helvetica-Bold')
  .text('Pratham Tours - Website Images Dimensions Guide', {
    align: 'center'
  });
doc.moveDown(2);

// Introduction
doc
  .fontSize(12)
  .font('Helvetica')
  .text(
    'This document provides the EXACT Width and Height (in pixels) for all images used across the Pratham Tours website.'
  );
doc.moveDown(2);

// Function to add a section with explicit Width and Height
function addSection(title, location, width, height, mobileBehavior) {
  doc.fontSize(16).font('Helvetica-Bold').fillColor('#f37121').text(title);
  doc.moveDown(0.5);
  doc.fontSize(12).font('Helvetica-Bold').fillColor('#333333').text('Location: ', { continued: true }).font('Helvetica').text(location);
  
  doc.moveDown(0.2);
  doc.fontSize(13).font('Helvetica-Bold').fillColor('#228B22').text(`Width: ${width} Pixels`);
  doc.fontSize(13).font('Helvetica-Bold').fillColor('#228B22').text(`Height: ${height} Pixels`);
  
  doc.moveDown(0.2);
  doc.fontSize(12).font('Helvetica-Bold').fillColor('#333333').text('Details: ', { continued: true }).font('Helvetica').text(mobileBehavior);
  doc.moveDown(1.5);
}

// 1. Home Page Hero Banner
addSection(
  '1. Home Page Main Banner (Slider)',
  'Top of the Home Page (Hero Section)',
  '1920',
  '1080',
  'Ensure the main subject is in the center, as sides get cropped on mobile.'
);

// 2. Package Cards
addSection(
  '2. Tour Package Cards',
  'Home Page (Popular Packages) & Packages List Page',
  '800',
  '600',
  'This is a 4:3 aspect ratio. Using exact sizes keeps all cards perfectly aligned.'
);

// 3. Destination Cards
addSection(
  '3. Top Destinations Cards',
  'Home Page (Top Travel Destinations) & Destinations Page',
  '500',
  '300',
  'Standard landscape ratio.'
);

// 4. Package Details Page Banner
addSection(
  '4. Package Details Page Banner',
  'Top of individual package details page',
  '1920',
  '800',
  'Wide panoramic format. Ensure center focus.'
);

// 5. Website Logo
addSection(
  '5. Website Logo',
  'Top Navigation Bar (Navbar)',
  '300',
  '100',
  'Must be a Transparent PNG so it looks good on white backgrounds.'
);

// Finalize PDF file
doc.end();

console.log('PDF updated successfully!');
