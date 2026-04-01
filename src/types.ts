/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum Category {
  FOOD = "Alimentação & Bebidas",
  FASHION = "Moda & Vestuário",
  TECH = "Tecnologia & Electrónica",
  HOME = "Casa & Decoração",
  BEAUTY = "Beleza & Cuidados Pessoais",
  AUTO = "Automóvel & Acessórios",
  BOOKS = "Livros & Material Escolar",
  AGRICULTURE = "Agricultura & Campo",
  TOYS = "Brinquedos & Infantil",
  TOOLS = "Ferramentas & Construção",
}

export enum Province {
  LUANDA = "Luanda",
  BENGUELA = "Benguela",
  HUAMBO = "Huambo",
  HUILA = "Huíla",
  CABINDA = "Cabinda",
  NAMIBE = "Namibe",
  MALANJE = "Malanje",
  UIGE = "Uíge",
  ZAIRE = "Zaire",
  BIE = "Bié",
  MOXICO = "Moxico",
  CUANDO_CUBANGO = "Cuando Cubango",
  CUNENE = "Cunene",
  LUNDA_NORTE = "Lunda Norte",
  LUNDA_SUL = "Lunda Sul",
  BENGO = "Bengo",
  CUANZA_NORTE = "Cuanza Norte",
  CUANZA_SUL = "Cuanza Sul",
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: Category;
  province: Province;
  municipality: string;
  sellerId: string;
  sellerName: string;
  images: string[];
  stock: number;
  isVerified: boolean;
  createdAt: number;
  rating?: number;
  reviewCount?: number;
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: "buyer" | "seller" | "admin";
  shopName?: string;
  shopLogo?: string;
  province?: Province;
  isVerified: boolean;
  rating?: number;
  reviewCount?: number;
  responseTime?: string;
  totalSales?: number;
  joinedAt?: number;
  description?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Order {
  id: string;
  buyerId: string;
  items: CartItem[];
  totalAmount: number;
  commissionAmount: number; // 10% fee
  sellerPayouts: {
    sellerId: string;
    amount: number;
  }[];
  status: "pending" | "paid" | "shipped" | "delivered";
  paymentDetails?: {
    referenceNumber: string;
    entityCode: string;
    iban: string;
    bankName: string;
    beneficiary: string;
    mcxPhone?: string;
    mbwayPhone?: string;
  };
  createdAt: number;
}
