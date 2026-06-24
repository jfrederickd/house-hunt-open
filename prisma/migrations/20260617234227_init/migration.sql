-- CreateTable
CREATE TABLE "Property" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "contactName" TEXT,
    "organisedThrough" TEXT,
    "addressRaw" TEXT NOT NULL,
    "streetAddress" TEXT,
    "suburb" TEXT,
    "city" TEXT,
    "postcode" TEXT,
    "lat" REAL,
    "lng" REAL,
    "geocodeStatus" TEXT NOT NULL DEFAULT 'manual',
    "addressComplete" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'new',
    "capitalValue" REAL,
    "capitalValueDate" DATETIME,
    "landValue" REAL,
    "improvementValue" REAL,
    "homesEstimate" REAL,
    "homesEstimateLow" REAL,
    "homesEstimateHigh" REAL,
    "otherEstimate" REAL,
    "otherEstimateSource" TEXT,
    "bedrooms" INTEGER,
    "bathrooms" INTEGER,
    "parking" INTEGER,
    "floorAreaM2" REAL,
    "landAreaM2" REAL,
    "yearBuilt" INTEGER,
    "propertyType" TEXT,
    "lastSalePrice" REAL,
    "lastSaleDate" DATETIME,
    "recommendedOfferLow" REAL,
    "recommendedOfferHigh" REAL,
    "offerRationale" TEXT,
    "ourMaxBudget" REAL,
    "compPricePerM2" REAL,
    "imageUrl" TEXT,
    "fieldSources" TEXT,
    "sourceUrls" TEXT,
    "notes" TEXT
);

-- CreateTable
CREATE TABLE "SaleRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "propertyId" TEXT NOT NULL,
    "saleDate" DATETIME NOT NULL,
    "salePrice" REAL NOT NULL,
    "source" TEXT,
    CONSTRAINT "SaleRecord_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Viewing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "propertyId" TEXT NOT NULL,
    "scheduledDate" DATETIME,
    "scheduledTime" TEXT,
    "status" TEXT NOT NULL DEFAULT 'planned',
    "attendees" TEXT,
    "notes" TEXT,
    "rating" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Viewing_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Photo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "propertyId" TEXT NOT NULL,
    "url" TEXT,
    "localPath" TEXT,
    "source" TEXT NOT NULL DEFAULT 'other',
    "caption" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Photo_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "propertyId" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "body" TEXT NOT NULL,
    CONSTRAINT "Note_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DueDiligenceItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "propertyId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "dueDate" DATETIME,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "DueDiligenceItem_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "SaleRecord_propertyId_idx" ON "SaleRecord"("propertyId");

-- CreateIndex
CREATE INDEX "Viewing_propertyId_idx" ON "Viewing"("propertyId");

-- CreateIndex
CREATE INDEX "Photo_propertyId_idx" ON "Photo"("propertyId");

-- CreateIndex
CREATE INDEX "Note_propertyId_idx" ON "Note"("propertyId");

-- CreateIndex
CREATE INDEX "DueDiligenceItem_propertyId_idx" ON "DueDiligenceItem"("propertyId");
