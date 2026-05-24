-- DropForeignKey
ALTER TABLE `PickOption` DROP FOREIGN KEY `PickOption_pickId_fkey`;

-- DropForeignKey
ALTER TABLE `Pick` DROP FOREIGN KEY `Pick_userId_fkey`;

-- DropTable
DROP TABLE `PickOption`;

-- DropTable
DROP TABLE `Pick`;
