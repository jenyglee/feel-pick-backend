/*
  Warnings:

  - Added the required column `userId` to the `Pick` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Pick` ADD COLUMN `userId` VARCHAR(36) NOT NULL;

-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(36) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `displayName` VARCHAR(50) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Pick_userId_idx` ON `Pick`(`userId`);

-- AddForeignKey
ALTER TABLE `Pick` ADD CONSTRAINT `Pick_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
