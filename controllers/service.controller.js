const Service = require("../models/Services");

const createService = async (req, res) => {
  try {
    const service = await Service.create(req.body);

    res.status(201).json(service);
  } catch (error) {
    res.status(400).json({
      message: "Failed to create service",
      error: error.message,
    });
  }
};

const getServices = async (req, res) => {
  try {
    const services = await Service.find();

    res.status(200).json(services);
  } catch (error) {
    res.status(500).json({
      message: "Failed to get services",
      error: error.message,
    });
  }
};
const getServiceById = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({
        message: "Service not found",
      });
    }
    res.status(200).json(service);
  } catch (error) {
    res.status(500).json({
      message: "Failed to get service ",
      error: error.message,
    });
  }
};

module.exports = {
  createService,
};
