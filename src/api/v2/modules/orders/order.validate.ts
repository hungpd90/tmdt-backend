import { Joi } from 'express-validation';

export const adminCreateOrderBody = {
  body: Joi.object({
    user_id: Joi.number().required(),
    address: Joi.string().required(),
    email: Joi.string().required(),
    phone_number: Joi.string().required(),
    payment_method_id: Joi.number().required(),
    order: Joi.array().items(
      Joi.object({ variant_id: Joi.string().optional(), quantity: Joi.number().optional() }).optional()
    ),
    status: Joi.string().valid('Preparing order', 'Awaiting pickup', 'Picking up', 'Order picked up', 'Delivering', 'Delivered successfully', 'Delivery failed'),
    customer_name: Joi.string().required()
  }),
};

export const userCreateOrderBody = {
  body: Joi.object({
    vnp_ResponseCode: Joi.string().optional(),
    address: Joi.string().required(),
    email: Joi.string().required(),
    phone_number: Joi.string().required(),
    order: Joi.array().items(
      Joi.object({ variant_id: Joi.string().optional(), quantity: Joi.number().optional() }).optional()
    ),
    payment_method_id: Joi.number().required(),
  }),
};

export const orderPayBody = {
  body: Joi.object({
    total_order_amount: Joi.string().required(),
    price: Joi.number().required(),
  }),
};

export const changeOrderStatus = {
  body: Joi.object({
    status: Joi.string().valid('Preparing order', 'Awaiting pickup', 'Picking up', 'Order picked up', 'Delivering', 'Delivered successfully', 'Delivery failed').required()
  })
}

export const assignToShipper = {
  body: Joi.object({
    shipper_id: Joi.number().required()
  })
}
