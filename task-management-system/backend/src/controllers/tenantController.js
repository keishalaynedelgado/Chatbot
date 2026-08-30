const { Tenant } = require('../models');

exports.getAllTenants = async (req, res) => {
  try {
    const tenants = await Tenant.findAll({
      order: [['createdAt', 'DESC']]
    });
    
    res.json({
      success: true,
      data: tenants
    });
  } catch (error) {
    console.error('Error fetching tenants:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching tenants'
    });
  }
};

exports.getTenantById = async (req, res) => {
  try {
    const { id } = req.params;
    const tenant = await Tenant.findByPk(id);
    
    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }
    
    res.json({
      success: true,
      data: tenant
    });
  } catch (error) {
    console.error('Error fetching tenant:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching tenant'
    });
  }
};

exports.createTenant = async (req, res) => {
  try {
    const tenant = await Tenant.create(req.body);
    
    res.status(201).json({
      success: true,
      data: tenant,
      message: 'Tenant created successfully'
    });
  } catch (error) {
    console.error('Error creating tenant:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        success: false,
        message: 'Tenant name already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error creating tenant'
    });
  }
};

exports.updateTenant = async (req, res) => {
  try {
    const { id } = req.params;
    const tenant = await Tenant.findByPk(id);
    
    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }
    
    await tenant.update(req.body);
    
    res.json({
      success: true,
      data: tenant,
      message: 'Tenant updated successfully'
    });
  } catch (error) {
    console.error('Error updating tenant:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating tenant'
    });
  }
};

exports.deleteTenant = async (req, res) => {
  try {
    const { id } = req.params;
    const tenant = await Tenant.findByPk(id);
    
    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }
    
    await tenant.destroy();
    
    res.json({
      success: true,
      message: 'Tenant deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting tenant:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting tenant'
    });
  }
};