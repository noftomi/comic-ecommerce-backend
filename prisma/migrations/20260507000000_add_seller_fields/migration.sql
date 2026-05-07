-- AlterTable: add seller-specific fields to User
ALTER TABLE "User" ADD COLUMN "cuil"      TEXT;
ALTER TABLE "User" ADD COLUMN "country"   TEXT;
ALTER TABLE "User" ADD COLUMN "birthDate" TIMESTAMP(3);

-- CreateIndex: unique constraint on cuil
CREATE UNIQUE INDEX "User_cuil_key" ON "User"("cuil");
