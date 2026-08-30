const { Task, User, Tenant } = require('../models');
const { Op } = require('sequelize');

exports.getAllTasks = async (req, res) => {
  try {
    const { 
      tenantId, 
      status, 
      priority, 
      assignedTo,
      search,
      page = 1, 
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;
    
    const where = {};
    
    if (tenantId) where.tenantId = tenantId;
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (assignedTo) where.assignedTo = assignedTo;
    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    const offset = (page - 1) * limit;
    const { count, rows } = await Task.findAndCountAll({
      where,
      include: [
        { model: User, as: 'assignee', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: User, as: 'creator', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: Tenant, as: 'tenant', attributes: ['id', 'name'] }
      ],
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching tasks'
    });
  }
};

exports.getTaskById = async (req, res) => {
  try {
    const { id } = req.params;
    const task = await Task.findByPk(id, {
      include: [
        { model: User, as: 'assignee', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: User, as: 'creator', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: Tenant, as: 'tenant', attributes: ['id', 'name'] }
      ]
    });
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }
    
    res.json({
      success: true,
      data: task
    });
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching task'
    });
  }
};

exports.createTask = async (req, res) => {
  try {
    const { title, description, status, priority, dueDate, assignedTo, tags } = req.body;
    const createdBy = req.user.id;
    const tenantId = req.user.tenantId;
    
    // Check if assigned user exists and belongs to same tenant
    if (assignedTo) {
      const user = await User.findByPk(assignedTo);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Assigned user not found'
        });
      }
      if (user.tenantId !== tenantId && req.user.role !== 'super_admin') {
        return res.status(403).json({
          success: false,
          message: 'Cannot assign task to user from different tenant'
        });
      }
    }
    
    const task = await Task.create({
      title,
      description,
      status,
      priority,
      dueDate,
      assignedTo,
      createdBy,
      tenantId,
      tags: tags || []
    });
    
    const createdTask = await Task.findByPk(task.id, {
      include: [
        { model: User, as: 'assignee', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: User, as: 'creator', attributes: ['id', 'firstName', 'lastName', 'email'] }
      ]
    });
    
    res.status(201).json({
      success: true,
      data: createdTask,
      message: 'Task created successfully'
    });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating task'
    });
  }
};

exports.updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const task = await Task.findByPk(id);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }
    
    // Check permissions
    if (req.user.role === 'staff' && task.assignedTo !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only update tasks assigned to you'
      });
    }
    
    if (req.user.role === 'admin' && task.tenantId !== req.user.tenantId) {
      return res.status(403).json({
        success: false,
        message: 'You can only update tasks in your tenant'
      });
    }
    
    // If task is being completed
    if (req.body.status === 'completed' && task.status !== 'completed') {
      req.body.completedAt = new Date();
    }
    
    await task.update(req.body);
    
    const updatedTask = await Task.findByPk(id, {
      include: [
        { model: User, as: 'assignee', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: User, as: 'creator', attributes: ['id', 'firstName', 'lastName', 'email'] }
      ]
    });
    
    res.json({
      success: true,
      data: updatedTask,
      message: 'Task updated successfully'
    });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating task'
    });
  }
};

exports.deleteTask = async (req, res) => {
  try {
    const { id } = req.params;
    const task = await Task.findByPk(id);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }
    
    // Check permissions
    if (req.user.role === 'admin' && task.tenantId !== req.user.tenantId) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete tasks in your tenant'
      });
    }
    
    await task.destroy();
    
    res.json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting task'
    });
  }
};

exports.getMyTasks = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const where = { assignedTo: req.user.id };
    
    if (status) where.status = status;
    
    const offset = (page - 1) * limit;
    const { count, rows } = await Task.findAndCountAll({
      where,
      include: [
        { model: User, as: 'creator', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: Tenant, as: 'tenant', attributes: ['id', 'name'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching my tasks:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching your tasks'
    });
  }
};