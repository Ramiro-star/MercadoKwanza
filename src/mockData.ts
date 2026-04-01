/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Category, Province, Product, User, Review, Order } from "./types";

export const MOCK_USERS: User[] = [
  {
    id: "seller1",
    name: "João Silva",
    email: "joao@example.com",
    role: "seller",
    shopName: "Silva Tech",
    shopLogo: "https://picsum.photos/seed/tech/100/100",
    province: Province.LUANDA,
    isVerified: true,
    rating: 4.8,
    reviewCount: 124,
    responseTime: "15 min",
    totalSales: 450,
    joinedAt: Date.now() - 31536000000, // 1 year ago
    description: "Especialistas em tecnologia e electrónica de alta qualidade em Luanda. Oferecemos os melhores preços e suporte técnico especializado.",
  },
  {
    id: "seller2",
    name: "Maria Santos",
    email: "maria@example.com",
    role: "seller",
    shopName: "Moda Angola",
    shopLogo: "https://picsum.photos/seed/fashion/100/100",
    province: Province.BENGUELA,
    isVerified: false,
    rating: 4.2,
    reviewCount: 56,
    responseTime: "2 horas",
    totalSales: 120,
    joinedAt: Date.now() - 15768000000, // 6 months ago
    description: "A melhor moda tradicional e contemporânea de Angola. Peças exclusivas feitas com carinho e qualidade superior.",
  },
];

export const MOCK_REVIEWS: Review[] = [
  {
    id: "r1",
    productId: "p1",
    userId: "u1",
    userName: "Carlos Manuel",
    rating: 5,
    comment: "Excelente telemóvel, chegou rápido e em perfeitas condições.",
    createdAt: Date.now() - 86400000,
  },
  {
    id: "r2",
    productId: "p1",
    userId: "u2",
    userName: "Ana Paula",
    rating: 4,
    comment: "Muito bom, mas a bateria poderia durar um pouco mais.",
    createdAt: Date.now() - 172800000,
  },
  {
    id: "r3",
    productId: "p2",
    userId: "u3",
    userName: "Beatriz Silva",
    rating: 5,
    comment: "O vestido é lindo e o tecido é de muita qualidade. Recomendo!",
    createdAt: Date.now() - 259200000,
  }
];

export const MOCK_PRODUCTS: Product[] = [
  {
    id: "p1",
    name: "iPhone 13 Pro Max",
    description: "iPhone 13 Pro Max em excelente estado, 256GB, cor grafite.",
    price: 450000,
    category: Category.TECH,
    province: Province.LUANDA,
    municipality: "Belas",
    sellerId: "seller1",
    sellerName: "Silva Tech",
    images: ["https://picsum.photos/seed/iphone/400/400"],
    stock: 2,
    isVerified: true,
    createdAt: Date.now(),
    rating: 4.5,
    reviewCount: 2,
  },
  {
    id: "p2",
    name: "Vestido Tradicional Samakaka",
    description: "Vestido feito à mão com tecido Samakaka genuíno.",
    price: 25000,
    category: Category.FASHION,
    province: Province.BENGUELA,
    municipality: "Lobito",
    sellerId: "seller2",
    sellerName: "Moda Angola",
    images: ["https://picsum.photos/seed/dress/400/400"],
    stock: 5,
    isVerified: false,
    createdAt: Date.now() - 86400000,
    rating: 5.0,
    reviewCount: 1,
  },
  {
    id: "p3",
    name: "Arroz Tio Victor 5kg",
    description: "Arroz de alta qualidade, saco de 5kg.",
    price: 4500,
    category: Category.FOOD,
    province: Province.LUANDA,
    municipality: "Viana",
    sellerId: "seller1",
    sellerName: "Silva Tech",
    images: ["https://picsum.photos/seed/rice/400/400"],
    stock: 50,
    isVerified: true,
    createdAt: Date.now() - 172800000,
    rating: 4.2,
    reviewCount: 15,
  },
  {
    id: "p4",
    name: "Sofá Moderno 3 Lugares",
    description: "Sofá confortável e elegante para a sua sala.",
    price: 120000,
    category: Category.HOME,
    province: Province.HUAMBO,
    municipality: "Huambo",
    sellerId: "seller2",
    sellerName: "Moda Angola",
    images: ["https://picsum.photos/seed/sofa/400/400"],
    stock: 1,
    isVerified: false,
    createdAt: Date.now() - 259200000,
    rating: 3.8,
    reviewCount: 4,
  },
  ...Array.from({ length: 15 }, (_, i) => ({
    id: `extra-${i}`,
    name: `Produto Extra ${i + 1}`,
    description: `Descrição detalhada do produto extra ${i + 1} para teste de paginação.`,
    price: 1000 + i * 50000,
    category: Category.TECH,
    province: Province.LUANDA,
    municipality: "Luanda",
    sellerId: "seller1",
    sellerName: "Silva Tech",
    images: [`https://picsum.photos/seed/extra-${i}/400/400`],
    stock: 10,
    isVerified: true,
    createdAt: Date.now(),
    rating: 4.0 + (i % 2 === 0 ? 0.5 : -0.5),
    reviewCount: 5 + i,
  })),
];

export const MOCK_ORDERS: Order[] = [
  {
    id: "order-1",
    buyerId: "current-user",
    items: [
      { product: MOCK_PRODUCTS[0], quantity: 1 },
      { product: MOCK_PRODUCTS[2], quantity: 2 }
    ],
    totalAmount: 459000 + 45900,
    commissionAmount: 45900,
    sellerPayouts: [
      { sellerId: "seller1", amount: (450000 + 9000) * 0.9 }
    ],
    status: "delivered",
    paymentDetails: {
      referenceNumber: "123456789",
      entityCode: "00123",
      iban: "AO06 0000 0000 0000 0000 0000 0",
      bankName: "BAI",
      beneficiary: "MercadoKwanza Lda"
    },
    createdAt: Date.now() - 604800000
  },
  {
    id: "order-2",
    buyerId: "current-user",
    items: [
      { product: MOCK_PRODUCTS[1], quantity: 1 }
    ],
    totalAmount: 25000 + 2500,
    commissionAmount: 2500,
    sellerPayouts: [
      { sellerId: "seller2", amount: 25000 * 0.9 }
    ],
    status: "shipped",
    paymentDetails: {
      referenceNumber: "987654321",
      entityCode: "00123",
      iban: "AO06 0000 0000 0000 0000 0000 0",
      bankName: "BAI",
      beneficiary: "MercadoKwanza Lda"
    },
    createdAt: Date.now() - 259200000
  }
];
