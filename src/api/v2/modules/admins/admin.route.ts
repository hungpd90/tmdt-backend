import { Router } from 'express';
import { schema, validate } from 'express-validation';
import AdminController from './admin.controller';
import AdminService from './admin.services';
import { createAdminBody, signInBody } from './admin.validate';
import { adminRoleCheck } from '../../middlewares/adminrolecheck.middleware';
import { auth } from '../../middlewares/auth.middleware';

const adminService = new AdminService();
const adminController = new AdminController(adminService);

const AdminRoute = Router();

AdminRoute.post('/', validate(createAdminBody as schema), adminController.createAdmin);
AdminRoute.get('/', auth, adminRoleCheck(['superadmin', 'staff', 'shipper']), adminController.getAdmins);
AdminRoute.post('/login', validate(signInBody as schema), adminController.signIn);

// Shipper 
AdminRoute.get('/shippers/get-shipping-orders', auth, adminRoleCheck(['shipper']), adminController.getOrdersForShipper)
AdminRoute.get('/shippers/get-total-shipping-amount', auth, adminRoleCheck(['shipper']), adminController.getTotalShippingAmount);

export default AdminRoute;
