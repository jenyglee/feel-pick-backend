-- CreateTable
CREATE TABLE `Pick` (
    `id` VARCHAR(36) NOT NULL,
    `title` VARCHAR(100) NOT NULL,
    `description` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PickOption` (
    `id` VARCHAR(36) NOT NULL,
    `label` VARCHAR(200) NOT NULL,
    `votes` INTEGER NOT NULL DEFAULT 0,
    `pickId` VARCHAR(36) NOT NULL,

    INDEX `PickOption_pickId_idx`(`pickId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PickOption` ADD CONSTRAINT `PickOption_pickId_fkey` FOREIGN KEY (`pickId`) REFERENCES `Pick`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
