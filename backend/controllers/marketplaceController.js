// marketplaceController.js
import db from '../database/db.js';
import * as paymongoService from '../services/paymongoService.js';

// ========================================
// PHASE 1: CART SYSTEM
// ========================================

// Helper: Create test marketplace items (TESTING ONLY - REMOVE IN PRODUCTION)
export const createTestItems = async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }

    const testItems = [
      {
        userId: userId,
        title: "Sunset Over Mountains",
        description: "A breathtaking landscape painting capturing the golden hour",
        price: 2500,
        quantity: 3,
        status: "active",
        medium: "Oil on Canvas",
        dimensions: "24x36 inches",
        is_original: true,
        is_available: true,
        is_featured: false
      },
      {
        userId: userId,
        title: "Abstract Emotions",
        description: "Modern abstract art expressing deep feelings",
        price: 1800,
        quantity: 5,
        status: "active",
        medium: "Acrylic",
        dimensions: "18x24 inches",
        is_original: true,
        is_available: true,
        is_featured: false
      },
      {
        userId: userId,
        title: "City Lights at Night",
        description: "Urban landscape with vibrant city lights",
        price: 3200,
        quantity: 2,
        status: "active",
        medium: "Digital Print",
        dimensions: "30x40 inches",
        is_original: false,
        is_available: true,
        is_featured: true
      }
    ];

    const { data, error } = await db
      .from('marketplace_items')
      .insert(testItems)
      .select();

    if (error) {
      console.error('Error creating test items:', error);
      return res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }

    res.status(201).json({ 
      success: true, 
      message: `Created ${data.length} test items`,
      data: data
    });

  } catch (error) {
    console.error('Error in createTestItems:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

// Create/Upload marketplace item
export const createMarketplaceItem = async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }

    const {
      title,
      description,
      price,
      medium,
      dimensions,
      year_created,
      weight_kg,
      is_original,
      is_framed,
      condition,
      images,
      primary_image,
      quantity,
      categories,
      tags
    } = req.body;

    // Validation
    if (!title || !price) {
      return res.status(400).json({ 
        success: false, 
        error: 'Title and price are required' 
      });
    }

    if (price < 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Price must be greater than or equal to 0' 
      });
    }

    // Create marketplace item
    const newItem = {
      userId: userId,
      title,
      description: description || null,
      price,
      medium: medium || null,
      dimensions: dimensions || null,
      year_created: year_created || null,
      weight_kg: weight_kg || null,
      is_original: is_original !== undefined ? is_original : true,
      is_framed: is_framed !== undefined ? is_framed : false,
      condition: condition || 'excellent',
      images: images || [],
      primary_image: primary_image || null,
      is_available: true,
      is_featured: false,
      quantity: quantity || 1,
      categories: categories || [],
      tags: tags || [],
      status: 'active' // You can change to 'pending' if you want admin approval
    };

    const { data, error } = await db
      .from('marketplace_items')
      .insert([newItem])
      .select()
      .single();

    if (error) {
      console.error('Error creating marketplace item:', error);
      return res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }

    res.status(201).json({ 
      success: true, 
      message: 'Marketplace item created successfully',
      data: data
    });

  } catch (error) {
    console.error('Error in createMarketplaceItem:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

// Get single marketplace item by ID
export const getMarketplaceItem = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: item, error } = await db
      .from('marketplace_items')
      .select('*')
      .eq('marketItemId', id)
      .single();

    if (error || !item) {
      return res.status(404).json({ 
        success: false, 
        error: 'Item not found' 
      });
    }

    res.json({ 
      success: true, 
      data: item
    });

  } catch (error) {
    console.error('Error in getMarketplaceItem:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

// Get all marketplace items
export const getMarketplaceItems = async (req, res) => {
  try {
    const { status } = req.query; // Optional filter by status
    
    let query = db
      .from('marketplace_items')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    
    // Only filter by status if provided, otherwise show all
    if (status) {
      query = query.eq('status', status);
    }
    
    const { data: items, error } = await query;

    if (error) {
      console.error('Error fetching items:', error);
      return res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }

    res.json({ 
      success: true, 
      data: items,
      count: items.length
    });

  } catch (error) {
    console.error('Error in getMarketplaceItems:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

// Update marketplace item
export const updateMarketplaceItem = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }

    // Check if item exists and belongs to user
    const { data: existingItem, error: checkError } = await db
      .from('marketplace_items')
      .select('userId')
      .eq('marketItemId', id)
      .single();

    if (checkError || !existingItem) {
      return res.status(404).json({ 
        success: false, 
        error: 'Item not found' 
      });
    }

    if (existingItem.userId !== userId) {
      return res.status(403).json({ 
        success: false, 
        error: 'You can only edit your own items' 
      });
    }

    // Update item
    const updateData = {
      ...req.body,
      updated_at: new Date().toISOString()
    };

    // Remove fields that shouldn't be updated
    delete updateData.marketItemId;
    delete updateData.userId;
    delete updateData.created_at;

    const { data, error } = await db
      .from('marketplace_items')
      .update(updateData)
      .eq('marketItemId', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating item:', error);
      return res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }

    res.json({ 
      success: true, 
      message: 'Item updated successfully',
      data: data
    });

  } catch (error) {
    console.error('Error in updateMarketplaceItem:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

// Delete marketplace item
export const deleteMarketplaceItem = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }

    // Check if item exists and belongs to user
    const { data: existingItem, error: checkError } = await db
      .from('marketplace_items')
      .select('userId')
      .eq('marketItemId', id)
      .single();

    if (checkError || !existingItem) {
      return res.status(404).json({ 
        success: false, 
        error: 'Item not found' 
      });
    }

    if (existingItem.userId !== userId) {
      return res.status(403).json({ 
        success: false, 
        error: 'You can only delete your own items' 
      });
    }

    // Delete item
    const { error } = await db
      .from('marketplace_items')
      .delete()
      .eq('marketItemId', id);

    if (error) {
      console.error('Error deleting item:', error);
      return res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }

    res.json({ 
      success: true, 
      message: 'Item deleted successfully'
    });

  } catch (error) {
    console.error('Error in deleteMarketplaceItem:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

// ========================================
// PHASE 1: CART SYSTEM
// ========================================

// 1. Get user's cart
export const getCart = async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }

    // Get cart items with marketplace item details
    const { data: cartItems, error } = await db
      .from('cart_items')
      .select(`
        *,
        marketplace_items (
          marketItemId,
          title,
          description,
          price,
          images,
          medium,
          dimensions,
          is_original,
          quantity,
          status,
          userId
        )
      `)
      .eq('userId', userId)
      .order('added_at', { ascending: false });

    if (error) {
      console.error('Error fetching cart:', error);
      return res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }

    // Filter out items where marketplace_item is null (deleted items)
    const validCartItems = cartItems.filter(item => item.marketplace_items !== null);

    // Calculate total
    const total = validCartItems.reduce((sum, item) => {
      return sum + (item.marketplace_items.price * item.quantity);
    }, 0);

    res.json({ 
      success: true, 
      data: {
        items: validCartItems,
        total: total,
        itemCount: validCartItems.length
      }
    });

  } catch (error) {
    console.error('Error in getCart:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

// 2. Add item to cart
export const addToCart = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { marketplace_item_id, quantity = 1 } = req.body;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }

    if (!marketplace_item_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'marketplace_item_id is required' 
      });
    }

    if (quantity < 1) {
      return res.status(400).json({ 
        success: false, 
        error: 'Quantity must be at least 1' 
      });
    }

    // Check if item exists and is available
    const { data: item, error: itemError } = await db
      .from('marketplace_items')
      .select('marketItemId, quantity, status, userId')
      .eq('marketItemId', marketplace_item_id)
      .single();

    if (itemError || !item) {
      return res.status(404).json({ 
        success: false, 
        error: 'Item not found' 
      });
    }

    if (item.status !== 'active') {
      return res.status(400).json({ 
        success: false, 
        error: 'Item is not available for purchase' 
      });
    }

    // Check if user is trying to buy their own item
    // TEMPORARILY DISABLED FOR TESTING - RE-ENABLE IN PRODUCTION
    // if (item.userId === userId) {
    //   return res.status(400).json({ 
    //     success: false, 
    //     error: 'You cannot add your own items to cart' 
    //   });
    // }

    // Check stock availability
    if (quantity > item.quantity) {
      return res.status(400).json({ 
        success: false, 
        error: `Only ${item.quantity} items available in stock` 
      });
    }
    // Check if item already in cart
    const { data: existingCartItem, error: checkError } = await db
      .from('cart_items')
      .select('*')
      .eq('userId', userId)
      .eq('marketItemId', marketplace_item_id)
      .maybeSingle(); // Use maybeSingle() instead of single() to handle 0 results

    // Only return error if it's NOT a "no rows" error
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking cart:', checkError);
      return res.status(500).json({ 
        success: false, 
        error: checkError.message 
      });
    }

    if (existingCartItem) {
      // Update existing cart item quantity
      const newQuantity = existingCartItem.quantity + quantity;

      // Check if new quantity exceeds stock
      if (newQuantity > item.quantity) {
        return res.status(400).json({ 
          success: false, 
          error: `Cannot add ${quantity} more. Only ${item.quantity - existingCartItem.quantity} items available` 
        });
      }

      const { data: updatedItem, error: updateError } = await db
        .from('cart_items')
        .update({ quantity: newQuantity })
        .eq('cartItemId', existingCartItem.cartItemId)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating cart:', updateError);
        return res.status(500).json({ 
          success: false, 
          error: updateError.message 
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Cart updated',
        data: updatedItem
      });
    }

    // Add new item to cart
    const { data: newCartItem, error: insertError } = await db
      .from('cart_items')
      .insert([{
        userId: userId,
        marketItemId: marketplace_item_id,
        quantity: quantity
      }])
      .select()
      .single();

    if (insertError) {
      console.error('Error adding to cart:', insertError);
      return res.status(500).json({ 
        success: false, 
        error: insertError.message 
      });
    }

    res.status(201).json({ 
      success: true, 
      message: 'Item added to cart',
      data: newCartItem
    });

  } catch (error) {
    console.error('Error in addToCart:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

// 3. Update cart item quantity
export const updateCartQuantity = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { itemId } = req.params;
    const { quantity } = req.body;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }

    if (!quantity || quantity < 1) {
      return res.status(400).json({ 
        success: false, 
        error: 'Quantity must be at least 1' 
      });
    }

    // Get cart item
    const { data: cartItem, error: cartError } = await db
      .from('cart_items')
      .select('*, marketplace_items(quantity, status)')
      .eq('cartItemId', itemId)
      .eq('userId', userId)
      .single();

    if (cartError || !cartItem) {
      return res.status(404).json({ 
        success: false, 
        error: 'Cart item not found' 
      });
    }

    // Check if marketplace item still available
    if (cartItem.marketplace_items.status !== 'active') {
      return res.status(400).json({ 
        success: false, 
        error: 'Item is no longer available' 
      });
    }

    // Check stock
    if (quantity > cartItem.marketplace_items.quantity) {
      return res.status(400).json({ 
        success: false, 
        error: `Only ${cartItem.marketplace_items.quantity} items available` 
      });
    }

    // Update quantity
    const { data: updatedItem, error: updateError } = await db
      .from('cart_items')
      .update({ quantity })
      .eq('cartItemId', itemId)
      .eq('userId', userId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating quantity:', updateError);
      return res.status(500).json({ 
        success: false, 
        error: updateError.message 
      });
    }

    res.json({
      success: true,
      message: 'Quantity updated',
      data: updatedItem
    });

  } catch (error) {
    console.error('Error in updateCartQuantity:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

// 4. Remove item from cart
export const removeFromCart = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { itemId } = req.params;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }

    // Delete cart item
    const { error } = await db
      .from('cart_items')
      .delete()
      .eq('cartItemId', itemId)
      .eq('userId', userId);

    if (error) {
      console.error('Error removing from cart:', error);
      return res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }

    res.json({ 
      success: true, 
      message: 'Item removed from cart' 
    });

  } catch (error) {
    console.error('Error in removeFromCart:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

// 5. Clear entire cart
export const clearCart = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }

    // Delete all cart items for user
    const { error } = await db
      .from('cart_items')
      .delete()
      .eq('userId', userId);

    if (error) {
      console.error('Error clearing cart:', error);
      return res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }

    res.json({ 
      success: true, 
      message: 'Cart cleared' 
    });

  } catch (error) {
    console.error('Error in clearCart:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

// ========================================
// PHASE 2: ORDERS & CHECKOUT
// ========================================

// 1. Create order from cart
export const createOrder = async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }

    const { shipping_address, contact_info, payment_method } = req.body;

    // Get cart items
    const { data: cartItems, error: cartError } = await db
      .from('cart_items')
      .select(`
        *,
        marketplace_items (
          marketItemId,
          title,
          price,
          quantity,
          status,
          userId
        )
      `)
      .eq('userId', userId);

    if (cartError) {
      console.error('Error fetching cart:', cartError);
      return res.status(500).json({ 
        success: false, 
        error: cartError.message 
      });
    }

    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Cart is empty' 
      });
    }

    // Validate all items are still available
    for (const item of cartItems) {
      if (!item.marketplace_items) {
        return res.status(400).json({ 
          success: false, 
          error: 'One or more items no longer exist' 
        });
      }

      if (item.marketplace_items.status !== 'active') {
        return res.status(400).json({ 
          success: false, 
          error: `Item "${item.marketplace_items.title}" is no longer available` 
        });
      }

      if (item.quantity > item.marketplace_items.quantity) {
        return res.status(400).json({ 
          success: false, 
          error: `Not enough stock for "${item.marketplace_items.title}". Only ${item.marketplace_items.quantity} available` 
        });
      }
    }

    // Calculate totals
    const platformFeeRate = 0.10; // 10% platform fee
    let subtotal = 0;
    
    const orderItems = cartItems.map(item => {
      const itemTotal = item.marketplace_items.price * item.quantity;
      subtotal += itemTotal;
      
      const platformFee = itemTotal * platformFeeRate;
      const artistEarnings = itemTotal - platformFee;

      return {
        userId: userId, // buyer
        marketplaceItemId: item.marketItemId,
        sellerId: item.marketplace_items.userId,
        title: item.marketplace_items.title,
        priceAtPurchase: item.marketplace_items.price,
        quantity: item.quantity,
        itemTotal: itemTotal,
        platformFeeAmount: platformFee,
        artistEarnings: artistEarnings
      };
    });

    const platformFeeTotal = subtotal * platformFeeRate;
    const artistEarningsTotal = subtotal - platformFeeTotal;

    // Create main order (without payment link first)
    const { data: mainOrder, error: orderError} = await db
      .from('orders')
      .insert({
        userId: userId,
        subtotal: subtotal,
        platformFee: platformFeeTotal,
        shippingCost: 0,
        totalAmount: subtotal,
        status: 'pending',
        paymentStatus: 'pending',
        shippingAddress: shipping_address,
        contactInfo: contact_info,
        paymentMethod: payment_method,
        paymentProvider: 'paymongo'
      })
      .select()
      .single();

    if (orderError) {
      console.error('Error creating order:', orderError);
      return res.status(500).json({ 
        success: false, 
        error: orderError.message 
      });
    }

    // Create PayMongo payment link
    let paymentLink;
    try {
      paymentLink = await paymongoService.createPaymentLink({
        amount: paymongoService.toCentavos(subtotal), // Convert to centavos
        description: `Museo Order #${mainOrder.orderId.substring(0, 8)}`,
        metadata: {
          orderId: mainOrder.orderId,
          userId: userId,
          itemCount: orderItems.length,
          remarks: 'Museo Marketplace Purchase'
        }
      });

      // Update order with payment link details
      const { error: updateError } = await db
        .from('orders')
        .update({
          paymentLinkId: paymentLink.paymentLinkId,
          paymentReference: paymentLink.referenceNumber
        })
        .eq('orderId', mainOrder.orderId);

      if (updateError) {
        console.error('Error updating order with payment link:', updateError);
      }

    } catch (paymentError) {
      console.error('Error creating payment link:', paymentError);
      // Don't fail the order creation, just log the error
      // Order can still be processed manually
    }

    // Add orderId to each order item
    const orderItemsWithOrderId = orderItems.map(item => ({
      ...item,
      orderId: mainOrder.orderId
    }));

    // Create order_items
    const { data: createdOrderItems, error: itemsError } = await db
      .from('order_items')
      .insert(orderItemsWithOrderId)
      .select();

    if (itemsError) {
      console.error('Error creating order items:', itemsError);
      return res.status(500).json({ 
        success: false, 
        error: itemsError.message 
      });
    }

    // Update inventory quantities
    for (const item of cartItems) {
      const newQuantity = item.marketplace_items.quantity - item.quantity;
      
      const { error: updateError } = await db
        .from('marketplace_items')
        .update({ 
          quantity: newQuantity,
          updated_at: new Date().toISOString()
        })
        .eq('marketItemId', item.marketItemId);

      if (updateError) {
        console.error('Error updating inventory:', updateError);
      }
    }

    // DON'T clear cart yet - will be cleared after successful payment via webhook

    // Group items by seller for response
    const itemsBySeller = {};
    createdOrderItems.forEach(item => {
      if (!itemsBySeller[item.sellerId]) {
        itemsBySeller[item.sellerId] = [];
      }
      itemsBySeller[item.sellerId].push(item);
    });

    res.status(201).json({ 
      success: true, 
      message: 'Order created successfully. Please complete payment.',
      data: {
        order: mainOrder,
        orderItems: createdOrderItems,
        itemsBySeller: itemsBySeller,
        payment: paymentLink ? {
          paymentUrl: paymentLink.checkoutUrl,
          paymentLinkId: paymentLink.paymentLinkId,
          referenceNumber: paymentLink.referenceNumber,
          expiresAt: paymentLink.expiresAt
        } : null,
        summary: {
          orderId: mainOrder.orderId,
          itemCount: orderItems.length,
          sellerCount: Object.keys(itemsBySeller).length,
          subtotal: subtotal,
          platformFee: platformFeeTotal,
          artistEarnings: artistEarningsTotal,
          shippingCost: 0,
          total: subtotal
        }
      }
    });

  } catch (error) {
    console.error('Error in createOrder:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

// 2. Get buyer's orders
export const getBuyerOrders = async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }

    // Get all orders for this buyer
    const { data: orders, error: ordersError } = await db
      .from('orders')
      .select('*')
      .eq('userId', userId)
      .order('createdAt', { ascending: false });

    if (ordersError) {
      console.error('Error fetching buyer orders:', ordersError);
      return res.status(500).json({ 
        success: false, 
        error: ordersError.message 
      });
    }

    // Get order items for each order
    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const { data: items } = await db
          .from('order_items')
          .select('*')
          .eq('orderId', order.orderId);

        // Group items by seller
        const itemsBySeller = {};
        items.forEach(item => {
          if (!itemsBySeller[item.sellerId]) {
            itemsBySeller[item.sellerId] = [];
          }
          itemsBySeller[item.sellerId].push(item);
        });

        return {
          ...order,
          items: items,
          itemsBySeller: itemsBySeller,
          itemCount: items.length,
          sellerCount: Object.keys(itemsBySeller).length
        };
      })
    );

    res.json({ 
      success: true, 
      data: ordersWithItems,
      count: ordersWithItems.length
    });

  } catch (error) {
    console.error('Error in getBuyerOrders:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

// 3. Get seller's orders
export const getSellerOrders = async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }

    const { data: orders, error } = await db
      .from('order_items')
      .select('*')
      .eq('sellerId', userId)
      .order('createdAt', { ascending: false });

    if (error) {
      console.error('Error fetching seller orders:', error);
      return res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }

    res.json({ 
      success: true, 
      data: orders,
      count: orders.length
    });

  } catch (error) {
    console.error('Error in getSellerOrders:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

// 4. Get order details
export const getOrderDetails = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { orderId } = req.params;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }

    // Get main order
    const { data: order, error: orderError } = await db
      .from('orders')
      .select('*')
      .eq('orderId', orderId)
      .single();

    if (orderError || !order) {
      return res.status(404).json({ 
        success: false, 
        error: 'Order not found' 
      });
    }

    // Get order items
    const { data: items, error: itemsError } = await db
      .from('order_items')
      .select('*')
      .eq('orderId', orderId);

    if (itemsError) {
      return res.status(500).json({ 
        success: false, 
        error: itemsError.message 
      });
    }

    // Check if user is buyer or any of the sellers
    const isBuyer = order.userId === userId;
    const isSeller = items.some(item => item.sellerId === userId);

    if (!isBuyer && !isSeller) {
      return res.status(403).json({ 
        success: false, 
        error: 'You do not have permission to view this order' 
      });
    }

    // Group items by seller
    const itemsBySeller = {};
    items.forEach(item => {
      if (!itemsBySeller[item.sellerId]) {
        itemsBySeller[item.sellerId] = [];
      }
      itemsBySeller[item.sellerId].push(item);
    });

    res.json({ 
      success: true, 
      data: {
        ...order,
        items: items,
        itemsBySeller: itemsBySeller,
        itemCount: items.length,
        sellerCount: Object.keys(itemsBySeller).length
      }
    });

  } catch (error) {
    console.error('Error in getOrderDetails:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

// ========================================
// PHASE 3: ORDER STATUS UPDATES
// ========================================

// 5. Mark order as shipped (Seller)
export const markOrderAsShipped = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { orderId } = req.params;
    const { tracking_number } = req.body;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }

    // Get order
    const { data: order, error: orderError } = await db
      .from('orders')
      .select('*')
      .eq('orderId', orderId)
      .single();

    if (orderError || !order) {
      return res.status(404).json({ 
        success: false, 
        error: 'Order not found' 
      });
    }

    // Check if user is a seller in this order
    const { data: items } = await db
      .from('order_items')
      .select('sellerId')
      .eq('orderId', orderId);

    const isSeller = items.some(item => item.sellerId === userId);

    if (!isSeller) {
      return res.status(403).json({ 
        success: false, 
        error: 'Only sellers can mark orders as shipped' 
      });
    }

    // Update order status
    const { data: updatedOrder, error: updateError } = await db
      .from('orders')
      .update({ 
        status: 'shipped',
        trackingNumber: tracking_number,
        shippedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .eq('orderId', orderId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating order:', updateError);
      return res.status(500).json({ 
        success: false, 
        error: updateError.message 
      });
    }

    res.json({ 
      success: true, 
      message: 'Order marked as shipped',
      data: updatedOrder
    });

  } catch (error) {
    console.error('Error in markOrderAsShipped:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

// 6. Mark order as delivered
export const markOrderAsDelivered = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { orderId } = req.params;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }

    // Get order
    const { data: order, error: orderError } = await db
      .from('orders')
      .select('*')
      .eq('orderId', orderId)
      .single();

    if (orderError || !order) {
      return res.status(404).json({ 
        success: false, 
        error: 'Order not found' 
      });
    }

    // Only buyer can mark as delivered
    if (order.userId !== userId) {
      return res.status(403).json({ 
        success: false, 
        error: 'Only buyer can confirm delivery' 
      });
    }

    // Update order status
    const { data: updatedOrder, error: updateError } = await db
      .from('orders')
      .update({ 
        status: 'delivered',
        deliveredAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .eq('orderId', orderId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating order:', updateError);
      return res.status(500).json({ 
        success: false, 
        error: updateError.message 
      });
    }

    res.json({ 
      success: true, 
      message: 'Order marked as delivered',
      data: updatedOrder
    });

  } catch (error) {
    console.error('Error in markOrderAsDelivered:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

// 7. Cancel order
export const cancelOrder = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { orderId } = req.params;
    const { reason } = req.body;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }

    // Get order
    const { data: order, error: orderError } = await db
      .from('orders')
      .select('*')
      .eq('orderId', orderId)
      .single();

    if (orderError || !order) {
      return res.status(404).json({ 
        success: false, 
        error: 'Order not found' 
      });
    }

    // Check if user is buyer or seller
    const { data: items } = await db
      .from('order_items')
      .select('sellerId')
      .eq('orderId', orderId);

    const isBuyer = order.userId === userId;
    const isSeller = items.some(item => item.sellerId === userId);

    if (!isBuyer && !isSeller) {
      return res.status(403).json({ 
        success: false, 
        error: 'You do not have permission to cancel this order' 
      });
    }

    // Can't cancel if already shipped or delivered
    if (order.status === 'shipped' || order.status === 'delivered') {
      return res.status(400).json({ 
        success: false, 
        error: 'Cannot cancel order that has been shipped or delivered' 
      });
    }

    // Get order items to restore inventory
    const { data: orderItems } = await db
      .from('order_items')
      .select('marketplaceItemId, quantity')
      .eq('orderId', orderId);

    // Restore inventory for each item
    for (const item of orderItems) {
      const { data: marketItem } = await db
        .from('marketplace_items')
        .select('quantity')
        .eq('marketItemId', item.marketplaceItemId)
        .single();

      if (marketItem) {
        await db
          .from('marketplace_items')
          .update({ 
            quantity: marketItem.quantity + item.quantity,
            updated_at: new Date().toISOString()
          })
          .eq('marketItemId', item.marketplaceItemId);
      }
    }

    // Update order status
    const { data: updatedOrder, error: updateError } = await db
      .from('orders')
      .update({ 
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .eq('orderId', orderId)
      .select()
      .single();

    if (updateError) {
      console.error('Error cancelling order:', updateError);
      return res.status(500).json({ 
        success: false, 
        error: updateError.message 
      });
    }

    res.json({ 
      success: true, 
      message: 'Order cancelled successfully. Inventory has been restored.',
      data: updatedOrder
    });

  } catch (error) {
    console.error('Error in cancelOrder:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};