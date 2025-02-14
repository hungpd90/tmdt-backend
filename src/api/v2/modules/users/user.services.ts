import User, { IUser } from '@src/configs/database/models/user.model';
import Address, { IAddress } from '@src/configs/database/models/address.model';
import { ModelStatic, Op } from 'sequelize';
import { Request as JWTRequest } from 'express-jwt';
import { IQuery } from '../products/product.interface';
import { HttpException } from '../../utils/http-exception';
import { bcryptHashPassword, objectId } from '../../utils/functions';
import { JwtPayload } from 'jsonwebtoken';
import UserCount, { IUserCount } from '@src/configs/database/models/user_count.model';
import Order, { IOrder } from '@src/configs/database/models/order.model';

class UserService {
  private readonly userModel: ModelStatic<IUser>;
  private readonly addressModel: ModelStatic<IAddress>;
  private readonly userCountModel: ModelStatic<IUserCount>;
  private readonly orderModel: ModelStatic<IOrder>;
  constructor() {
    this.userModel = User;
    this.addressModel = Address;
    this.userCountModel = UserCount;
    this.orderModel = Order;
  }

  getUsers = async (req: JWTRequest) => {
    try {
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 10;
      const sort = req.query.sort || 'DESC';
      const orderBy: string = (req.query.orderBy as string) || 'createdAt';

      const query: IQuery = {
        where: { deleted: false },
        order: [[`${orderBy}`, `${(sort as string).toUpperCase()}`]],
      };

      query.offset = (page - 1) * limit;
      query.limit = limit;

      console.log('query: ', query);

      const users = await this.userModel.findAndCountAll(query);

      if (!users) {
        throw new HttpException('Product not found', 404);
      }
      return users;
    } catch (error) {
      console.log(error);
      throw error;
    }
  };

  getUser = async (req: JWTRequest) => {
    try {
      const user_id = req.params.id;
      const user = await this.userModel.findByPk(user_id);

      if (!user || user.deleted === true) {
        throw new HttpException('User not found', 404);
      }

      return user;
    } catch (error) {
      console.log(error);
      throw error;
    }
  };

  updateUserForAdmin = async (req: JWTRequest) => {
    try {
      const user_id = req.params.id;
      const user = await this.userModel.findByPk(user_id);

      if (!user) {
        throw new HttpException('User not found', 404);
      }

      await user.update(req.body);
      return user;
    } catch (error) {
      console.log(error);
      throw error;
    }
  };

  deleteUser = async (req: JWTRequest) => {
    try {
      const user_id = req.params.id;

      const user = await this.userModel.findByPk(user_id);

      if (!user) {
        throw new HttpException('User not found', 404);
      }

      await user.update({
        deleted: true,
      });

      // await this.userModel.destroy({ where: { id: user_id } });
    } catch (error) {
      console.log(error);
      throw error;
    }
  };

  createUser = async (req: JWTRequest) => {
    try {
      const { phone_number, email, password } = req.body;

      const user_existed = await this.userModel.findOne({
        where: { [Op.or]: [{ phone_number }, { email }] },
      });

      const n_users = (await this.userModel.findAndCountAll()).count;

      if (user_existed) {
        throw new HttpException('Email or Phone number has been already taken', 400);
      }

      const hashPassword: string = await bcryptHashPassword(<string>password);

      const user = await this.userModel.create({
        ...req.body,
        password: hashPassword,
        id: n_users,
      });

      if (!user) {
        throw new HttpException('Cannot create user', 409);
      }

      return user;
    } catch (error) {
      console.log(error);
      throw error;
    }
  };

  createAddress = async (req: JWTRequest) => {
    try {
      const { user_id } = (<JwtPayload>req.auth).data;
      const user = await this.userModel.findByPk(user_id);
      if (!user) {
        throw new HttpException('User not found', 404);
      }
      const address = await this.addressModel.create({
        user_id: user.id,
        ...req.body
      })
      return address;
    } catch (error) {
      throw error;
    }
  }

  retrieveAddresses = async (req: JWTRequest) => {
    try {
      const { user_id } = (<JwtPayload>req.auth).data;
      const user = await this.userModel.findByPk(user_id);
      if (!user) {
        throw new HttpException('User not found', 404);
      }
      const addresses = await this.addressModel.findAll({
        where: {
          user_id: user.id
        }
      })
      return addresses;
    } catch (error) {
      throw error;
    }
  }

  retrieveAddress = async (req: JWTRequest) => {
    try {
      const { user_id } = (<JwtPayload>req.auth).data;
      const user = await this.userModel.findByPk(user_id);
      if (!user) {
        throw new HttpException('User not found', 404);
      }
      const { address_id } = req.params;
      if (!address_id) {
        throw new HttpException('address_id not found', 404);
      }
      const address = await this.addressModel.findOne({
        where: {
          user_id: user.id,
          id: address_id
        }
      })
      if (!address) {
        throw new HttpException('Address not found', 404);
      }
      return address;
    } catch (error) {
      throw error;
    }
  }

  addUserAddress = async (req: JWTRequest) => {
    try {
      const { user_id } = (<JwtPayload>req.auth).data;
      const user = await this.userModel.findByPk(user_id);
      if (!user) {
        throw new HttpException('User not found', 404);
      }
      const address = await this.addressModel.create({
        user_id: user.id,
        ...req.body
      });
      if (!address) {
        throw new HttpException('Cannot create address', 401);
      }
      return address;
    } catch (error) {
      throw error;
    }
  }

  updateAddress = async (req: JWTRequest) => {
    try {
      const { user_id } = (<JwtPayload>req.auth).data;
      const user = await this.userModel.findByPk(user_id);
      if (!user) {
        throw new HttpException('User not found', 404);
      }
      const { address_id } = req.params;
      const address = await this.addressModel.findOne({
        where: {
          user_id: user.id,
          id: address_id
        }
      })
      if (!address) {
        throw new HttpException('Address not found', 404);
      }
      await address.update({
        ...req.body
      })
      await address.save();
      return address;
    }
    catch (error) {
      throw error;
    }
  }

  deleteAddress = async (req: JWTRequest) => {
    try {
      const { user_id } = (<JwtPayload>req.auth).data;
      const user = await this.userModel.findByPk(user_id);
      if (!user) {
        throw new HttpException('User not found', 404);
      }
      const { address_id } = req.params;
      const result = await this.addressModel.destroy({
        where: {
          user_id: user.id,
          id: address_id
        }
      })
      return result;
    } catch (error) {
      throw error;
    }
  }

  retrieveSelfUser = async (req: JWTRequest) => {
    try {
      const { user_id } = (<JwtPayload>req.auth).data;
      const user = await this.userModel.findByPk(user_id);
      if (!user) {
        throw new HttpException('User not found', 404);
      }
      return user;
    } catch (error) {
      throw error;
    }
  }

  createGuest = async (req: JWTRequest) => {
    try {
      const n_users = (await this.userModel.findAndCountAll()).count;

      const guest = await this.userModel.create({
        session_id: objectId(),
        is_guest: true,
        id: n_users
      });

      return guest;
    } catch (error) {
      throw error;
    }
  }

  updateUser = async (req: JWTRequest) => {
    try {
      const { user_id } = (<JwtPayload>req.auth).data;
      const { password } = req.body
      const user = await this.userModel.findByPk(user_id);
      if (!user) {
        throw new HttpException('User not found', 404);
      }
      const hashPassword: string = await bcryptHashPassword(<string>password);
      await user.update({
        ...req.body,
        password: hashPassword
      });
      await user.save();
    } catch (error) {
      throw error;
    }
  }

  getOrders = async (req: JWTRequest) => {
    try {
      const { user_id } = (<JwtPayload>req.auth).data;
      const user = await this.userModel.findByPk(user_id);
      if (!user) {
        throw new HttpException('User not found', 404);
      }

      console.log({ user_id })

      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 10;
      const sort = req.query.sort || 'DESC';
      const orderBy: string = (req.query.orderBy as string) || 'createdAt';

      const query: IQuery = {
        where: {
          user_id: user.id
        },
        order: [[`${orderBy}`, `${(sort as string).toUpperCase()}`]],
      };

      query.offset = (page - 1) * limit;
      query.limit = limit;

      const orders = await this.orderModel.findAndCountAll(query);
      console.log(orders)

      return orders
    } catch (error) {
      throw error;
    }

  }
  getOrdersNoPaginate = async (req: JWTRequest) => {
    try {
      const { user_id } = (<JwtPayload>req.auth).data;
      const user = await this.userModel.findByPk(user_id);
      if (!user) {
        throw new HttpException('User not found', 404);
      }
  
      const orders = await this.orderModel.findAll({
        where: { user_id: user.id }
      });
  
      return orders
    } catch (error) {
      throw error;
    }
  }
}

export default UserService;
