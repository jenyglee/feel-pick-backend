-- AlterTable
ALTER TABLE `User` ADD COLUMN `bio` VARCHAR(200) NULL,
    ADD COLUMN `distanceKm` INTEGER NULL,
    ADD COLUMN `interests` JSON NULL,
    ADD COLUMN `photoUrl` VARCHAR(500) NULL;

-- CreateTable
CREATE TABLE `Question` (
    `id` VARCHAR(36) NOT NULL,
    `text` VARCHAR(100) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Selection` (
    `id` VARCHAR(36) NOT NULL,
    `questionId` VARCHAR(36) NOT NULL,
    `selectedUserId` VARCHAR(36) NOT NULL,
    `selectorUserId` VARCHAR(36) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Selection_questionId_idx`(`questionId`),
    INDEX `Selection_selectedUserId_idx`(`selectedUserId`),
    INDEX `Selection_selectorUserId_idx`(`selectorUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Selection` ADD CONSTRAINT `Selection_questionId_fkey` FOREIGN KEY (`questionId`) REFERENCES `Question`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Selection` ADD CONSTRAINT `Selection_selectedUserId_fkey` FOREIGN KEY (`selectedUserId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Selection` ADD CONSTRAINT `Selection_selectorUserId_fkey` FOREIGN KEY (`selectorUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

