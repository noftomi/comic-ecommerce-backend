-- AddUniqueConstraint: prevent duplicate cart entries per user+comic
CREATE UNIQUE INDEX "CartItem_userId_comicId_key" ON "CartItem"("userId", "comicId");

-- AddUniqueConstraint: prevent duplicate reviews per user+comic
CREATE UNIQUE INDEX "Review_userId_comicId_key" ON "Review"("userId", "comicId");
