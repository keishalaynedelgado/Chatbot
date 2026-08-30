const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { User } = require('../models');

// Mock login for testing (will be replaced with Keycloak later)
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // For development, allow login with specific users
    // In production, this would validate against Keycloak
    const user = await User.findOne({
      where: { username },
      include: ['tenant']
    });
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // For demo purposes, accept any password if user exists
    // In production, use bcrypt to check password
    
    const token = jwt.sign(
      { 
        id: user.id,
        username: user.username,
        role: user.role,
        tenantId: user.tenantId
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
    
    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          tenant: user.tenant
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during login'
    });
  }
});

// Keycloak callback (to be implemented)
router.post('/keycloak-callback', (req, res) => {
  // This will handle Keycloak authentication callback
  res.json({ message: 'Keycloak callback received' });
});

module.exports = router;