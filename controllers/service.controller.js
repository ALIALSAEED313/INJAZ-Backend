const Service = require("../models/Services");

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

    const services = await query.skip(skip).limit(limitNumber);

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

const getServiceById = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id).populate('freelancer', 'username email avatarUrl');

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
    const { title, description, price, deliveryTime, category, images } = req.body;
    const service = await Service.create({
      title,
      description,
      price,
      deliveryTime,
      category,
      images,
      freelancer : req.user._id
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
    const service = await Service.findByIdAndUpdate(req.params.id, req.body, {
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

const getMyServices = async (req, res) => {
  try {
    const services = await Service.find({ freelancer: req.user._id });
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
  getServiceById,
  createService,
  updateService,
  deleteService,
  getMyServices,
};
