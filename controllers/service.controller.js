const Service = require("../models/Services");
const Search = require("../models/Search");
const getServices = async (req, res) => {
  try {
    const {
      search,
      category,
      minPrice,
      maxPrice,
      sort,
      page = 1,
      limit = 10,
    } = req.query;
    const filter = {};
    if (search) {
      const searchTerm = search.trim().toLowerCase();
      await Search.findOneAndUpdate(
        { term: searchTerm },
        { $inc: { count: 1 } },
        { upsert: true, new: true },
      );
      filter.$or = [
        {
          title: {
            $regex: search,
            $options: "i",
          },
        },
        {
          description: {
            $regex: search,
            $options: "i",
          },
        },
        {
          category: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }
    if (category) {
      filter.category = category;
    }
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) {
        filter.price.$gte = Number(minPrice);
      }
      if (maxPrice) {
        filter.price.$lte = Number(maxPrice);
      }
    }
    let query = Service.find(filter);
    if (sort === "price_asc") {
      query = query.sort({ price: 1 });
    }
    if (sort === "price_desc") {
      query = query.sort({ price: -1 });
    }
    if (sort === "newest") {
      query = query.sort({ createdAt: -1 });
    }
    if (sort === "oldest") {
      query = query.sort({ createdAt: 1 });
    }
    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const skip = (pageNumber - 1) * limitNumber;
    const totalServices = await Service.countDocuments(filter);
<<<<<<< HEAD
    const services = await query
      .skip(skip)
      .limit(limitNumber)
      .populate("freelancer", "username email avatarUrl");
=======

    const services = await query.skip(skip).limit(limitNumber).populate('freelancer', 'username avatarUrl');

>>>>>>> c4ae4c84a6f4bd826047564433ba05c990f6ef43
    res.status(200).json({
      services,
      currentPage: pageNumber,
      totalPages: Math.ceil(totalServices / limitNumber),
      totalServices,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to get services",
      error: error.message,
    });
  }
};
const getPopularSearches = async (req, res) => {
  try {
    const searches = await Search.find()
      .sort({ count: -1 })
      .limit(6)
      .select("term count");
    res.status(200).json(searches);
  } catch (error) {
    res.status(500).json({
      message: "Failed to get popular searches",
      error: error.message,
    });
  }
};
const getServiceById = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id).populate(
      "freelancer",
      "username email avatarUrl",
    );
    if (!service) {
      return res.status(404).json({
        message: "Service not found",
      });
    }
    res.status(200).json(service);
  } catch (error) {
    res.status(500).json({
      message: "Failed to get service",
      error: error.message,
    });
  }
};
const createService = async (req, res) => {
  try {
    const { title, description, price, deliveryTime, category } = req.body;
    const imageUrls = (req.files || []).map((file) => file.url).filter(Boolean);

    const service = await Service.create({
      title,
      category,
      description,
      price,
      deliveryTime,
      images: imageUrls.length
        ? imageUrls
        : Array.isArray(req.body.images)
          ? req.body.images
          : [],
      freelancer: req.user._id,
    });
    res.status(201).json(service);
  } catch (error) {
    res.status(400).json({
      message: "Failed to create service",
      error: error.message,
    });
  }
};
const updateService = async (req, res) => {
  try {
    const { title, description, price, deliveryTime, category } = req.body;
    const updateData = {};

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = Number(price);
    if (deliveryTime !== undefined)
      updateData.deliveryTime = Number(deliveryTime);
    if (category !== undefined) updateData.category = category;

    if (req.files && req.files.length) {
      updateData.images = req.files.map((file) => file.url).filter(Boolean);
    } else if (req.body.images !== undefined) {
      updateData.images = Array.isArray(req.body.images)
        ? req.body.images
        : [req.body.images].filter(Boolean);
    }

    const service = await Service.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });
    if (!service) {
      return res.status(404).json({
        message: "Service not found",
      });
    }
    res.status(200).json(service);
  } catch (error) {
    res.status(400).json({
      message: "Failed to update service",
      error: error.message,
    });
  }
};
const deleteService = async (req, res) => {
  try {
    const service = await Service.findByIdAndDelete(req.params.id);
    if (!service) {
      return res.status(404).json({
        message: "Service not found",
      });
    }
    res.status(200).json({
      message: "Service deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete service",
      error: error.message,
    });
  }
};
const getServicesByFreelancer = async (req, res) => {
  try {
    const services = await Service.find({
<<<<<<< HEAD
      freelancer: req.params.userId,
    });
    return res.status(200).json(services);
=======
      freelancer: req.params.userId
    }).populate('freelancer', 'username avatarUrl')

    return res.status(200).json(services)
>>>>>>> c4ae4c84a6f4bd826047564433ba05c990f6ef43
  } catch (error) {
    return res.status(500).json({
      message: "Failed to get freelancer services",
      error: error.message,
    });
  }
};
const getMyServices = async (req, res) => {
  try {
    const services = await Service.find({
      freelancer: req.user._id,
    });
    res.status(200).json(services);
  } catch (error) {
    res.status(500).json({
      message: "Failed to get your services",
      error: error.message,
    });
  }
};
module.exports = {
  getServices,
  getPopularSearches,
  getServiceById,
  createService,
  updateService,
  deleteService,
  getServicesByFreelancer,
  getMyServices,
};
