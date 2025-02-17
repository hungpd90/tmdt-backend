import Feedback, { IFeedback } from '@src/configs/database/models/feedback.model';
import User, { IUser } from '@src/configs/database/models/user.model';
import Product, { IProduct } from '@src/configs/database/models/product.model';
// eslint-disable-next-line import/no-extraneous-dependencies
import nj from 'numjs';
import { ModelStatic } from 'sequelize';
// eslint-disable-next-line import/no-extraneous-dependencies
import Matrix from './matrix';
import { IQuery } from '../modules/products/product.interface';
import { HttpException } from './http-exception';
import { cosine_similarity } from './functions';

class CF {
  private readonly feedbackModel: ModelStatic<IFeedback>;
  private readonly userModel: ModelStatic<IUser>;
  private readonly productModel: ModelStatic<IProduct>;
  private readonly user_id: number;
  private k = 2;
  private n_users: number;
  private n_products: number;

  constructor(n_users: number, n_products: number, user_id: number, k = 2) {
    this.feedbackModel = Feedback;
    this.userModel = User;
    this.productModel = Product;
    this.n_users = n_users;
    this.n_products = n_products;
    this.user_id = user_id;
    this.k = k;
  }

  // Create Matrix And Load Data Into Matrix
  loadYData = async (): Promise<Matrix> => {
    try {
      const feedbacks = await this.feedbackModel.findAll();
      if (!feedbacks) {
        throw new HttpException('Cannot get feedbacks for CF', 409);
      }

      const user_query: IQuery = {
        order: [['id', 'ASC']],
      };

      const users = await this.userModel.findAll(user_query);
      if (!users) {
        throw new HttpException('Cannot get users for CF', 409);
      }

      console.log('Number Of Users: ', this.n_users);
      console.log('Number Of Products: ', this.n_products);

      //  Create Matrix
      const Y_data = new Matrix(this.n_products, this.n_users);

      // Print Matrix AFter Creating
      console.log("Print Matrix After Creating");
      Y_data.print();
      // -------------END PRINTING----------------

      // Load Matrix Data
      for (let i = 0; i < this.n_users; i += 1) {
        for (let j = 0; j < feedbacks.length; j += 1) {
          if (feedbacks[j].user_id === users[i].id) {
            Y_data.setData(feedbacks[j].product_id, users[i].id, feedbacks[j].rate);
          }
        }
      }

      // Print Matrix After Filling Data
      console.log("Print Matrix After FILLING");
      Y_data.print();
      // -------------END PRINTING----------------

      return Y_data;
    } catch (err) {
      console.log(err);
      throw err;
    }
  };

  predict = (Y_data: Matrix, Y_bar_data: Matrix, product_id: number) => {
    // Find Users Who Have Rated The Product
    const users_ids_who_rate_product = Y_data.getUsersWhoRateProduct(this.user_id, product_id);

    // Print Users Who Have Rated The Product
    console.log(`Users Who Have Rated The Product ${product_id}`, users_ids_who_rate_product);
    // -------------END PRINTING----------------

    // Calculate Similarity Vector Filled With -1 With The Users Who Have Rated The Product
    const similarity_vector: number[][] = nj
      .zeros([users_ids_who_rate_product.length, 2])
      .subtract(nj.ones([users_ids_who_rate_product.length, 2]))
      .tolist();

    // Print Similarity Vector
    // console.log("Similarity Vector With These Users: ", similarity_vector);
    // -------------END PRINTING----------------

    // Calculate Similarity Vector With The Users Who Have Rated The Products
    // Similarity Vector Has Form: [ [UserId, SimilarityScore], [UserId, SimilarityScore], [UserId, SimilarityScore], .... ]
    // users_ids_who_rate_product.forEach((user) => {
    //   similarity_vector[user] = [
    //     user,
    //     cosine_similarity(Y_bar_data.getColumn(this.user_id).tolist(), Y_bar_data.getColumn(user).tolist()),
    //   ];

    //   console.log("similarity_vector[user]: " + similarity_vector[user])
    // });

    for (let index = 0; index < users_ids_who_rate_product.length; index++) {
      const user = users_ids_who_rate_product[index];
      similarity_vector[index] = [
        user,
        cosine_similarity(Y_bar_data.getColumn(this.user_id).tolist(), Y_bar_data.getColumn(user).tolist()),
      ]
      
    }

    // Sort The Similarity Vector In Descending Order
    similarity_vector.sort((a, b) => {
      return b[1] - a[1];
    });

    // Print The Sorted Similarity Vector
    console.log('Sorted Similarity Vector', similarity_vector, ' Of: ', product_id);
    // -------------END PRINTING----------------

    // Predict Value
    const k_reserved = this.k;
    if (this.k > similarity_vector.length) {
      this.k = similarity_vector.length;
    }

    let predict_value = 0;
    let similarity_total = 0;

    // Calculate Mean User Vector
    const m_users = Y_data.getMeanUsers().tolist();

    // Print Mean User Vector
    console.log('Mean User Vector: ', m_users);
    // -------------END PRINTING----------------

    // console.log('s_v length: ', similarity_vector.length, similarity_vector);
    // console.log('k: ', this.k);
    // Calculate Predict Value
    for (let i = 0; i < this.k; i += 1) {
      const user_normalize_rate = Y_bar_data.getColumn(similarity_vector[i][0]).tolist()[product_id];
      predict_value += user_normalize_rate * similarity_vector[i][1];
      // console.log(`user_normalize_rate: `, user_normalize_rate);
      // console.log(`similarity_vector[${i}][1]: `, similarity_vector[i][1]);
      // console.log(`Math.abs(similarity_vector[${i}][1])`, Math.abs(similarity_vector[i][1]));
      similarity_total += Math.abs(similarity_vector[i][1]);
    }

    this.k = k_reserved;

    // Print Predict Score
    console.log('Predict Score: ', predict_value / (similarity_total + 1e-10));
    console.log('---------------------------------------------------------------------');
    // -------------END PRINTING----------------

    // console.log(predict_value / (similarity_total + 1e-10));
    return predict_value / (similarity_total + 1e-10);
  };

  runCF = async () => {
    // Create Utility Matrix
    const Y_data = await this.loadYData();

    // Create Utility Bar (Utility Matrix After Subtract Mean User)
    const Y_bar_data = Y_data.getYbar();

    // Print Utility Bar Matrix
    console.log("Utility Matrix After Normalize: ")
    Y_bar_data.print();
    // -------------END PRINTING----------------

    // console.log(Y_bar_data.getColumn(1).tolist());
    // console.log(Y_bar_data.getColumn(2).tolist());
    // const distant = cosine_similarity(Y_bar_data.getColumn(0).tolist(), Y_bar_data.getColumn(2).tolist());

    // console.log(distant);
    // console.log(Y_data.getUsersWhoRateProduct(this.user_id, 1));

    // Print Products That Have Not Been Rated
    console.log('Products That Have Not Been Rated: ', Y_data.getProductsNotRateYet(this.user_id));
    // -------------END PRINTING----------------

    // const predict_product = nj.zeros(this.n_products);

    const products_not_rated_yet_ids = Y_data.getProductsNotRateYet(this.user_id);
    const suggest_products: number[][] = [];
    products_not_rated_yet_ids.forEach((product_id) => {
      // console.log(this.predict(Y_data, Y_bar_data, product_id));
      suggest_products.push([product_id, this.predict(Y_data, Y_bar_data, product_id)]);
    });

    // Print All Predict Scores Of User
    // console.log("All Predict Scores Of User: " + suggest_products);
    // -------------END PRINTING----------------

    return suggest_products;
  };
}

// eslint-disable-next-line class-methods-use-this

export default CF;
