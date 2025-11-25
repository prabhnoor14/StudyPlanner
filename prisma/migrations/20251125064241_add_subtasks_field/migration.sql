-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "subtasks" TEXT[] DEFAULT ARRAY[]::TEXT[];
