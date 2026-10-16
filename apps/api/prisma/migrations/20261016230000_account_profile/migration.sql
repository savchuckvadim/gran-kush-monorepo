-- CreateTable
CREATE TABLE "account_profiles" (
    "user_id" TEXT NOT NULL,
    "first_name" VARCHAR(120),
    "last_name" VARCHAR(120),
    "birthday" DATE,
    "phone" VARCHAR(40),
    "address" VARCHAR(500),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_profiles_pkey" PRIMARY KEY ("user_id")
);

-- AddForeignKey
ALTER TABLE "account_profiles" ADD CONSTRAINT "account_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

