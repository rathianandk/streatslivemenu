import React, { useState, useEffect } from 'react';
import { X, Clock, Users, ShoppingCart, CheckCircle } from 'lucide-react';

interface QueueItem {
  dishId: number;
  quantity: number;
  name: string;
  price: number;
}

interface QueueStatus {
  isInQueue: boolean;
  queueNumber: number | null;
  position: number | null;
  estimatedWait: number | null;
  status: 'waiting' | 'preparing' | 'ready' | 'completed';
  items: QueueItem[];
  totalAmount: number;
}

interface QueueSystemProps {
  vendorId: number;
  vendorName: string;
  cartItems: { [key: number]: number };
  dishes: any[];
  onClose: () => void;
  onNotification: (notification: any) => void;
}

const QueueSystem: React.FC<QueueSystemProps> = ({
  vendorId,
  vendorName,
  cartItems,
  dishes,
  onClose,
  onNotification
}) => {
  const [queueStatus, setQueueStatus] = useState<QueueStatus>({
    isInQueue: false,
    queueNumber: null,
    position: null,
    estimatedWait: null,
    status: 'waiting',
    items: [],
    totalAmount: 0
  });
  
  const [vendorQueueInfo, setVendorQueueInfo] = useState({
    totalInQueue: 0,
    estimatedWait: 0
  });
  
  const [isJoining, setIsJoining] = useState(false);

  // Calculate total amount
  const calculateTotal = () => {
    return Object.entries(cartItems).reduce((total, [dishId, quantity]) => {
      const dish = dishes.find(d => d.id === parseInt(dishId));
      return total + (dish ? dish.price * quantity : 0);
    }, 0);
  };

  // Get vendor queue info
  useEffect(() => {
    const fetchVendorQueueInfo = async () => {
      try {
        const response = await fetch(`/api/queue/${vendorId}`);
        const data = await response.json();
        setVendorQueueInfo({
          totalInQueue: data.totalInQueue,
          estimatedWait: data.estimatedWait
        });
      } catch (error) {
        console.error('Error fetching queue info:', error);
      }
    };

    fetchVendorQueueInfo();
  }, [vendorId]);

  // Join queue function
  const joinQueue = async () => {
    setIsJoining(true);
    
    try {
      const items = Object.entries(cartItems).map(([dishId, quantity]) => {
        const dish = dishes.find(d => d.id === parseInt(dishId));
        return {
          dishId: parseInt(dishId),
          quantity,
          name: dish?.name || 'Unknown',
          price: dish?.price || 0
        };
      });

      const response = await fetch('/api/queue/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vendorId,
          items,
          totalAmount: calculateTotal(),
          customerName: 'Customer'
        }),
      });

      const data = await response.json();

      if (data.success) {
        setQueueStatus({
          isInQueue: true,
          queueNumber: data.queueNumber,
          position: data.position,
          estimatedWait: data.estimatedWait,
          status: 'waiting',
          items,
          totalAmount: calculateTotal()
        });

        // Show success notification
        onNotification({
          title: '🎫 Joined Queue!',
          message: `You're #${data.position} in line at ${vendorName}`,
          type: 'success'
        });
      } else {
        throw new Error(data.error || 'Failed to join queue');
      }
    } catch (error) {
      console.error('Error joining queue:', error);
      onNotification({
        title: '❌ Queue Error',
        message: 'Failed to join queue. Please try again.',
        type: 'error'
      });
    } finally {
      setIsJoining(false);
    }
  };

  // Poll for queue updates
  useEffect(() => {
    if (queueStatus.isInQueue && queueStatus.queueNumber) {
      const interval = setInterval(async () => {
        try {
          const response = await fetch(`/api/queue/status/${queueStatus.queueNumber}/${vendorId}`);
          const data = await response.json();
          
          if (response.ok) {
            const previousPosition = queueStatus.position;
            setQueueStatus(prev => ({
              ...prev,
              position: data.position,
              estimatedWait: data.estimatedWait,
              status: data.status
            }));

            // Notify when position changes
            if (previousPosition && data.position < previousPosition) {
              onNotification({
                title: '🎫 Queue Update',
                message: `You're now #${data.position} in line!`,
                type: 'info'
              });
            }

            // Notify when ready
            if (data.status === 'ready') {
              onNotification({
                title: '🍽️ Order Ready!',
                message: `Your order at ${vendorName} is ready for pickup!`,
                type: 'success'
              });
            }
          }
        } catch (error) {
          console.error('Error polling queue status:', error);
        }
      }, 30000); // Poll every 30 seconds

      return () => clearInterval(interval);
    }
  }, [queueStatus.isInQueue, queueStatus.queueNumber, queueStatus.position, vendorId, vendorName, onNotification]);

  if (queueStatus.isInQueue) {
    // Queue Status View
    return (
      <div className="flex-1 flex flex-col">
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex justify-between items-start mb-4">
            <div className="text-center flex-1">
              <div className="text-4xl mb-2">🎫</div>
              <h2 className="text-2xl font-bold text-gray-900">You're in line!</h2>
              <p className="text-gray-600">{vendorName}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="flex-1 p-6 space-y-6">
          <div className="text-center">
            <div className="text-6xl font-bold text-orange-600 mb-2">
              #{queueStatus.queueNumber}
            </div>
            <p className="text-gray-600">Your queue number</p>
          </div>
          
          <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold">Position in line</span>
              <span className="text-2xl font-bold text-orange-600">
                #{queueStatus.position}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold">Estimated wait</span>
              <span className="text-lg font-bold text-green-600">
                {queueStatus.estimatedWait} min
              </span>
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-orange-600" />
              Your Order
            </h4>
            <div className="space-y-2">
              {queueStatus.items.map((item, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span>{item.quantity}x {item.name}</span>
                  <span>${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="border-t pt-2 mt-2">
              <div className="flex justify-between font-bold">
                <span>Total: ${queueStatus.totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50 rounded-xl p-4">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              We'll notify you when:
            </h4>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>• You're next in line</li>
              <li>• Your order is ready for pickup</li>
              <li>• Any delays occur</li>
            </ul>
          </div>

          {queueStatus.status === 'ready' && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle className="w-5 h-5" />
                <div>
                  <p className="font-semibold">🍽️ Order Ready!</p>
                  <p className="text-sm">Please head to {vendorName} to pick up your order.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Order Summary & Join Queue View
  return (
    <div className="flex-1 flex flex-col">
      <div className="p-6 border-b border-gray-200 bg-orange-50">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Order Summary</h2>
            <p className="text-gray-600">{vendorName}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      <div className="flex-1 p-6 space-y-6">
        {/* Order Items */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-orange-600" />
            Your Items
          </h4>
          <div className="space-y-3">
            {Object.entries(cartItems).map(([dishId, quantity]) => {
              const dish = dishes.find(d => d.id === parseInt(dishId));
              if (!dish) return null;
              
              return (
                <div key={dishId} className="flex justify-between items-center">
                  <div>
                    <span className="font-medium">{quantity}x {dish.name}</span>
                    <p className="text-sm text-gray-600">${dish.price} each</p>
                  </div>
                  <span className="font-bold text-orange-600">
                    ${(dish.price * quantity).toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="border-t pt-3 mt-3">
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold">Total</span>
              <span className="text-xl font-bold text-orange-600">
                ${calculateTotal().toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Queue Info */}
        <div className="bg-blue-50 rounded-xl p-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-blue-700 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Current Queue
            </span>
            <span className="font-semibold">
              {vendorQueueInfo.totalInQueue} people (~{vendorQueueInfo.estimatedWait} min wait)
            </span>
          </div>
        </div>
        
        {/* Join Queue Button */}
        <button
          onClick={joinQueue}
          disabled={isJoining || Object.keys(cartItems).length === 0}
          className={`w-full py-4 px-4 rounded-xl font-bold text-lg shadow-lg transition-all duration-300 ${
            isJoining || Object.keys(cartItems).length === 0
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-orange-600 to-red-600 text-white hover:from-orange-700 hover:to-red-700 hover:shadow-xl transform hover:scale-105'
          }`}
        >
          {isJoining ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white inline-block mr-2"></div>
              Joining Queue...
            </>
          ) : (
            <>
              🎫 Join Queue - Position #{vendorQueueInfo.totalInQueue + 1}
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default QueueSystem;
