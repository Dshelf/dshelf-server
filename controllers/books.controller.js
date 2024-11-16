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
    // Updated pagination to allow for larger page sizes
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10; // Increased default limit
    const startIndex = (page - 1) * limit;

    const totalDocuments = await Books.countDocuments({
      owner: req.user._id,
    });

    const listings = await Books.find({ owner: req.user._id })
      .sort("-createdAt") // Added sorting by creation date
      .skip(startIndex)
      .limit(limit);

    if (!listings) {
      return next(new ErrorResponse("listings not found"), 404); // Changed status code to 404
    }

    const pagination = {};

    if (startIndex + listings.length < totalDocuments) {
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

    res.status(200).json({
      status: true,
      data: listings,
      pagination,
      total: totalDocuments,
      currentPage: page,
      totalPages: Math.ceil(totalDocuments / limit),
    });
  } catch (error) {
    next(error);
  }
};

exports.GetListings = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10; // Increased default limit
    const startIndex = (page - 1) * limit;

    let queryObj = { ...req.query };
    const excludeFields = ["page", "limit", "sort"];
    excludeFields.forEach((field) => delete queryObj[field]);

    // Add isListed filter to only show active listings
    queryObj.isListed = true;

    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(
      /\b(gt|gte|lt|lte|in)\b/g,
      (match) => `$${match}`
    );
    queryObj = JSON.parse(queryStr);

    let query = Books.find(queryObj);

    if (req.query.sort) {
      const sortBy = req.query.sort.split(",").join(" ");
      query = query.sort(sortBy);
    } else {
      query = query.sort("-createdAt");
    }

    const totalDocuments = await Books.countDocuments(queryObj);
    query = query.skip(startIndex).limit(limit);
    const listings = await query;

    const pagination = {};
    if (startIndex > 0) {
      pagination.prev = { page: page - 1, limit: limit };
    }
    if (startIndex + listings.length < totalDocuments) {
      pagination.next = { page: page + 1, limit: limit };
    }

    res.status(200).json({
      status: true,
      count: listings.length,
      pagination,
      data: listings,
      total: totalDocuments,
      currentPage: page,
      totalPages: Math.ceil(totalDocuments / limit),
      message:
        listings.length === 0
          ? "No listings found"
          : "Listings retrieved successfully",
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
    // Generate a unique filename using timestamp and random string
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const uniqueFilename = `${userId}_${timestamp}_${randomString}`;

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "deshelf",
        public_id: uniqueFilename,
        resource_type: "auto",
        overwrite: false,
        unique_filename: true,
        use_filename: true,
        timestamp: timestamp, // Add timestamp to URL
        transformation: [{ quality: "auto" }, { fetch_format: "auto" }],
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

        // Upload new image with userId
        const newImageUrl = await uploadImage(req.file, req.user._id);
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

    // Pagination setup
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 7;
    const startIndex = (page - 1) * limit;

    // Count documents matching the category filter
    const totalDocuments = await Books.countDocuments({ category });

    // Retrieve books for the given category with pagination
    const books = await Books.find({ category }).skip(startIndex).limit(limit);

    // Handle case where no books are found for the specified category
    if (books.length === 0) {
      return res.status(404).json({
        status: false,
        message: "No books found in this category",
      });
    }

    // Setup pagination details
    const pagination = {};
    if (startIndex > 0) {
      pagination.prev = { page: page - 1, limit };
    }
    if (startIndex + books.length < totalDocuments) {
      pagination.next = { page: page + 1, limit };
    }

    // Return success response with book data and pagination
    res.status(200).json({
      status: true,
      count: books.length,
      pagination,
      data: books,
      message: "Books retrieved successfully",
    });
  } catch (error) {
    next(error);
  }
};
