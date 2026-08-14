-- CreateTable
CREATE TABLE "stored_files" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "pathname" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stored_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stored_files_pathname_key" ON "stored_files"("pathname");

-- CreateIndex
CREATE INDEX "stored_files_user_id_idx" ON "stored_files"("user_id");

-- AddForeignKey
ALTER TABLE "stored_files" ADD CONSTRAINT "stored_files_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
