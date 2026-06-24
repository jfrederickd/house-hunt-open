-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Criterion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'verdict',
    "options" TEXT,
    "mustHave" BOOLEAN NOT NULL DEFAULT false,
    "weight" REAL NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CriterionAssessment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "propertyId" TEXT NOT NULL,
    "criterionId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "value" TEXT,
    "notes" TEXT,
    "flag" TEXT,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CriterionAssessment_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CriterionAssessment_criterionId_fkey" FOREIGN KEY ("criterionId") REFERENCES "Criterion" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CriterionAssessment_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "CriterionAssessment_propertyId_idx" ON "CriterionAssessment"("propertyId");

-- CreateIndex
CREATE INDEX "CriterionAssessment_criterionId_idx" ON "CriterionAssessment"("criterionId");

-- CreateIndex
CREATE INDEX "CriterionAssessment_personId_idx" ON "CriterionAssessment"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "CriterionAssessment_propertyId_criterionId_personId_key" ON "CriterionAssessment"("propertyId", "criterionId", "personId");
