/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from "react";
import { useState, useMemo, useEffect, useRef } from "react";
import { Search, ShoppingCart, MessageCircle, User, Store, Plus, Filter, MapPin, CheckCircle2, Send, X, Bot, Copy, Check, CreditCard, Landmark, Upload, FileText, ImagePlus, Trash2, Smartphone, Star, Clock, ShoppingBag, Calendar, Eye, Truck, Package, ChevronRight, ChevronDown, Sparkles, HelpCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { Category, Province, Product, User as AppUser, CartItem, Order, Review } from "./types";
import { MOCK_PRODUCTS, MOCK_USERS, MOCK_REVIEWS, MOCK_ORDERS } from "./mockData";
import { chatWithGemini } from "./services/geminiService";
import { generateReferenceNumber, formatReference, generateMockIBAN } from "./services/paymentService";

export default function App() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedProvince, setSelectedProvince] = useState<string>("all");
  const [selectedSeller, setSelectedSeller] = useState<string>("all");
  const [showOnlyNew, setShowOnlyNew] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000000]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "model"; parts: { text: string }[] }[]>([]);
  const [userInput, setUserInput] = useState("");
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [isSellerTyping, setIsSellerTyping] = useState(false);
  const sellerChatEndRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 12;

  const [helpTopic, setHelpTopic] = useState<string | null>(null);

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [orders, setOrders] = useState<Order[]>(MOCK_ORDERS);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isOrdersDialogOpen, setIsOrdersDialogOpen] = useState(false);
  const [isOrderDetailsOpen, setIsOrderDetailsOpen] = useState(false);
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState<Order | null>(null);
  const [isSellDialogOpen, setIsSellDialogOpen] = useState(false);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [isAddProductDialogOpen, setIsAddProductDialogOpen] = useState(false);
  const [isSellerChatOpen, setIsSellerChatOpen] = useState(false);
  const [isSellerProfileOpen, setIsSellerProfileOpen] = useState(false);
  const [selectedSellerForProfile, setSelectedSellerForProfile] = useState<AppUser | null>(null);
  const [reviews, setReviews] = useState<Review[]>(MOCK_REVIEWS);
  const [selectedProductForDetails, setSelectedProductForDetails] = useState<Product | null>(null);
  const [isProductDetailsOpen, setIsProductDetailsOpen] = useState(false);
  const [newReview, setNewReview] = useState({ rating: 5, comment: "" });
  const [storeForm, setStoreForm] = useState({
    name: "",
    contact: "",
    province: "",
    municipality: "",
  });
  const [storeErrors, setStoreErrors] = useState<Record<string, string>>({});
  const [selectedProductForChat, setSelectedProductForChat] = useState<Product | null>(null);
  const [sellerChatMessages, setSellerChatMessages] = useState<Record<string, { role: "user" | "model"; text: string; timestamp: number }[]>>({});
  const [sellerChatInput, setSellerChatInput] = useState("");
  const [hasCopied, setHasCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setHasCopied(id);
    setTimeout(() => setHasCopied(null), 2000);
    toast.info("Copiado para a área de transferência");
  };

  const addToCart = (product: Product) => {
    setCartItems((prev) => {
      const existingItem = prev.find((item) => item.product.id === product.id);
      if (existingItem) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    toast.success(`${product.name} adicionado ao carrinho!`);
  };

  const removeFromCart = (productId: string) => {
    setCartItems((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCartItems((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          const newQuantity = Math.max(1, item.quantity + delta);
          return { ...item, quantity: newQuantity };
        }
        return item;
      })
    );
  };

  const openSellerProfile = (sellerId: string) => {
    const seller = MOCK_USERS.find(u => u.id === sellerId);
    if (seller) {
      setSelectedSellerForProfile(seller);
      setIsSellerProfileOpen(true);
    }
  };

  const handleReviewSubmit = (productId: string) => {
    if (!newReview.comment.trim()) {
      toast.error("Por favor, escreva um comentário.");
      return;
    }

    const review: Review = {
      id: `r-${Date.now()}`,
      productId,
      userId: "current-user", // Mock user
      userName: "Tu", // Mock user name
      rating: newReview.rating,
      comment: newReview.comment,
      createdAt: Date.now(),
    };

    setReviews((prev) => [review, ...prev]);
    
    // Update product rating in MOCK_PRODUCTS (in a real app this would be backend)
    const product = MOCK_PRODUCTS.find(p => p.id === productId);
    if (product) {
      const currentCount = product.reviewCount || 0;
      const currentRating = product.rating || 0;
      product.reviewCount = currentCount + 1;
      product.rating = Number(((currentRating * currentCount + newReview.rating) / (currentCount + 1)).toFixed(1));
    }

    setNewReview({ rating: 5, comment: "" });
    toast.success("Avaliação enviada com sucesso!");
  };

  const cartTotal = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  }, [cartItems]);

  const appFee = useMemo(() => cartTotal * 0.1, [cartTotal]);
  const finalTotal = cartTotal + appFee;

  const processCheckout = (items: CartItem[]) => {
    if (items.length === 0) return;
    
    const total = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    const fee = total * 0.1;
    const final = total + fee;

    // Generate unique payment details using paymentService
    const referenceNumber = generateReferenceNumber();
    const entityCode = "00123"; 
    const iban = generateMockIBAN();

    const newOrder: Order = {
      id: `order-${Date.now()}`,
      buyerId: "current-user",
      items: items,
      totalAmount: final,
      commissionAmount: fee,
      sellerPayouts: Object.entries(
        items.reduce((acc, item) => {
          const sellerId = item.product.sellerId;
          const amount = item.product.price * item.quantity * 0.9; // Seller gets 90%
          acc[sellerId] = (acc[sellerId] || 0) + amount;
          return acc;
        }, {} as Record<string, number>)
      ).map(([sellerId, amount]) => ({ sellerId, amount: amount as number })),
      status: "pending",
      paymentDetails: {
        referenceNumber,
        entityCode,
        iban,
        bankName: "Banco Angolano de Investimentos (BAI)",
        beneficiary: "MercadoKwanza Lda",
        mcxPhone: "923 456 789",
        mbwayPhone: "923 456 789",
      },
      createdAt: Date.now(),
    };

    setActiveOrder(newOrder);
    setOrders((prev) => [newOrder, ...prev]);
    setIsPaymentDialogOpen(true);
    toast.success("Pedido iniciado! Por favor, proceda ao pagamento.");
  };

  const handleCheckout = () => {
    processCheckout(cartItems);
    setCartItems([]);
    setIsCartOpen(false);
  };

  const handleBuyNow = (product: Product) => {
    processCheckout([{ product, quantity: 1 }]);
    setIsProductDetailsOpen(false);
  };

  const helpContent: Record<string, { title: string; content: React.ReactNode }> = {
    "Como Comprar": {
      title: "Como Comprar no MercadoKwanza",
      content: (
        <div className="space-y-4 text-sm text-slate-600">
          <p>Comprar no MercadoKwanza é simples e seguro. Siga estes passos:</p>
          <ol className="list-decimal pl-5 space-y-2">
            <li><strong>Pesquise:</strong> Use a barra de busca ou as categorias para encontrar o que precisa.</li>
            <li><strong>Analise:</strong> Verifique as fotos, descrição e o preço em Kwanza.</li>
            <li><strong>Contacte:</strong> Use o chat integrado para falar diretamente com o vendedor.</li>
            <li><strong>Combine:</strong> Acerte os detalhes do pagamento (Multicaixa Express, Transferência) e a entrega.</li>
            <li><strong>Avalie:</strong> Após a compra, deixe a sua avaliação para ajudar outros compradores.</li>
          </ol>
        </div>
      ),
    },
    "Métodos de Pagamento": {
      title: "Métodos de Pagamento em Angola",
      content: (
        <div className="space-y-4 text-sm text-slate-600">
          <p>Suportamos os métodos mais comuns em Angola:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Multicaixa Express:</strong> O método mais rápido e seguro via referência ou número de telemóvel.</li>
            <li><strong>Transferência Bancária (IBAN):</strong> Ideal para valores maiores. Confirme sempre o comprovativo.</li>
            <li><strong>Pagamento na Entrega:</strong> Recomendado para trocas presenciais em locais públicos.</li>
          </ul>
        </div>
      ),
    },
    "Prazos de Entrega": {
      title: "Prazos e Logística",
      content: (
        <div className="space-y-4 text-sm text-slate-600">
          <p>Os prazos dependem do vendedor e da localização:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Mesma Província:</strong> Geralmente entre 24h a 48h.</li>
            <li><strong>Inter-provincial:</strong> Pode levar de 3 a 7 dias úteis dependendo da transportadora.</li>
            <li><strong>Recolha Local:</strong> Imediato após a combinação com o vendedor.</li>
          </ul>
        </div>
      ),
    },
    "Como Vender": {
      title: "Como Vender no MercadoKwanza",
      content: (
        <div className="space-y-4 text-sm text-slate-600">
          <p>Transforme os seus produtos em dinheiro. Veja como começar:</p>
          <ol className="list-decimal pl-5 space-y-2">
            <li><strong>Crie a sua Loja:</strong> Clique em "Vender" e configure o perfil da sua loja.</li>
            <li><strong>Publique:</strong> Adicione fotos reais, uma boa descrição e o preço justo em AOA.</li>
            <li><strong>Gira Pedidos:</strong> Responda rapidamente às mensagens dos interessados no chat.</li>
            <li><strong>Entregue:</strong> Combine a entrega ou recolha com o comprador.</li>
            <li><strong>Cresça:</strong> Consiga boas avaliações para se tornar um "Vendedor Verificado".</li>
          </ol>
        </div>
      ),
    },
    "Comissões e Planos": {
      title: "Planos para Vendedores",
      content: (
        <div className="space-y-4 text-sm text-slate-600">
          <p>Escolha o plano que melhor se adapta ao seu negócio:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Plano Grátis:</strong> Até 10 anúncios ativos. Sem comissões.</li>
            <li><strong>Plano Profissional:</strong> Anúncios ilimitados e destaque na pesquisa.</li>
            <li><strong>Plano Empresa:</strong> Loja personalizada, suporte prioritário e selo de verificação.</li>
          </ul>
        </div>
      ),
    },
    "Dicas para Fotos": {
      title: "Como Tirar Fotos que Vendem",
      content: (
        <div className="space-y-4 text-sm text-slate-600">
          <p>Uma boa foto é meio caminho andado para a venda:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Luz Natural:</strong> Tire fotos durante o dia perto de uma janela.</li>
            <li><strong>Fundo Limpo:</strong> Use um fundo neutro para não distrair do produto.</li>
            <li><strong>Vários Ângulos:</strong> Mostre a frente, os lados e qualquer detalhe importante.</li>
            <li><strong>Realismo:</strong> Não use filtros que alterem as cores reais do produto.</li>
          </ul>
        </div>
      ),
    },
    Segurança: {
      title: "Dicas de Segurança",
      content: (
        <div className="space-y-4 text-sm text-slate-600">
          <p>A sua segurança é a nossa prioridade. Siga estas recomendações:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Locais Públicos:</strong> Para entregas em mãos, escolha sempre locais movimentados e públicos.</li>
            <li><strong>Verifique o Produto:</strong> Examine o item antes de efetuar o pagamento final.</li>
            <li><strong>Pagamentos Seguros:</strong> Prefira Multicaixa Express ou transferências bancárias rastreáveis.</li>
            <li><strong>Desconfie de Ofertas Irreais:</strong> Se o preço for demasiado baixo, tenha cautela extra.</li>
            <li><strong>Denuncie:</strong> Use o sistema de denúncia se encontrar algo suspeito.</li>
          </ul>
        </div>
      ),
    },
    "Proteção do Comprador": {
      title: "Programa de Proteção",
      content: (
        <div className="space-y-4 text-sm text-slate-600">
          <p>Garantimos uma experiência justa para todos:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Mediação de Conflitos:</strong> A nossa equipa ajuda a resolver problemas entre partes.</li>
            <li><strong>Vendedores Verificados:</strong> Identificamos lojas com histórico positivo.</li>
            <li><strong>Retenção de Pagamento:</strong> Opção de pagamento seguro onde o valor só é libertado após confirmação.</li>
          </ul>
        </div>
      ),
    },
    "Devoluções": {
      title: "Política de Devoluções",
      content: (
        <div className="space-y-4 text-sm text-slate-600">
          <p>A satisfação do cliente é fundamental. Veja como funcionam as devoluções:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Prazo:</strong> Tem até 48h após a receção para reportar problemas.</li>
            <li><strong>Condições:</strong> O produto deve estar no estado em que foi entregue.</li>
            <li><strong>Processo:</strong> Contacte o vendedor via chat. Se não houver acordo, solicite mediação do MercadoKwanza.</li>
          </ul>
        </div>
      ),
    },
    "Rastreamento": {
      title: "Como Rastrear a sua Encomenda",
      content: (
        <div className="space-y-4 text-sm text-slate-600">
          <p>Mantenha-se informado sobre o paradeiro das suas compras:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Estado do Pedido:</strong> Verifique no seu perfil o estado (Pendente, Pago, Enviado).</li>
            <li><strong>Guia de Remessa:</strong> Solicite ao vendedor o número da guia se usar transportadoras (ex: DHL, Macon).</li>
            <li><strong>Notificações:</strong> Receberá alertas no chat quando o estado for alterado.</li>
          </ul>
        </div>
      ),
    },
    "Destaques": {
      title: "Aumente as suas Vendas com Destaques",
      content: (
        <div className="space-y-4 text-sm text-slate-600">
          <p>Quer vender mais rápido? Use as nossas ferramentas de promoção:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Topo da Lista:</strong> O seu produto aparece primeiro nos resultados de pesquisa.</li>
            <li><strong>Etiqueta 'Urgente':</strong> Chama a atenção para promoções rápidas.</li>
            <li><strong>Redes Sociais:</strong> Partilhamos os melhores destaques nas nossas páginas oficiais.</li>
          </ul>
        </div>
      ),
    },
    "Privacidade": {
      title: "Privacidade e Proteção de Dados",
      content: (
        <div className="space-y-4 text-sm text-slate-600">
          <p>Levamos a sua privacidade a sério:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Dados Encriptados:</strong> As suas informações pessoais estão seguras.</li>
            <li><strong>Partilha Limitada:</strong> Apenas partilhamos o necessário para concluir a transação.</li>
            <li><strong>Controlo Total:</strong> Pode gerir ou eliminar a sua conta a qualquer momento.</li>
          </ul>
        </div>
      ),
    },
    "Vendedor Verificado": {
      title: "Como ser um Vendedor Verificado",
      content: (
        <div className="space-y-4 text-sm text-slate-600">
          <p>O selo de verificação aumenta a confiança dos compradores:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Identidade:</strong> Envio de cópia do Bilhete de Identidade ou Alvará Comercial.</li>
            <li><strong>Histórico:</strong> Pelo menos 5 vendas concluídas com sucesso.</li>
            <li><strong>Avaliações:</strong> Média superior a 4.5 estrelas.</li>
            <li><strong>Localização:</strong> Confirmação de endereço físico ou armazém.</li>
          </ul>
        </div>
      ),
    },
    "Denunciar Fraude": {
      title: "Denunciar Atividade Suspeita",
      content: (
        <div className="space-y-4 text-sm text-slate-600">
          <p>Ajude-nos a manter a comunidade segura:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Anúncio Falso:</strong> Se o produto não existe ou as fotos são da internet.</li>
            <li><strong>Tentativa de Burla:</strong> Se o vendedor pedir pagamentos fora dos métodos seguros.</li>
            <li><strong>Comportamento Impróprio:</strong> Mensagens ofensivas ou spam no chat.</li>
            <li><strong>Como fazer:</strong> Clique no botão "Denunciar" no anúncio ou envie email para suporte@mercadokwanza.ao.</li>
          </ul>
        </div>
      ),
    },
    "Centro de Ajuda": {
      title: "Centro de Ajuda MercadoKwanza",
      content: (
        <div className="space-y-4 text-sm text-slate-600">
          <p>Encontre respostas rápidas para as suas dúvidas:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>FAQ:</strong> Perguntas frequentes sobre contas e anúncios.</li>
            <li><strong>Tutoriais:</strong> Vídeos curtos de como usar a plataforma.</li>
            <li><strong>Chat de Suporte:</strong> Fale com um assistente humano de Segunda a Sábado (08h-18h).</li>
            <li><strong>WhatsApp:</strong> +244 9XX XXX XXX</li>
          </ul>
        </div>
      ),
    },
    "Termos": {
      title: "Termos e Condições de Uso",
      content: (
        <div className="space-y-4 text-sm text-slate-600">
          <p>Ao usar o MercadoKwanza, você concorda com:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Uso Lícito:</strong> Não publicar itens proibidos por lei em Angola.</li>
            <li><strong>Veracidade:</strong> Fornecer informações reais sobre os produtos.</li>
            <li><strong>Responsabilidade:</strong> O MercadoKwanza é um intermediário; a transação final é entre as partes.</li>
            <li><strong>Taxas:</strong> Aceitação da taxa de serviço de 10% em vendas via carrinho.</li>
          </ul>
        </div>
      ),
    },
    "Cookies": {
      title: "Política de Cookies",
      content: (
        <div className="space-y-4 text-sm text-slate-600">
          <p>Usamos cookies para melhorar a sua experiência:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Essenciais:</strong> Para login e segurança da conta.</li>
            <li><strong>Preferências:</strong> Para lembrar a sua província e filtros favoritos.</li>
            <li><strong>Análise:</strong> Para entender como os angolanos usam a plataforma e melhorar o serviço.</li>
          </ul>
        </div>
      ),
    },
    Categorias: {
      title: "Navegar por Categorias",
      content: (
        <div className="grid grid-cols-2 gap-2">
          {Object.values(Category).map((cat) => (
            <Button
              key={cat}
              variant="outline"
              className="justify-start text-xs h-auto py-2 px-3 border-orange-100 hover:bg-orange-50 hover:text-orange-600"
              onClick={() => {
                setSelectedCategory(cat);
                setHelpTopic(null);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              {cat}
            </Button>
          ))}
        </div>
      ),
    },
  };

  const filteredProducts = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return MOCK_PRODUCTS.filter((product) => {
      const matchesSearch = 
        product.name.toLowerCase().includes(query) ||
        product.description.toLowerCase().includes(query) ||
        product.sellerName.toLowerCase().includes(query) ||
        reviews.some(r => r.productId === product.id && r.comment.toLowerCase().includes(query));
      
      const matchesCategory = selectedCategory === "all" || product.category === selectedCategory;
      const matchesProvince = selectedProvince === "all" || product.province === selectedProvince;
      const matchesSeller = selectedSeller === "all" || product.sellerId === selectedSeller;
      const matchesPrice = product.price >= priceRange[0] && product.price <= priceRange[1];
      const matchesNew = !showOnlyNew || (Date.now() - product.createdAt < 7 * 24 * 60 * 60 * 1000); // Last 7 days
      return matchesSearch && matchesCategory && matchesProvince && matchesSeller && matchesPrice && matchesNew;
    });
  }, [searchQuery, selectedCategory, selectedProvince, selectedSeller, priceRange, reviews, showOnlyNew]);

  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
  
  const currentProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * productsPerPage;
    return filteredProducts.slice(startIndex, startIndex + productsPerPage);
  }, [filteredProducts, currentPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, selectedProvince, selectedSeller, priceRange, showOnlyNew]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToSellerBottom = () => {
    sellerChatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isSellerChatOpen) {
      scrollToSellerBottom();
    }
  }, [sellerChatMessages, isSellerTyping, isSellerChatOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const handleSendMessage = async () => {
    if (!userInput.trim()) return;

    const newUserMessage = { role: "user" as const, parts: [{ text: userInput }] };
    setChatMessages((prev) => [...prev, newUserMessage]);
    setUserInput("");
    setIsLoadingChat(true);

    try {
      const response = await chatWithGemini(userInput, chatMessages);
      setChatMessages((prev) => [...prev, { role: "model" as const, parts: [{ text: response }] }]);
    } catch (error) {
      console.error("Chat error:", error);
      toast.error("Erro ao falar com o assistente.");
    } finally {
      setIsLoadingChat(false);
    }
  };

  const handleSendSellerMessage = () => {
    if (!sellerChatInput.trim() || !selectedProductForChat) return;

    const productId = selectedProductForChat.id;
    const newMessage = {
      role: "user" as const,
      text: sellerChatInput,
      timestamp: Date.now(),
    };

    setSellerChatMessages((prev) => ({
      ...prev,
      [productId]: [...(prev[productId] || []), newMessage],
    }));
    setSellerChatInput("");
    
    // Simulate seller response with typing delay
    const typingDelay = 1000;
    const responseDelay = 3000;

    setTimeout(() => {
      setIsSellerTyping(true);
      
      setTimeout(() => {
        const response = {
          role: "model" as const,
          text: `Olá! Obrigado pelo interesse no ${selectedProductForChat.name}. Como posso ajudar?`,
          timestamp: Date.now(),
        };
        setSellerChatMessages((prev) => ({
          ...prev,
          [productId]: [...(prev[productId] || []), response],
        }));
        setIsSellerTyping(false);
      }, responseDelay - typingDelay);
    }, typingDelay);
  };

  const validateStoreForm = () => {
    const errors: Record<string, string> = {};
    if (!storeForm.name.trim()) errors.name = "O nome da loja é obrigatório";
    if (!storeForm.contact.trim()) errors.contact = "O contacto é obrigatório";
    if (!storeForm.province) errors.province = "A província é obrigatória";
    if (!storeForm.municipality.trim()) errors.municipality = "O município é obrigatório";
    
    const phoneRegex = /^(\+244\s?)?[9][0-9]{8}$/;
    if (storeForm.contact && !phoneRegex.test(storeForm.contact.replace(/\s/g, ''))) {
      errors.contact = "Número de telefone inválido (Ex: 923 456 789)";
    }

    setStoreErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateStore = () => {
    if (validateStoreForm()) {
      setIsSellDialogOpen(false);
      setIsAddProductDialogOpen(true);
      toast.success("Loja criada! Agora adicione o seu primeiro produto.");
      // Reset form
      setStoreForm({ name: "", contact: "", province: "", municipality: "" });
      setStoreErrors({});
    } else {
      toast.error("Por favor, preencha todos os campos obrigatórios correctamente.");
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-AO", {
      style: "currency",
      currency: "AOA",
    }).format(price).replace("AOA", "Kz");
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <Toaster position="top-center" />
      
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/90 backdrop-blur-md">
        <div className="container mx-auto flex h-20 items-center justify-between px-4">
          <div className="flex items-center gap-2 cursor-pointer group" onClick={() => {
            setSelectedCategory("all");
            setSelectedProvince("all");
            setShowOnlyNew(false);
            setSearchQuery("");
          }}>
            <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-orange-700 text-white shadow-lg shadow-orange-200 group-hover:scale-105 transition-transform duration-300">
              <Landmark className="h-6 w-6" />
              <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-orange-600 border-2 border-white">
                <span className="text-[10px] font-black">K</span>
              </div>
            </div>
            <div className="flex flex-col -space-y-1">
              <h1 className="text-2xl font-black tracking-tighter text-slate-900 hidden sm:block font-heading">
                MERCADO<span className="text-orange-600">KWANZA</span>
              </h1>
              <p className="text-[10px] font-bold text-slate-400 tracking-widest hidden sm:block uppercase">Angola Marketplace</p>
            </div>
          </div>

          <div className="flex-1 max-w-lg mx-8 hidden md:block">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors" />
              <Input
                placeholder="Pesquisar produtos, vendedores ou avaliações..."
                className="pl-12 h-12 bg-slate-100 border-none focus-visible:ring-2 focus-visible:ring-orange-500 rounded-2xl transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <p className="absolute -bottom-5 left-4 text-[9px] font-bold text-slate-400 opacity-0 group-focus-within:opacity-100 transition-opacity">
                Pesquisa em nomes, descrições, vendedores e avaliações
              </p>
            </div>
          </div>

          <div className="flex-1 max-w-lg mx-2 md:hidden">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Pesquisar..."
                className="pl-9 h-10 bg-slate-100 border-none focus-visible:ring-2 focus-visible:ring-orange-500 rounded-xl text-xs"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              className="relative h-11 w-11 rounded-xl hover:bg-orange-50 hover:text-orange-600 transition-all"
              onClick={() => setIsCartOpen(true)}
            >
              <ShoppingCart className="h-6 w-6" />
              {cartItems.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-orange-600 text-[10px] font-black text-white ring-2 ring-white">
                  {cartItems.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              )}
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="hidden sm:flex h-11 w-11 rounded-xl hover:bg-orange-50 hover:text-orange-600 transition-all"
              onClick={() => setIsOrdersDialogOpen(true)}
            >
              <User className="h-6 w-6" />
            </Button>
            <Button 
              className="bg-slate-900 hover:bg-orange-600 text-white gap-2 h-11 px-6 rounded-xl font-bold transition-all duration-300 shadow-lg shadow-slate-200"
              onClick={() => setIsSellDialogOpen(true)}
            >
              <Plus className="h-5 w-5" />
              <span className="hidden sm:inline">Vender</span>
            </Button>
          </div>
        </div>

        {/* Navigation Bar */}
        <div className="border-t bg-white/50 backdrop-blur-sm hidden sm:block">
          <div className="container mx-auto px-4">
            <nav className="flex h-12 items-center gap-8 text-sm font-bold text-slate-600">
              <button 
                className={`hover:text-orange-600 transition-colors flex items-center gap-1.5 ${(!showOnlyNew && selectedCategory === "all") ? "text-orange-600" : ""}`}
                onClick={() => {
                  setShowOnlyNew(false);
                  setSelectedCategory("all");
                  setSelectedProvince("all");
                  setSearchQuery("");
                }}
              >
                Início
              </button>
              
              <div className="relative group h-full flex items-center">
                <button className={`hover:text-orange-600 transition-colors flex items-center gap-1.5 ${selectedCategory !== "all" ? "text-orange-600" : ""}`}>
                  Categorias
                  <ChevronDown className="h-4 w-4 opacity-50 group-hover:rotate-180 transition-transform" />
                </button>
                <div className="absolute top-full left-0 w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div className="grid grid-cols-1 gap-1">
                    {Object.values(Category).map((cat) => (
                      <button
                        key={cat}
                        className={`text-left px-4 py-2.5 rounded-xl text-xs hover:bg-orange-50 hover:text-orange-600 transition-colors ${selectedCategory === cat ? "bg-orange-50 text-orange-600" : ""}`}
                        onClick={() => {
                          setSelectedCategory(cat);
                          setShowOnlyNew(false);
                        }}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button 
                className={`hover:text-orange-600 transition-colors flex items-center gap-1.5 ${showOnlyNew ? "text-orange-600" : ""}`}
                onClick={() => {
                  setShowOnlyNew(true);
                  setSelectedCategory("all");
                }}
              >
                <Sparkles className="h-4 w-4" />
                Novidades
              </button>

              <button 
                className="hover:text-orange-600 transition-colors flex items-center gap-1.5"
                onClick={() => setIsSellerProfileOpen(false)} // Just a placeholder for now
              >
                Vendedores
              </button>

              <button 
                className="hover:text-orange-600 transition-colors flex items-center gap-1.5 ml-auto"
                onClick={() => setHelpTopic("Como Comprar")}
              >
                <HelpCircle className="h-4 w-4" />
                Ajuda
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Cart Dialog */}
      <Dialog open={isCartOpen} onOpenChange={setIsCartOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-orange-600" />
              O Teu Carrinho
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            {cartItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <ShoppingCart className="h-12 w-12 mb-4 opacity-20" />
                <p>O teu carrinho está vazio.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {cartItems.map((item) => (
                  <div key={item.product.id} className="flex gap-4 border-b pb-4">
                    <img 
                      src={item.product.images[0]} 
                      alt={item.product.name} 
                      className="h-16 w-16 rounded-lg object-cover"
                    />
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-900 line-clamp-1">{item.product.name}</h4>
                      <p className="text-xs text-slate-500 mb-2">Vendedor: {item.product.sellerName}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-7 w-7"
                            onClick={() => updateQuantity(item.product.id, -1)}
                          >
                            -
                          </Button>
                          <span className="text-sm font-medium">{item.quantity}</span>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-7 w-7"
                            onClick={() => updateQuantity(item.product.id, 1)}
                          >
                            +
                          </Button>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-[10px] px-2 text-slate-500 hover:text-orange-600 hover:bg-orange-50"
                            onClick={() => {
                              setSelectedProductForChat(item.product);
                              setIsSellerChatOpen(true);
                              setIsCartOpen(false);
                            }}
                          >
                            <MessageCircle className="h-3 w-3 mr-1" />
                            Chat
                          </Button>
                          <div className="text-sm font-bold text-orange-600">
                            {formatPrice(item.product.price * item.quantity)}
                          </div>
                        </div>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-slate-400 hover:text-red-500"
                      onClick={() => removeFromCart(item.product.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
          {cartItems.length > 0 && (
            <div className="space-y-4 pt-4 border-t">
              <div className="space-y-1 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span>{formatPrice(cartTotal)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Taxa de Serviço (10%)</span>
                  <span>{formatPrice(appFee)}</span>
                </div>
                <div className="flex justify-between font-black text-lg text-slate-900 pt-2 border-t">
                  <span>Total Final</span>
                  <span className="text-orange-600">{formatPrice(finalTotal)}</span>
                </div>
              </div>
              <Button 
                className="w-full bg-slate-900 hover:bg-orange-600 text-white h-14 text-lg font-black rounded-2xl shadow-xl shadow-slate-200 transition-all duration-300"
                onClick={handleCheckout}
              >
                Finalizar Compra
              </Button>
              <p className="text-[10px] text-center text-slate-400">
                Ao finalizar, o pagamento será processado e os vendedores serão notificados para preparar a entrega.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Order Details Dialog */}
      <Dialog open={isOrderDetailsOpen} onOpenChange={setIsOrderDetailsOpen}>
        <DialogContent className="sm:max-w-[700px] rounded-3xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
          {selectedOrderForDetails && (
            <>
              <DialogHeader className="p-6 bg-slate-900 text-white">
                <div className="flex items-center justify-between">
                  <DialogTitle className="flex items-center gap-2 text-xl font-black">
                    <ShoppingBag className="h-6 w-6 text-orange-500" />
                    Detalhes do Pedido
                  </DialogTitle>
                  <Badge className={
                    selectedOrderForDetails.status === "pending" ? "bg-yellow-500/20 text-yellow-500 border-yellow-500/30" : 
                    selectedOrderForDetails.status === "paid" ? "bg-green-500/20 text-green-500 border-green-500/30" : 
                    selectedOrderForDetails.status === "shipped" ? "bg-blue-500/20 text-blue-500 border-blue-500/30" : 
                    "bg-orange-500/20 text-orange-500 border-orange-500/30"
                  }>
                    {selectedOrderForDetails.status === "pending" ? "Pendente" : 
                     selectedOrderForDetails.status === "paid" ? "Pago" : 
                     selectedOrderForDetails.status === "shipped" ? "Enviado" : "Entregue"}
                  </Badge>
                </div>
                <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-400">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(selectedOrderForDetails.createdAt).toLocaleDateString("pt-AO", { day: '2-digit', month: 'long', year: 'numeric' })}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(selectedOrderForDetails.createdAt).toLocaleTimeString("pt-AO", { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="flex items-center gap-1 font-mono">
                    <span className="opacity-50">ID:</span> {selectedOrderForDetails.id}
                  </div>
                </div>
              </DialogHeader>

              <ScrollArea className="flex-1">
                <div className="p-6 space-y-8">
                  {/* Tracking Timeline */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Rastreamento</h3>
                    <div className="relative pl-8 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                      {[
                        { status: "pending", label: "Pedido Realizado", desc: "Aguardando confirmação de pagamento", icon: ShoppingBag },
                        { status: "paid", label: "Pagamento Confirmado", desc: "O vendedor foi notificado", icon: CheckCircle2 },
                        { status: "shipped", label: "Em Trânsito", desc: "O seu pedido está a caminho", icon: Truck },
                        { status: "delivered", label: "Entregue", desc: "Pedido recebido com sucesso", icon: Package },
                      ].map((step, idx) => {
                        const isCompleted = ["pending", "paid", "shipped", "delivered"].indexOf(selectedOrderForDetails.status) >= ["pending", "paid", "shipped", "delivered"].indexOf(step.status as any);
                        const isCurrent = selectedOrderForDetails.status === step.status;
                        
                        return (
                          <div key={idx} className="relative">
                            <div className={`absolute -left-8 flex h-6 w-6 items-center justify-center rounded-full border-4 border-white shadow-sm transition-colors duration-500 ${
                              isCompleted ? "bg-orange-600 text-white" : "bg-slate-100 text-slate-300"
                            }`}>
                              <step.icon className="h-3 w-3" />
                            </div>
                            <div className="space-y-0.5">
                              <p className={`text-sm font-bold ${isCompleted ? "text-slate-900" : "text-slate-400"}`}>
                                {step.label}
                                {isCurrent && <Badge className="ml-2 bg-orange-600 text-[8px] h-4">Actual</Badge>}
                              </p>
                              <p className="text-xs text-slate-500">{step.desc}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Itens do Pedido</h3>
                    <div className="space-y-3">
                      {selectedOrderForDetails.items.map((item, idx) => (
                        <div key={idx} className="flex gap-4 p-3 rounded-2xl border border-slate-100 bg-slate-50/50">
                          <img 
                            src={item.product.images[0]} 
                            alt={item.product.name} 
                            className="h-16 w-16 rounded-xl object-cover shadow-sm"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-bold text-slate-900 truncate">{item.product.name}</h4>
                            <p className="text-[10px] text-slate-500 font-medium">Vendido por: <span className="text-orange-600">{item.product.sellerName}</span></p>
                            <div className="mt-2 flex items-center justify-between">
                              <p className="text-xs font-bold text-slate-600">{item.quantity}x {formatPrice(item.product.price)}</p>
                              <p className="text-sm font-black text-slate-900">{formatPrice(item.product.price * item.quantity)}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Payment Summary */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Resumo do Pagamento</h3>
                    <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-3 shadow-xl">
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>Subtotal</span>
                        <span className="text-white font-bold">{formatPrice(selectedOrderForDetails.totalAmount - selectedOrderForDetails.commissionAmount)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>Taxa de Serviço (10%)</span>
                        <span className="text-white font-bold">{formatPrice(selectedOrderForDetails.commissionAmount)}</span>
                      </div>
                      <div className="pt-3 border-t border-white/10 flex justify-between items-center">
                        <span className="text-sm font-black uppercase tracking-widest text-orange-500">Total Pago</span>
                        <span className="text-xl font-black text-white">{formatPrice(selectedOrderForDetails.totalAmount)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollArea>

              <div className="p-6 border-t bg-white flex gap-3">
                <Button 
                  variant="outline"
                  className="flex-1 rounded-xl border-slate-200 font-bold h-12"
                  onClick={() => {
                    setActiveOrder(selectedOrderForDetails);
                    setIsPaymentDialogOpen(true);
                  }}
                >
                  <FileText className="h-5 w-5 mr-2" />
                  Ver Comprovativo
                </Button>
                <Button 
                  className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-bold h-12 rounded-xl shadow-lg shadow-orange-100"
                  onClick={() => setIsOrderDetailsOpen(false)}
                >
                  Fechar
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* My Orders Dialog */}
      <Dialog open={isOrdersDialogOpen} onOpenChange={setIsOrdersDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Store className="h-5 w-5 text-orange-600" />
              Os Meus Pedidos
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-4">
            {orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <Store className="h-12 w-12 mb-4 opacity-20" />
                <p>Ainda não realizaste nenhum pedido.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <Card key={order.id} className="overflow-hidden border-slate-200">
                    <CardHeader className="bg-slate-50 p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase font-bold">ID do Pedido</p>
                          <p className="text-xs font-mono">{order.id}</p>
                        </div>
                        <Badge className={
                          order.status === "pending" ? "bg-yellow-500" : 
                          order.status === "paid" ? "bg-green-500" : "bg-blue-500"
                        }>
                          {order.status === "pending" ? "Pendente" : "Confirmado"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex justify-between items-end">
                        <div className="space-y-1">
                          <p className="text-[10px] text-slate-500 uppercase font-bold">Referência de Pagamento</p>
                          <p className="font-mono text-sm tracking-wider">
                            {order.paymentDetails?.entityCode} / {order.paymentDetails?.referenceNumber ? formatReference(order.paymentDetails.referenceNumber) : ""}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-slate-500 uppercase font-bold">Total</p>
                          <p className="font-bold text-orange-600">{formatPrice(order.totalAmount)}</p>
                        </div>
                      </div>
                      <div className="pt-2 border-t text-[10px] text-slate-400 flex justify-between">
                        <span>{new Date(order.createdAt).toLocaleString("pt-AO")}</span>
                        <span>{order.items.length} itens</span>
                      </div>
                    </CardContent>
                    <CardFooter className="p-2 bg-slate-50 flex justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-xs h-8 text-orange-600 hover:text-orange-700 hover:bg-orange-50 font-bold"
                        onClick={() => {
                          setSelectedOrderForDetails(order);
                          setIsOrderDetailsOpen(true);
                        }}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Ver Detalhes
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-xs h-8"
                        onClick={() => {
                          setActiveOrder(order);
                          setIsPaymentDialogOpen(true);
                        }}
                      >
                        <CreditCard className="h-3 w-3 mr-1" />
                        Pagamento
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
      {/* Payment Details Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <CreditCard className="h-5 w-5" />
              Pagamento do Pedido
            </DialogTitle>
          </DialogHeader>
          
          {activeOrder && (
            <div className="space-y-6">
              <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
                <p className="text-sm text-orange-800 font-medium mb-1">Total a Pagar</p>
                <p className="text-3xl font-black text-orange-600">{formatPrice(activeOrder.totalAmount)}</p>
              </div>

              <Tabs defaultValue="reference" className="w-full">
                <TabsList className="grid w-full grid-cols-4 h-auto p-1 bg-slate-100 rounded-xl">
                  <TabsTrigger value="reference" className="flex flex-col gap-1 py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                    <CreditCard className="h-4 w-4" />
                    <span className="text-[10px] font-bold">Referência</span>
                  </TabsTrigger>
                  <TabsTrigger value="mcx" className="flex flex-col gap-1 py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                    <Smartphone className="h-4 w-4" />
                    <span className="text-[10px] font-bold">MCX Express</span>
                  </TabsTrigger>
                  <TabsTrigger value="mbway" className="flex flex-col gap-1 py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                    <Smartphone className="h-4 w-4" />
                    <span className="text-[10px] font-bold">MB Way</span>
                  </TabsTrigger>
                  <TabsTrigger value="bank" className="flex flex-col gap-1 py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                    <Landmark className="h-4 w-4" />
                    <span className="text-[10px] font-bold">IBAN</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="reference" className="space-y-4 pt-4">
                  <div className="space-y-3">
                    <div className="p-3 bg-slate-50 rounded-md border flex justify-between items-center">
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase font-bold">Entidade</p>
                        <p className="font-mono text-lg">{activeOrder.paymentDetails?.entityCode}</p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => copyToClipboard(activeOrder.paymentDetails?.entityCode || "", "ent")}
                      >
                        {hasCopied === "ent" ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-md border flex justify-between items-center">
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase font-bold">Referência</p>
                        <p className="font-mono text-lg tracking-wider">
                          {activeOrder.paymentDetails?.referenceNumber ? formatReference(activeOrder.paymentDetails.referenceNumber) : ""}
                        </p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => copyToClipboard(activeOrder.paymentDetails?.referenceNumber || "", "ref")}
                      >
                        {hasCopied === "ref" ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 text-center italic">
                    Pode pagar via Multicaixa Express ou em qualquer caixa ATM escolhendo "Pagamentos por Referência".
                  </p>
                </TabsContent>

                <TabsContent value="mcx" className="space-y-4 pt-4">
                  <div className="space-y-4">
                    <div className="p-4 bg-orange-50 rounded-xl border border-orange-100 text-center">
                      <p className="text-sm text-orange-800 font-medium mb-2">Pagamento Directo via MCX Express</p>
                      <p className="text-xs text-orange-600">Introduza o seu número de telemóvel associado ao Multicaixa Express para receber a notificação de pagamento.</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-600 uppercase">Número de Telemóvel</label>
                      <div className="flex gap-2">
                        <Input placeholder="9XX XXX XXX" className="rounded-xl border-slate-200" defaultValue={activeOrder.paymentDetails?.mcxPhone} />
                        <Button className="bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl">Enviar</Button>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 text-center">
                      Após clicar em enviar, abra a sua App Multicaixa Express e confirme o pagamento de {formatPrice(activeOrder.totalAmount)}.
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="mbway" className="space-y-4 pt-4">
                  <div className="space-y-4">
                    <div className="p-4 bg-pink-50 rounded-xl border border-pink-100 text-center">
                      <p className="text-sm text-pink-800 font-medium mb-2">Pagamento via MB Way</p>
                      <p className="text-xs text-pink-600">Receba uma notificação no seu telemóvel para autorizar o pagamento instantaneamente.</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-600 uppercase">Número de Telemóvel MB Way</label>
                      <div className="flex gap-2">
                        <Input placeholder="9XX XXX XXX" className="rounded-xl border-slate-200" defaultValue={activeOrder.paymentDetails?.mbwayPhone} />
                        <Button className="bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-xl">Pagar</Button>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="bank" className="space-y-4 pt-4">
                  <div className="space-y-3">
                    <div className="p-3 bg-slate-50 rounded-md border">
                      <p className="text-[10px] text-slate-500 uppercase font-bold">Banco</p>
                      <p className="font-medium">{activeOrder.paymentDetails?.bankName}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-md border flex justify-between items-center">
                      <div className="flex-1">
                        <p className="text-[10px] text-slate-500 uppercase font-bold">IBAN</p>
                        <p className="font-mono text-sm break-all">{activeOrder.paymentDetails?.iban}</p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => copyToClipboard(activeOrder.paymentDetails?.iban || "", "iban")}
                      >
                        {hasCopied === "iban" ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-md border">
                      <p className="text-[10px] text-slate-500 uppercase font-bold">Beneficiário</p>
                      <p className="font-medium">{activeOrder.paymentDetails?.beneficiary}</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 text-center italic">
                    Após a transferência, por favor envie o comprovativo para o nosso suporte.
                  </p>
                </TabsContent>
              </Tabs>

              <div className="pt-4 border-t space-y-3">
                <Button 
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold"
                  onClick={() => {
                    setIsPaymentDialogOpen(false);
                    toast.success("Pagamento confirmado! O seu pedido está a ser processado.");
                  }}
                >
                  Já Efectuei o Pagamento
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full text-slate-500"
                  onClick={() => setIsPaymentDialogOpen(false)}
                >
                  Pagar Mais Tarde
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Sell / Create Store Dialog */}
      <Dialog open={isSellDialogOpen} onOpenChange={setIsSellDialogOpen}>
        <DialogContent className="sm:max-w-[550px] rounded-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl font-black font-heading">
              <Store className="h-6 w-6 text-orange-600" />
              Criar Minha Loja
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Nome da Loja</label>
                <Input 
                  placeholder="Ex: Boutique da Maria" 
                  className={`rounded-xl border-slate-200 focus:ring-orange-500 ${storeErrors.name ? "border-red-500" : ""}`}
                  value={storeForm.name}
                  onChange={(e) => setStoreForm({...storeForm, name: e.target.value})}
                />
                {storeErrors.name && <p className="text-[10px] text-red-500 font-bold">{storeErrors.name}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">WhatsApp / Contacto</label>
                <Input 
                  placeholder="+244 9XX XXX XXX" 
                  className={`rounded-xl border-slate-200 ${storeErrors.contact ? "border-red-500" : ""}`}
                  value={storeForm.contact}
                  onChange={(e) => setStoreForm({...storeForm, contact: e.target.value})}
                />
                {storeErrors.contact && <p className="text-[10px] text-red-500 font-bold">{storeErrors.contact}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Província</label>
                <Select value={storeForm.province} onValueChange={(v) => setStoreForm({...storeForm, province: v})}>
                  <SelectTrigger className={`rounded-xl border-slate-200 ${storeErrors.province ? "border-red-500" : ""}`}>
                    <SelectValue placeholder="Selecionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(Province).map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {storeErrors.province && <p className="text-[10px] text-red-500 font-bold">{storeErrors.province}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Município</label>
                <Input 
                  placeholder="Ex: Talatona" 
                  className={`rounded-xl border-slate-200 ${storeErrors.municipality ? "border-red-500" : ""}`}
                  value={storeForm.municipality}
                  onChange={(e) => setStoreForm({...storeForm, municipality: e.target.value})}
                />
                {storeErrors.municipality && <p className="text-[10px] text-red-500 font-bold">{storeErrors.municipality}</p>}
              </div>
            </div>

            <div className="space-y-4 p-4 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="h-4 w-4 text-orange-600" />
                Documentos de Verificação
              </h4>
              <p className="text-xs text-slate-500">Anexe o seu BI ou Alvará Comercial para obter o selo de Vendedor Verificado.</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="relative group cursor-pointer border border-slate-200 bg-white p-3 rounded-xl hover:border-orange-500 transition-colors text-center">
                  <Upload className="h-5 w-5 mx-auto mb-1 text-slate-400 group-hover:text-orange-500" />
                  <span className="text-[10px] font-bold text-slate-600">Frente do BI</span>
                </div>
                <div className="relative group cursor-pointer border border-slate-200 bg-white p-3 rounded-xl hover:border-orange-500 transition-colors text-center">
                  <Upload className="h-5 w-5 mx-auto mb-1 text-slate-400 group-hover:text-orange-500" />
                  <span className="text-[10px] font-bold text-slate-600">Verso do BI</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Logótipo da Loja</label>
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400">
                  <ImagePlus className="h-6 w-6" />
                </div>
                <Button variant="outline" className="rounded-xl border-slate-200">Carregar Foto</Button>
              </div>
            </div>

            <Button 
              className="w-full bg-orange-600 hover:bg-orange-700 text-white h-12 rounded-xl font-bold text-lg shadow-lg shadow-orange-200"
              onClick={handleCreateStore}
            >
              Criar Loja e Adicionar Produtos
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Product Dialog */}
      <Dialog open={isAddProductDialogOpen} onOpenChange={setIsAddProductDialogOpen}>
        <DialogContent className="sm:max-w-[600px] rounded-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl font-black font-heading">
              <Plus className="h-6 w-6 text-orange-600" />
              Adicionar Novo Produto
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Nome do Produto</label>
              <Input placeholder="Ex: iPhone 15 Pro Max 256GB" className="rounded-xl border-slate-200" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Preço (Kz)</label>
                <Input type="number" placeholder="0.00" className="rounded-xl border-slate-200" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Categoria</label>
                <Select>
                  <SelectTrigger className="rounded-xl border-slate-200">
                    <SelectValue placeholder="Selecionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(Category).map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Descrição Detalhada</label>
              <textarea 
                className="w-full min-h-[100px] p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                placeholder="Descreva o estado, especificações e o que está incluído..."
              ></textarea>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-bold text-slate-700">Fotografias do Produto (Máx. 5)</label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                <div className="aspect-square rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 hover:border-orange-500 hover:text-orange-500 cursor-pointer transition-all bg-slate-50">
                  <Plus className="h-6 w-6" />
                  <span className="text-[8px] font-bold mt-1 uppercase">Adicionar</span>
                </div>
                {/* Placeholders for uploaded images */}
                {[1, 2].map((i) => (
                  <div key={i} className="aspect-square rounded-xl bg-slate-100 relative group overflow-hidden border border-slate-200">
                    <img 
                      src={`https://picsum.photos/seed/prod${i}/200/200`} 
                      alt="Preview" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Trash2 className="h-5 w-5 text-white cursor-pointer hover:text-red-500" />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-slate-500 italic">Dica: Use fotos bem iluminadas e de vários ângulos.</p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button 
                variant="outline" 
                className="flex-1 rounded-xl h-12 font-bold"
                onClick={() => setIsAddProductDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button 
                className="flex-[2] bg-slate-900 hover:bg-orange-600 text-white h-12 rounded-xl font-bold text-lg shadow-lg"
                onClick={() => {
                  setIsAddProductDialogOpen(false);
                  toast.success("Produto publicado com sucesso!");
                }}
              >
                Publicar Produto
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Seller Chat Dialog */}
      <Dialog open={isSellerChatOpen} onOpenChange={setIsSellerChatOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-3xl p-0 overflow-hidden">
          {selectedProductForChat && (
            <div className="flex flex-col h-[600px]">
              <div className="p-4 border-b bg-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold cursor-pointer hover:bg-orange-200 transition-colors"
                    onClick={() => {
                      setIsSellerChatOpen(false);
                      openSellerProfile(selectedProductForChat.sellerId);
                    }}
                  >
                    {selectedProductForChat.sellerName.charAt(0)}
                  </div>
                  <div 
                    className="cursor-pointer group"
                    onClick={() => {
                      setIsSellerChatOpen(false);
                      openSellerProfile(selectedProductForChat.sellerId);
                    }}
                  >
                    <h3 className="font-bold text-slate-900 leading-none group-hover:text-orange-600 transition-colors">{selectedProductForChat.sellerName}</h3>
                    <p className="text-[10px] text-green-500 font-bold mt-1 uppercase tracking-wider">Online agora</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsSellerChatOpen(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="p-3 bg-slate-50 border-b flex items-center gap-3">
                <img 
                  src={selectedProductForChat.images[0]} 
                  alt={selectedProductForChat.name} 
                  className="h-12 w-12 rounded-lg object-cover border border-slate-200"
                  referrerPolicy="no-referrer"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">{selectedProductForChat.name}</p>
                  <p className="text-xs font-black text-orange-600">{formatPrice(selectedProductForChat.price)}</p>
                </div>
              </div>

              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {(sellerChatMessages[selectedProductForChat.id] || []).map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                        msg.role === "user" 
                          ? "bg-slate-900 text-white rounded-tr-none" 
                          : "bg-white border border-slate-100 text-slate-700 rounded-tl-none shadow-sm"
                      }`}>
                        {msg.text}
                        <p className={`text-[9px] mt-1 opacity-50 ${msg.role === "user" ? "text-right" : "text-left"}`}>
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                  {isSellerTyping && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex justify-start"
                    >
                      <div className="bg-white border border-slate-100 p-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1">
                        <motion.span 
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ repeat: Infinity, duration: 0.6 }}
                          className="w-1.5 h-1.5 bg-slate-300 rounded-full" 
                        />
                        <motion.span 
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }}
                          className="w-1.5 h-1.5 bg-slate-300 rounded-full" 
                        />
                        <motion.span 
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }}
                          className="w-1.5 h-1.5 bg-slate-300 rounded-full" 
                        />
                        <span className="text-[10px] font-bold text-slate-400 ml-1">Vendedor está a digitar...</span>
                      </div>
                    </motion.div>
                  )}
                  <div ref={sellerChatEndRef} />
                </div>
              </ScrollArea>

              <div className="p-4 border-t bg-white">
                <div className="flex gap-2">
                  <Input 
                    placeholder="Escreva a sua mensagem..." 
                    className="rounded-xl border-slate-200 focus:ring-orange-500"
                    value={sellerChatInput}
                    onChange={(e) => setSellerChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendSellerMessage()}
                  />
                  <Button 
                    className="bg-orange-600 hover:bg-orange-700 text-white rounded-xl px-4"
                    onClick={handleSendSellerMessage}
                  >
                    <Send className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Seller Profile Dialog */}
      <Dialog open={isSellerProfileOpen} onOpenChange={setIsSellerProfileOpen}>
        <DialogContent className="sm:max-w-[600px] rounded-3xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
          {selectedSellerForProfile && (
            <>
              <div className="relative h-32 bg-gradient-to-r from-orange-500 to-orange-700">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute top-4 right-4 text-white hover:bg-white/20 rounded-full"
                  onClick={() => setIsSellerProfileOpen(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              
              <div className="px-6 pb-6 -mt-12 relative flex-1 overflow-hidden flex flex-col">
                <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 mb-6">
                  <Avatar className="h-24 w-24 border-4 border-white shadow-xl rounded-2xl">
                    <AvatarImage src={selectedSellerForProfile.shopLogo} />
                    <AvatarFallback className="bg-orange-100 text-orange-600 text-2xl font-black rounded-2xl">
                      {selectedSellerForProfile.shopName?.charAt(0) || selectedSellerForProfile.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 pb-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-2xl font-black text-slate-900 font-heading">
                        {selectedSellerForProfile.shopName || selectedSellerForProfile.name}
                      </h2>
                      {selectedSellerForProfile.isVerified && (
                        <Badge className="bg-blue-500 text-white border-none text-[10px] uppercase font-black px-2 py-0.5">
                          Verificado
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 font-medium flex items-center gap-1 mt-1">
                      <MapPin className="h-3.5 w-3.5 text-orange-500" />
                      {selectedSellerForProfile.province}
                    </p>
                  </div>
                  <Button 
                    className="bg-slate-900 hover:bg-orange-600 text-white rounded-xl font-bold px-6 shadow-lg shadow-slate-200"
                    onClick={() => {
                      setIsSellerProfileOpen(false);
                      toast.info(`Contactando ${selectedSellerForProfile.shopName || selectedSellerForProfile.name}...`);
                    }}
                  >
                    Contactar Loja
                  </Button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-col items-center justify-center text-center">
                    <div className="flex items-center gap-1 text-orange-600 font-black text-lg">
                      <Star className="h-4 w-4 fill-orange-600" />
                      {selectedSellerForProfile.rating || "N/A"}
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Avaliação</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-col items-center justify-center text-center">
                    <div className="flex items-center gap-1 text-slate-900 font-black text-lg">
                      <Clock className="h-4 w-4 text-blue-500" />
                      {selectedSellerForProfile.responseTime || "N/A"}
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Resposta</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-col items-center justify-center text-center">
                    <div className="flex items-center gap-1 text-slate-900 font-black text-lg">
                      <ShoppingBag className="h-4 w-4 text-green-500" />
                      {selectedSellerForProfile.totalSales || 0}
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Vendas</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-col items-center justify-center text-center">
                    <div className="flex items-center gap-1 text-slate-900 font-black text-lg">
                      <Calendar className="h-4 w-4 text-purple-500" />
                      {new Date(selectedSellerForProfile.joinedAt || Date.now()).getFullYear()}
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Membro Desde</p>
                  </div>
                </div>

                <Tabs defaultValue="products" className="flex-1 flex flex-col overflow-hidden">
                  <TabsList className="grid w-full grid-cols-3 bg-slate-100 p-1 rounded-xl mb-6">
                    <TabsTrigger value="products" className="rounded-lg font-bold data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-sm">
                      Produtos
                    </TabsTrigger>
                    <TabsTrigger value="reviews" className="rounded-lg font-bold data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-sm">
                      Avaliações
                    </TabsTrigger>
                    <TabsTrigger value="about" className="rounded-lg font-bold data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-sm">
                      Sobre
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="products" className="flex-1 overflow-hidden mt-0">
                    <ScrollArea className="h-full pr-4">
                      <div className="grid grid-cols-2 gap-4 pb-4">
                        {MOCK_PRODUCTS.filter(p => p.sellerId === selectedSellerForProfile.id).map(product => (
                          <div 
                            key={product.id} 
                            className="group cursor-pointer"
                            onClick={() => {
                              setIsSellerProfileOpen(false);
                              setSelectedProductForDetails(product);
                              setIsProductDetailsOpen(true);
                            }}
                          >
                            <div className="aspect-square rounded-2xl overflow-hidden mb-2 border border-slate-100 relative">
                              <img 
                                src={product.images[0]} 
                                alt={product.name} 
                                className="w-full h-full object-cover transition-transform group-hover:scale-110"
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-[10px] font-black text-orange-600 shadow-sm">
                                {formatPrice(product.price)}
                              </div>
                            </div>
                            <h4 className="text-xs font-bold text-slate-900 truncate group-hover:text-orange-600 transition-colors">
                              {product.name}
                            </h4>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="reviews" className="flex-1 overflow-hidden mt-0">
                    <ScrollArea className="h-full pr-4">
                      <div className="space-y-4 pb-4">
                        {reviews.filter(r => MOCK_PRODUCTS.find(p => p.id === r.productId)?.sellerId === selectedSellerForProfile.id).length === 0 ? (
                          <p className="text-xs text-slate-400 text-center py-8 italic">Ainda não há avaliações para esta loja.</p>
                        ) : (
                          reviews.filter(r => MOCK_PRODUCTS.find(p => p.id === r.productId)?.sellerId === selectedSellerForProfile.id).map(review => {
                            const product = MOCK_PRODUCTS.find(p => p.id === review.productId);
                            return (
                              <div key={review.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex flex-col">
                                    <span className="text-xs font-bold text-slate-900">{review.userName}</span>
                                    <span className="text-[10px] text-orange-600 font-bold">em {product?.name}</span>
                                  </div>
                                  <div className="flex gap-0.5">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                      <Star key={i} className={`h-2.5 w-2.5 ${i < review.rating ? "fill-orange-500 text-orange-500" : "text-slate-200"}`} />
                                    ))}
                                  </div>
                                </div>
                                <p className="text-xs text-slate-600 leading-relaxed italic">"{review.comment}"</p>
                                <p className="text-[9px] text-slate-400 mt-2">
                                  {new Date(review.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                  
                  <TabsContent value="about" className="flex-1 mt-0">
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-2">Descrição</h4>
                        <p className="text-sm text-slate-600 leading-relaxed">
                          {selectedSellerForProfile.description || "Este vendedor ainda não adicionou uma descrição detalhada."}
                        </p>
                      </div>
                      
                      <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100">
                        <h4 className="text-sm font-black text-orange-900 mb-2 flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4" />
                          Compromisso de Qualidade
                        </h4>
                        <p className="text-xs text-orange-800 leading-relaxed">
                          Este vendedor compromete-se a fornecer produtos autênticos e a responder a todas as questões num prazo máximo de 24 horas úteis.
                        </p>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Product Details Dialog */}
      <Dialog open={isProductDetailsOpen} onOpenChange={setIsProductDetailsOpen}>
        <DialogContent className="sm:max-w-[800px] rounded-3xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
          {selectedProductForDetails && (
            <div className="flex flex-col md:flex-row h-full overflow-hidden">
              <div className="md:w-1/2 bg-slate-50 relative">
                <ScrollArea className="h-full">
                  <div className="p-4 space-y-4">
                    {selectedProductForDetails.images.map((img, idx) => (
                      <img 
                        key={idx}
                        src={img} 
                        alt={selectedProductForDetails.name} 
                        className="w-full rounded-2xl shadow-sm"
                        referrerPolicy="no-referrer"
                      />
                    ))}
                  </div>
                </ScrollArea>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute top-4 left-4 bg-white/80 backdrop-blur-sm hover:bg-white rounded-full md:hidden"
                  onClick={() => setIsProductDetailsOpen(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="md:w-1/2 flex flex-col h-full bg-white">
                <div className="p-6 border-b flex items-center justify-between">
                  <div>
                    <Badge className="bg-orange-100 text-orange-600 border-none mb-2">
                      {selectedProductForDetails.category}
                    </Badge>
                    <h2 className="text-2xl font-black text-slate-900 font-heading leading-tight">
                      {selectedProductForDetails.name}
                    </h2>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="hidden md:flex rounded-full"
                    onClick={() => setIsProductDetailsOpen(false)}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                <ScrollArea className="flex-1 p-6">
                  <div className="space-y-6">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-orange-600 font-heading">
                        {formatPrice(selectedProductForDetails.price)}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Descrição</h3>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        {selectedProductForDetails.description}
                      </p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Store className="h-4 w-4 text-orange-500" />
                          <span className="text-sm font-bold text-slate-900">{selectedProductForDetails.sellerName}</span>
                        </div>
                        <Button 
                          variant="link" 
                          className="text-orange-600 font-bold p-0 h-auto"
                          onClick={() => {
                            setIsProductDetailsOpen(false);
                            openSellerProfile(selectedProductForDetails.sellerId);
                          }}
                        >
                          Ver Perfil
                        </Button>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <MapPin className="h-3.5 w-3.5" />
                        {selectedProductForDetails.municipality}, {selectedProductForDetails.province}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Avaliações</h3>
                        <div className="flex items-center gap-1 text-orange-500">
                          <Star className="h-4 w-4 fill-orange-500" />
                          <span className="text-sm font-black">{selectedProductForDetails.rating || "N/A"}</span>
                          <span className="text-xs text-slate-400 font-bold">({selectedProductForDetails.reviewCount || 0})</span>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {/* Review Form */}
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                          <p className="text-xs font-bold text-slate-700">Deixa a tua avaliação</p>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button 
                                key={star}
                                onClick={() => setNewReview(prev => ({ ...prev, rating: star }))}
                                className="focus:outline-none"
                              >
                                <Star className={`h-5 w-5 ${star <= newReview.rating ? "fill-orange-500 text-orange-500" : "text-slate-300"}`} />
                              </button>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <Input 
                              placeholder="Escreve o teu comentário..." 
                              value={newReview.comment}
                              onChange={(e) => setNewReview(prev => ({ ...prev, comment: e.target.value }))}
                              className="rounded-xl border-slate-200 text-xs"
                            />
                            <Button 
                              size="sm" 
                              className="bg-slate-900 hover:bg-orange-600 text-white rounded-xl font-bold px-4"
                              onClick={() => handleReviewSubmit(selectedProductForDetails.id)}
                            >
                              Enviar
                            </Button>
                          </div>
                        </div>

                        {/* Review List */}
                        <div className="space-y-4">
                          {reviews.filter(r => r.productId === selectedProductForDetails.id).length === 0 ? (
                            <p className="text-xs text-slate-400 text-center py-4 italic">Ainda não há avaliações para este produto.</p>
                          ) : (
                            reviews.filter(r => r.productId === selectedProductForDetails.id).map(review => (
                              <div key={review.id} className="border-b border-slate-50 pb-4 last:border-0">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-bold text-slate-900">{review.userName}</span>
                                  <div className="flex gap-0.5">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                      <Star key={i} className={`h-2.5 w-2.5 ${i < review.rating ? "fill-orange-500 text-orange-500" : "text-slate-200"}`} />
                                    ))}
                                  </div>
                                </div>
                                <p className="text-xs text-slate-600 leading-relaxed">{review.comment}</p>
                                <p className="text-[9px] text-slate-400 mt-1">
                                  {new Date(review.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </ScrollArea>

                <div className="p-6 border-t bg-white flex gap-3">
                  <Button 
                    variant="outline"
                    className="flex-1 rounded-xl border-slate-200 font-bold h-12"
                    onClick={() => {
                      setSelectedProductForChat(selectedProductForDetails);
                      setIsSellerChatOpen(true);
                      setIsProductDetailsOpen(false);
                    }}
                  >
                    <MessageCircle className="h-5 w-5 mr-2" />
                    Chat
                  </Button>
                  <Button 
                    className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold h-12 rounded-xl"
                    onClick={() => handleBuyNow(selectedProductForDetails)}
                  >
                    Comprar Agora
                  </Button>
                  <Button 
                    className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-bold h-12 rounded-xl shadow-lg shadow-orange-100"
                    onClick={() => {
                      addToCart(selectedProductForDetails);
                      setIsCartOpen(true);
                      setIsProductDetailsOpen(false);
                    }}
                  >
                    Adicionar ao Carrinho
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="relative mb-12 overflow-hidden rounded-3xl bg-slate-900 px-8 py-16 text-white shadow-2xl">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(249,115,22,0.4),transparent_70%)]" />
            <div className="grid grid-cols-8 gap-4 opacity-10">
              {Array.from({ length: 32 }).map((_, i) => (
                <div key={i} className="h-24 rounded-lg bg-white/10" />
              ))}
            </div>
          </div>
          <div className="relative z-10 max-w-2xl">
            <Badge className="mb-4 bg-orange-500/20 text-orange-400 border-orange-500/30 backdrop-blur-sm">
              O maior marketplace de Angola
            </Badge>
            <h2 className="mb-4 text-5xl font-black tracking-tight font-heading leading-[1.1]">
              Compra e vende com <span className="text-orange-500">facilidade</span> em todo o país.
            </h2>
            <p className="mb-8 text-lg text-slate-300 leading-relaxed">
              De Luanda ao Namibe, conectamos milhares de angolanos todos os dias. Encontre as melhores ofertas ou comece a vender hoje mesmo.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button 
                size="lg" 
                className="bg-orange-600 hover:bg-orange-700 text-white px-8 font-bold text-lg h-14 rounded-2xl shadow-xl shadow-orange-900/20"
                onClick={() => {
                  const grid = document.getElementById("product-grid");
                  grid?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                <Search className="mr-2 h-5 w-5" />
                Explorar Produtos
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="bg-white/5 border-white/20 hover:bg-white/10 text-white px-8 font-bold text-lg h-14 rounded-2xl backdrop-blur-md"
                onClick={() => setIsSellDialogOpen(true)}
              >
                <Store className="mr-2 h-5 w-5" />
                Criar Minha Loja
              </Button>
              {cartItems.length > 0 && (
                <Button 
                  size="lg" 
                  variant="secondary"
                  className="bg-white text-slate-900 px-8 font-bold text-lg h-14 rounded-2xl shadow-xl"
                  onClick={() => setIsCartOpen(true)}
                >
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  Ver Carrinho ({cartItems.length})
                </Button>
              )}
            </div>
          </div>
          <div className="absolute right-0 top-0 h-full w-1/3 hidden lg:block">
            <div className="relative h-full w-full">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-orange-500 rounded-full blur-[100px] opacity-30" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-orange-400 rounded-full blur-[80px] opacity-20" />
            </div>
          </div>
        </div>

        {/* Main Content Area with Sidebar */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Mobile Filter Toggle */}
          <div className="lg:hidden mb-4">
            <Button 
              variant="outline" 
              className="w-full rounded-2xl border-slate-200 h-12 font-bold text-slate-600 flex items-center justify-between px-6"
              onClick={() => setIsMobileFiltersOpen(!isMobileFiltersOpen)}
            >
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-orange-600" />
                Filtros Avançados
              </div>
              <Plus className={`h-5 w-5 transition-transform duration-300 ${isMobileFiltersOpen ? "rotate-45" : ""}`} />
            </Button>
          </div>

          {/* Sidebar Filters */}
          <aside className={`w-full lg:w-64 shrink-0 space-y-8 ${isMobileFiltersOpen ? "block" : "hidden lg:block"}`}>
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6 sticky top-24">
              <div className="flex items-center gap-2 text-slate-900 font-black uppercase tracking-wider text-xs">
                <Filter className="h-4 w-4 text-orange-600" />
                Filtros Avançados
              </div>

              {/* Price Range Slider */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-slate-700">Intervalo de Preço</label>
                  <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-lg">Kz</span>
                </div>
                
                <div className="space-y-6 pt-2">
                  <div className="relative h-2 bg-slate-100 rounded-full">
                    <div 
                      className="absolute h-full bg-orange-600 rounded-full"
                      style={{ 
                        left: `${(priceRange[0] / 1000000) * 100}%`, 
                        right: `${100 - (priceRange[1] / 1000000) * 100}%` 
                      }}
                    />
                    <input
                      type="range"
                      min="0"
                      max="1000000"
                      step="1000"
                      value={priceRange[0]}
                      onChange={(e) => setPriceRange([parseInt(e.target.value), priceRange[1]])}
                      className="absolute w-full h-full appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-orange-600 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-orange-600 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:cursor-pointer"
                    />
                    <input
                      type="range"
                      min="0"
                      max="1000000"
                      step="1000"
                      value={priceRange[1]}
                      onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                      className="absolute w-full h-full appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-orange-600 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-orange-600 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex-1 space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Min</p>
                      <div className="relative">
                        <Input 
                          type="number" 
                          value={priceRange[0]} 
                          onChange={(e) => setPriceRange([parseInt(e.target.value) || 0, priceRange[1]])}
                          className="h-9 text-xs font-bold rounded-xl border-slate-100 bg-slate-50"
                        />
                      </div>
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Max</p>
                      <div className="relative">
                        <Input 
                          type="number" 
                          value={priceRange[1]} 
                          onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value) || 0])}
                          className="h-9 text-xs font-bold rounded-xl border-slate-100 bg-slate-50"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Province Filter */}
              <div className="space-y-3">
                <label className="text-sm font-bold text-slate-700">Província</label>
                <Select value={selectedProvince} onValueChange={setSelectedProvince}>
                  <SelectTrigger className="rounded-xl border-slate-100 bg-slate-50 font-bold text-slate-700 h-10">
                    <SelectValue placeholder="Todas as Províncias" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-slate-100 shadow-xl">
                    <SelectItem value="all" className="font-bold">Todas as Províncias</SelectItem>
                    {Object.values(Province).map((prov) => (
                      <SelectItem key={prov} value={prov} className="font-medium">{prov}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Seller Filter */}
              <div className="space-y-3">
                <label className="text-sm font-bold text-slate-700">Vendedor</label>
                <Select value={selectedSeller} onValueChange={setSelectedSeller}>
                  <SelectTrigger className="rounded-xl border-slate-100 bg-slate-50 font-bold text-slate-700 h-10">
                    <SelectValue placeholder="Todos os Vendedores" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-slate-100 shadow-xl">
                    <SelectItem value="all" className="font-bold">Todos os Vendedores</SelectItem>
                    {MOCK_USERS.filter(u => u.role === 'seller').map((seller) => (
                      <SelectItem key={seller.id} value={seller.id} className="font-medium">
                        {seller.shopName || seller.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-4 border-t border-slate-50">
                <Button 
                  variant="ghost" 
                  className="w-full text-xs font-bold text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-xl"
                  onClick={() => {
                    setPriceRange([0, 1000000]);
                    setSelectedSeller("all");
                    setSelectedCategory("all");
                    setSelectedProvince("all");
                    setShowOnlyNew(false);
                  }}
                >
                  Limpar Filtros
                </Button>
              </div>
            </div>
          </aside>

          <div className="flex-1">
            {/* Filters & Categories */}
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2 flex-1">
              <Badge 
                variant={selectedCategory === "all" ? "default" : "outline"}
                className={`cursor-pointer px-5 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 ${
                  selectedCategory === "all" 
                    ? "bg-slate-900 hover:bg-orange-600 text-white shadow-lg shadow-slate-200" 
                    : "hover:border-orange-200 hover:bg-orange-50 text-slate-600"
                }`}
                onClick={() => setSelectedCategory("all")}
              >
                Todos os Produtos
              </Badge>
              <Badge 
                variant={showOnlyNew ? "default" : "outline"}
                className={`cursor-pointer px-5 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 ${
                  showOnlyNew 
                    ? "bg-orange-600 text-white shadow-lg shadow-orange-200" 
                    : "hover:border-orange-200 hover:bg-orange-50 text-slate-600"
                }`}
                onClick={() => {
                  setShowOnlyNew(true);
                  setSelectedCategory("all");
                }}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Novidades
              </Badge>
              {Object.values(Category).map((cat) => (
                <Badge
                  key={cat}
                  variant={selectedCategory === cat ? "default" : "outline"}
                  className={`cursor-pointer px-5 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 ${
                    selectedCategory === cat 
                      ? "bg-slate-900 hover:bg-orange-600 text-white shadow-lg shadow-slate-200" 
                      : "hover:border-orange-200 hover:bg-orange-50 text-slate-600"
                  }`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </Badge>
              ))}
            </div>
          </div>

        {/* Product Grid */}
        <div id="product-grid" className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <AnimatePresence mode="popLayout">
            {currentProducts.map((product) => (
              <motion.div
                key={product.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
              >
                <Card 
                  className="group overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 bg-white rounded-2xl cursor-pointer"
                  onClick={() => {
                    setSelectedProductForDetails(product);
                    setIsProductDetailsOpen(true);
                  }}
                >
                  <div className="relative aspect-[4/5] overflow-hidden">
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="absolute top-3 left-3 flex flex-col gap-2">
                      <Badge className="bg-white/95 text-slate-900 hover:bg-white backdrop-blur-sm border-none font-bold shadow-sm w-fit">
                        {product.category}
                      </Badge>
                      {Date.now() - product.createdAt < 7 * 24 * 60 * 60 * 1000 && (
                        <Badge className="bg-orange-600 text-white border-none font-black shadow-lg shadow-orange-200 w-fit animate-pulse">
                          NOVIDADE
                        </Badge>
                      )}
                    </div>
                    {product.isVerified && (
                      <div className="absolute top-3 right-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-white shadow-lg">
                          <CheckCircle2 className="h-5 w-5" />
                        </div>
                      </div>
                    )}
                  </div>
                  <CardHeader className="p-5 pb-2">
                    {product.rating && (
                      <div className="flex items-center gap-1 text-orange-500 mb-1">
                        <Star className="h-3.5 w-3.5 fill-orange-500" />
                        <span className="text-xs font-black">{product.rating}</span>
                        <span className="text-[10px] text-slate-400 font-bold">({product.reviewCount})</span>
                      </div>
                    )}
                    <CardTitle className="line-clamp-1 text-lg font-black text-slate-900 font-heading group-hover:text-orange-600 transition-colors">
                      {product.name}
                    </CardTitle>
                    <div className="flex flex-col gap-1.5 text-xs font-medium text-slate-500">
                      <div className="flex items-center gap-1.5 bg-slate-50 w-fit px-2 py-1 rounded-lg">
                        <MapPin className="h-3.5 w-3.5 text-orange-500" />
                        {product.municipality}, {product.province}
                      </div>
                      <div 
                        className="flex items-center gap-1.5 hover:text-orange-600 cursor-pointer transition-colors w-fit"
                        onClick={(e) => {
                          e.stopPropagation();
                          openSellerProfile(product.sellerId);
                        }}
                      >
                        <Store className="h-3.5 w-3.5 text-slate-400" />
                        <span className="font-bold underline decoration-slate-200 underline-offset-2">{product.sellerName}</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-5 pt-0">
                    <p className="line-clamp-2 text-sm text-slate-600 mb-4 leading-relaxed">
                      {product.description}
                    </p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black text-orange-600 font-heading">
                        {formatPrice(product.price).split(' ')[0]}
                      </span>
                      <span className="text-sm font-bold text-orange-600/70">Kz</span>
                    </div>
                  </CardContent>
                  <CardFooter className="p-5 pt-0 flex gap-2">
                    <Button 
                      className="flex-1 bg-slate-900 hover:bg-orange-600 text-white font-bold h-11 rounded-xl transition-all duration-300 shadow-lg shadow-slate-200 hover:shadow-orange-200"
                      onClick={() => {
                        addToCart(product);
                        setIsCartOpen(true);
                      }}
                    >
                      Comprar Agora
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="shrink-0 h-11 w-11 rounded-xl border-slate-200 text-slate-600 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-600 transition-all"
                      onClick={() => {
                        setSelectedProductForChat(product);
                        setIsSellerChatOpen(true);
                      }}
                    >
                      <MessageCircle className="h-5 w-5" />
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="mt-12 flex items-center justify-center gap-2">
            <Button
              variant="outline"
              disabled={currentPage === 1}
              onClick={() => {
                setCurrentPage((prev) => Math.max(prev - 1, 1));
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="border-orange-200 text-orange-600 hover:bg-orange-50"
            >
              Anterior
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  onClick={() => {
                    setCurrentPage(page);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className={
                    currentPage === page
                      ? "bg-orange-600 hover:bg-orange-700 text-white"
                      : "border-orange-200 text-orange-600 hover:bg-orange-50"
                  }
                >
                  {page}
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              disabled={currentPage === totalPages}
              onClick={() => {
                setCurrentPage((prev) => Math.min(prev + 1, totalPages));
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="border-orange-200 text-orange-600 hover:bg-orange-50"
            >
              Próximo
            </Button>
          </div>
        )}

        {filteredProducts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <Search className="h-12 w-12 mb-4 opacity-20" />
            <p className="text-lg font-medium">Nenhum produto encontrado.</p>
            <p className="text-sm">Tente ajustar os seus filtros ou pesquisa.</p>
          </div>
        )}
          </div>
        </div>
      </main>

      {/* Gemini Chatbot Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="h-14 w-14 rounded-full bg-orange-600 shadow-lg hover:bg-orange-700 text-white"
        >
          {isChatOpen ? <X className="h-6 w-6" /> : <Bot className="h-6 w-6" />}
        </Button>

        <AnimatePresence>
          {isChatOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="absolute bottom-16 right-0 w-[350px] sm:w-[400px] overflow-hidden rounded-2xl border bg-white shadow-2xl"
            >
              <div className="bg-orange-600 p-4 text-white">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                    <Bot className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold">Assistente MercadoKwanza</h3>
                    <p className="text-xs text-orange-100">Online • Sempre aqui para ajudar</p>
                  </div>
                </div>
              </div>

              <ScrollArea className="h-[400px] p-4">
                <div className="space-y-4">
                  {chatMessages.length === 0 && (
                    <div className="text-center py-8">
                      <Bot className="h-12 w-12 mx-auto mb-4 text-orange-200" />
                      <p className="text-sm text-slate-500">
                        Olá! Eu sou o assistente do MercadoKwanza. Como posso ajudar-te hoje?
                      </p>
                    </div>
                  )}
                  {chatMessages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                          msg.role === "user"
                            ? "bg-orange-600 text-white rounded-tr-none"
                            : "bg-slate-100 text-slate-800 rounded-tl-none"
                        }`}
                      >
                        {msg.parts[0].text}
                      </div>
                    </div>
                  ))}
                  {isLoadingChat && (
                    <div className="flex justify-start">
                      <div className="bg-slate-100 rounded-2xl rounded-tl-none px-4 py-2 text-sm text-slate-500 animate-pulse">
                        A pensar...
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              </ScrollArea>

              <div className="border-t p-4">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex gap-2"
                >
                  <Input
                    placeholder="Escreve a tua mensagem..."
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    className="flex-1 focus-visible:ring-orange-500"
                  />
                  <Button type="submit" size="icon" className="bg-orange-600 hover:bg-orange-700 text-white">
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t py-12 mt-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-700 text-white font-bold text-xl shadow-lg shadow-orange-100">
                  <Landmark className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-black tracking-tighter text-slate-900 font-heading">
                  MERCADO<span className="text-orange-600">KWANZA</span>
                </h2>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed">
                O maior marketplace de Angola. Conectamos compradores e vendedores de Cabinda ao Cunene com segurança e facilidade.
              </p>
            </div>
            <div className="space-y-4">
              <h3 className="font-bold text-slate-900">Comprar</h3>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="hover:text-orange-600 cursor-pointer" onClick={() => setHelpTopic("Como Comprar")}>Como Comprar</li>
                <li className="hover:text-orange-600 cursor-pointer" onClick={() => setHelpTopic("Métodos de Pagamento")}>Pagamentos</li>
                <li className="hover:text-orange-600 cursor-pointer" onClick={() => setHelpTopic("Prazos de Entrega")}>Entregas</li>
                <li className="hover:text-orange-600 cursor-pointer" onClick={() => setHelpTopic("Rastreamento")}>Rastreamento</li>
                <li className="hover:text-orange-600 cursor-pointer" onClick={() => setHelpTopic("Devoluções")}>Devoluções</li>
                <li className="hover:text-orange-600 cursor-pointer" onClick={() => setHelpTopic("Categorias")}>Categorias</li>
              </ul>
            </div>
            <div className="space-y-4">
              <h3 className="font-bold text-slate-900">Vender</h3>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="hover:text-orange-600 cursor-pointer font-bold text-orange-600" onClick={() => setIsSellDialogOpen(true)}>Criar Minha Loja</li>
                <li className="hover:text-orange-600 cursor-pointer" onClick={() => setHelpTopic("Como Vender")}>Como Vender</li>
                <li className="hover:text-orange-600 cursor-pointer" onClick={() => setHelpTopic("Comissões e Planos")}>Planos</li>
                <li className="hover:text-orange-600 cursor-pointer" onClick={() => setHelpTopic("Dicas para Fotos")}>Dicas para Fotos</li>
                <li className="hover:text-orange-600 cursor-pointer" onClick={() => setHelpTopic("Destaques")}>Destaques</li>
                <li className="hover:text-orange-600 cursor-pointer" onClick={() => setHelpTopic("Vendedor Verificado")}>Vendedor Verificado</li>
              </ul>
            </div>
            <div className="space-y-4">
              <h3 className="font-bold text-slate-900">Segurança</h3>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="hover:text-orange-600 cursor-pointer" onClick={() => setHelpTopic("Segurança")}>Dicas de Segurança</li>
                <li className="hover:text-orange-600 cursor-pointer" onClick={() => setHelpTopic("Proteção do Comprador")}>Proteção</li>
                <li className="hover:text-orange-600 cursor-pointer" onClick={() => setHelpTopic("Privacidade")}>Privacidade</li>
                <li className="hover:text-orange-600 cursor-pointer" onClick={() => setHelpTopic("Denunciar Fraude")}>Denunciar Fraude</li>
                <li className="hover:text-orange-600 cursor-pointer" onClick={() => setHelpTopic("Centro de Ajuda")}>Centro de Ajuda</li>
              </ul>
            </div>
          </div>

          {/* Help Dialog */}
          <Dialog open={!!helpTopic} onOpenChange={(open) => !open && setHelpTopic(null)}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="text-orange-600">
                  {helpTopic && helpContent[helpTopic]?.title}
                </DialogTitle>
              </DialogHeader>
              <div className="py-4">
                {helpTopic && helpContent[helpTopic]?.content}
              </div>
            </DialogContent>
          </Dialog>

          <div className="border-t mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-slate-500">
            <p>© 2026 MercadoKwanza. Todos os direitos reservados. Angola.</p>
            <div className="flex gap-6">
              <span className="hover:text-orange-600 cursor-pointer" onClick={() => setHelpTopic("Privacidade")}>Privacidade</span>
              <span className="hover:text-orange-600 cursor-pointer" onClick={() => setHelpTopic("Termos")}>Termos</span>
              <span className="hover:text-orange-600 cursor-pointer" onClick={() => setHelpTopic("Cookies")}>Cookies</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
