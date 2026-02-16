const Joi = require('joi');

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  fcmToken: Joi.string().optional()
});

const registerSchema = Joi.object({
  name: Joi.string().min(2).max(255).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).required(),
  password: Joi.string().min(6).required(),
  language: Joi.string().valid('ar', 'en').optional()
});

function validateLoginInput(data) {
  return loginSchema.validate(data);
}

function validateRegisterInput(data) {
  return registerSchema.validate(data);
}

module.exports = {
  validateLoginInput,
  validateRegisterInput
};
