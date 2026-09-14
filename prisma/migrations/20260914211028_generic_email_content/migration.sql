/*
  Warnings:

  - You are about to drop the column `payload` on the `notification` table. All the data in the column will be lost.
  - You are about to drop the column `template_code` on the `notification` table. All the data in the column will be lost.
  - Added the required column `html_content` to the `notification` table without a default value. This is not possible if the table is not empty.
  - Made the column `subject` on table `notification` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "notification" DROP COLUMN "payload",
DROP COLUMN "template_code",
ADD COLUMN     "html_content" TEXT NOT NULL,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "text_content" TEXT,
ALTER COLUMN "subject" SET NOT NULL;
