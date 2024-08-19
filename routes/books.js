const express = require("express");
const router = express.Router();

const booksController = require("../controllers/books.controller");
const { requireAuth } = require("../middlewares/authMiddleware");
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });

//Books route
//get your own listing
router.get("/get_own_listings", requireAuth, booksController.GetOwnListing);
//post listing
router.post(
  "/post_listing",
  requireAuth,
  upload.single("image"),
  booksController.CreateListing
);
//get all listings with filters and stuff
router.get("/get_listings", booksController.GetListings);
//get particular listed
router.get(
  "/get_particular_listed/:listing_id",
  booksController.GetParticularListed
);
//find a particular dispute
router.put(
  "/edit_listing",
  upload.single("image"),
  requireAuth,
  booksController.EditListing
);

//mark as sold
router.put("/mark_as_sold", requireAuth, booksController.MarkAsSold);

//remove listing
router.delete("/remove_listing", requireAuth, booksController.DeleteListing);

//get by category
router.get(
  "/get_listing_by_category/:category",
  requireAuth,
  booksController.GetByCategory
);

module.exports = router;
