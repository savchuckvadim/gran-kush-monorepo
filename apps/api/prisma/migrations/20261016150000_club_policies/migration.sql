-- CreateEnum
CREATE TYPE "ClubJoinPolicy" AS ENUM ('link_only', 'approval');

-- CreateTable
CREATE TABLE "club_policies" (
    "portal_id" TEXT NOT NULL,
    "join_policy" "ClubJoinPolicy" NOT NULL DEFAULT 'link_only',
    "catalog_outside_club" BOOLEAN NOT NULL DEFAULT false,
    "orders_require_approval" BOOLEAN NOT NULL DEFAULT false,
    "staff_self_orders" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "club_policies_pkey" PRIMARY KEY ("portal_id")
);

-- AddForeignKey
ALTER TABLE "club_policies" ADD CONSTRAINT "club_policies_portal_id_fkey" FOREIGN KEY ("portal_id") REFERENCES "portals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

