require("dotenv").config();
const Books = require("../models/Book.js");
const ErrorResponse = require("../utils/errorResponse.js");
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/*
get all disputes associated with an account
*/
exports.GetOwnListing = async (req, res, next) => {
  try {
    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 4;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const totalDocuments = await Books.countDocuments({
      owner: req.user._id,
    });
    const listings = await Books.find({ owner: req.user._id })
      .skip(startIndex)
      .limit(limit);

    if (!listings) {
      return next(new ErrorResponse("listings not found"), 201);
    }

    const pagination = {};

    if (endIndex < totalDocuments) {
      pagination.next = {
        page: page + 1,
        limit: limit,
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit: limit,
      };
    }

    res.status(200).json({ status: true, data: listings, pagination });
  } catch (error) {
    next(error);
  }
};

exports.GetListings = async (req, res, next) => {
  try {
    // Pagination setup
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 4;
    const startIndex = (page - 1) * limit;

    // Build query
    let queryObj = { ...req.query };
    const excludeFields = ["page", "limit", "sort"];
    excludeFields.forEach((field) => delete queryObj[field]);

    // Convert query string to MongoDB query
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, (match) => `$${match}`);
    queryObj = JSON.parse(queryStr);

    // Execute base query
    let query = Books.find(queryObj);

    // Sorting
    if (req.query.sort) {
      const sortBy = req.query.sort.split(",").join(" ");
      query = query.sort(sortBy);
    } else {
      query = query.sort("-createdAt"); // Default sort by newest
    }

    // Counting total documents
    const totalDocuments = await Books.countDocuments(queryObj);

    // Apply pagination
    query = query.skip(startIndex).limit(limit);

    // Execute query to get listings
    const listings = await query;

    // Pagination result
    const pagination = {};
    if (startIndex > 0) {
      pagination.prev = { page: page - 1, limit: limit };
    }
    if (startIndex + listings.length < totalDocuments) {
      pagination.next = { page: page + 1, limit: limit };
    }

    // Response
    res.status(200).json({
      success: true,
      count: listings.length,
      pagination,
      data: listings,
      message: listings.length === 0 ? "No listings found" : "Listings retrieved successfully",
    });
  } catch (error) {
    next(error);
  }
};


exports.GetParticularListed = async (req, res, next) => {
  const { listing_id } = req.params;
  try {
    const findam = await Books.findOne({ _id: listing_id });
    if (!findam) {
      return next(new ErrorResponse("id does not exist", 201));
    }

    return res.status(200).json({ status: true, data: findam });
  } catch (error) {
    next(error);
  }
};

const uploadImage = (file, userId) => {
  return new Promise((resolve, reject) => {
    const uniqueFilename = `${userId}`;
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "deshelf",
        public_id: uniqueFilename,
        resource_type: "auto",
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result.secure_url);
      }
    );

    streamifier.createReadStream(file.buffer).pipe(uploadStream);
  });
};

/**
 * this is to update the user password
 *
 */
exports.CreateListing = async (req, res, next) => {
  try {
    // I check the type
    //from the type I
    const {
      book_name,
      author_name,
      location,
      price,
      condition,
      defects,
      description,
      category,
      whatsappLink,
    } = req.body;

    console.log(req.file, "filetest", req.body);
    const file = req.file; // Assuming you're using a middleware like multer to handle file uploads
    if (!file) {
      return next(new ErrorResponse("product images are very needed", 404));
    }
    // Check if any required field is missing
    const requiredFields = [
      "book_name",
      "author_name",
      "location",
      "price",
      "condition",
      "defects",
      "description",
      "category",
      "whatsappLink",
    ];

    for (let field of requiredFields) {
      if (!req.body[field]) {
        return next(new ErrorResponse(`${field} is required`, 400));
      }
    }

    const uploadedImageUrl = await uploadImage(file, req.user._id);

    const newBook = new Books({
      title: book_name,
      author_name: author_name,
      price: price,
      category: category,
      owner: req.user._id,
      location: location,
      condition: condition,
      defects: defects,
      description: description,
      isListed: true,
      img_url: uploadedImageUrl,
      whatsappLink: whatsappLink,
    });

    newBook.save();

    return res.status(200).json({
      status: true,
      data: newBook,
    });
  } catch (error) {
    next(error);
  }
};

// Helper function to get public_id from Cloudinary URL
const getPublicIdFromUrl = (url) => {
  const splitUrl = url.split("/");
  const filename = splitUrl[splitUrl.length - 1];
  return filename.split(".")[0]; // Remove file extension
};

exports.EditListing = async (req, res, next) => {
  const { listing_id } = req.body;
  try {
    const book = await Books.findById(listing_id);

    if (!book) {
      return next(new ErrorResponse("Listing does not exist", 404));
    }

    // Check if the user is the owner of the listing
    if (book.owner.toString() !== req.user._id.toString()) {
      return next(
        new ErrorResponse("Not authorized to edit this listing", 403)
      );
    }

    // Update fields from request body
    const updateFields = [
      "title",
      "author_name",
      "price",
      "condition",
      "defects",
      "description",
      "location",
    ];
    updateFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        book[field] = req.body[field];
      }
    });

    // Handle image upload if a new file is provided
    if (req.file) {
      try {
        // Delete old image if it exists
        if (book.img_url) {
          const publicId = getPublicIdFromUrl(book.img_url);
          await cloudinary.uploader.destroy(publicId);
        }

        // Upload new image
        const newImageUrl = await uploadImage(req.file);
        book.img_url = newImageUrl;
      } catch (uploadError) {
        return next(new ErrorResponse("Error managing image upload", 500));
      }
    }

    // Save the updated book
    await book.save();

    return res.status(200).json({
      status: true,
      message: "Listing updated successfully",
      data: book,
    });
  } catch (error) {
    next(error);
  }
};

exports.MarkAsSold = async (req, res, next) => {
  const { listing_id } = req.body;
  try {
    const book = await Books.findById(listing_id);

    if (!book) {
      return next(new ErrorResponse("Listing does not exist", 404));
    }

    const bookUpdated = await Books.findOneAndUpdate(
      { _id: listing_id },
      { $set: { isListed: false } },
      { new: true }
    );
    return res.status(200).json({ status: true, data: bookUpdated });
  } catch (error) {
    next(error);
  }
};

exports.DeleteListing = async (req, res, next) => {
  const { listing_id } = req.body;
  try {
    const book = await Books.findById(listing_id);

    if (!book) {
      return next(new ErrorResponse("Listing does not exist", 404));
    }

    const publicId = getPublicIdFromUrl(book.img_url);
    await cloudinary.uploader.destroy(publicId);

    await Books.deleteOne({ _id: listing_id });
    return res.status(200).json({ status: true, message: "listing removed" });
  } catch (error) {
    next(error);
  }
};

exports.GetByCategory = async (req, res, next) => {
  try {
    const { category } = req.params;

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 4;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    const totalDocuments = await Books.countDocuments();
    const books = await Books.find({ category: category })
      .skip(startIndex)
      .limit(limit);

    const pagination = {};

    if (endIndex < totalDocuments) {
      pagination.next = {
        page: page + 1,
        limit: limit,
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit: limit,
      };
    }

    return res.status(200).json({ status: true, data: books, pagination });
  } catch (error) {
    next(error);
  }
};
