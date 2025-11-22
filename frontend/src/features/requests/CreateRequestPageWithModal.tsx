import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { handleAndFormatError, ErrorHandlers } from '@/utils/errorHandler';
import { purchaseRequestsAPI } from '@/api/purchaseRequests';
import type { RequestItem, CreatePurchaseRequestData } from '@/types';
import { Plus, Edit, Trash2, DollarSign, Package } from 'lucide-react';
import AddItemModal from './components/AddItemModal';

const CreateRequestPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState<Omit<RequestItem, 'id' | 'subtotal' | 'created_at' | 'updated_at'>[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | undefined>(undefined);

  // Add new item
  const handleAddItem = (item: Omit<RequestItem, 'id' | 'subtotal' | 'created_at' | 'updated_at'>) => {
    if (editingIndex !== undefined) {
      // Update existing item
      const updatedItems = [...items];
      updatedItems[editingIndex] = item;
      setItems(updatedItems);
      setEditingIndex(undefined);
    } else {
      // Add new item
      setItems([...items, item]);
    }
  };

  // Edit item
  const handleEditItem = (index: number) => {
    setEditingIndex(index);
    setIsModalOpen(true);
  };

  // Remove item
  const handleRemoveItem = (index: number) => {
    if (items.length === 1) {
      toast({
        title: 'Cannot remove',
        description: 'At least one item is required',
        variant: 'destructive',
      });
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  // Calculate subtotal for an item
  const calculateSubtotal = (item: typeof items[0]): number => {
    const qty = typeof item.quantity === 'string' ? parseFloat(item.quantity) : item.quantity;
    const price = typeof item.unit_price === 'string' ? parseFloat(item.unit_price) : item.unit_price;
    return qty * price || 0;
  };

  // Calculate total amount
  const calculateTotal = (): number => {
    return items.reduce((total, item) => total + calculateSubtotal(item), 0);
  };

  // Validate form
  const validateForm = (): boolean => {
    if (!title.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Title is required',
        variant: 'destructive',
      });
      return false;
    }

    if (items.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'At least one item is required',
        variant: 'destructive',
      });
      return false;
    }

    return true;
  };

  // Save as draft
  const handleSaveDraft = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const data: CreatePurchaseRequestData = {
        title,
        description,
        status: 'DRAFT',
        items: items.map((item) => ({
          description: item.description,
          quantity: typeof item.quantity === 'string' ? parseFloat(item.quantity) : item.quantity,
          unit_price: typeof item.unit_price === 'string' ? parseFloat(item.unit_price) : item.unit_price,
          unit_of_measure: item.unit_of_measure || 'unit',
          notes: item.notes || '',
        })),
      };

      const response = await purchaseRequestsAPI.create(data);

      toast({
        title: 'Draft saved',
        description: 'Purchase request saved as draft successfully',
      });

      navigate(`/staff/requests/${response.id}`);
    } catch (error) {
      const { toastData } = handleAndFormatError(ErrorHandlers.validation(error));
      toast(toastData);
    } finally {
      setLoading(false);
    }
  };

  // Submit for approval
  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const data: CreatePurchaseRequestData = {
        title,
        description,
        status: 'DRAFT',
        items: items.map((item) => ({
          description: item.description,
          quantity: typeof item.quantity === 'string' ? parseFloat(item.quantity) : item.quantity,
          unit_price: typeof item.unit_price === 'string' ? parseFloat(item.unit_price) : item.unit_price,
          unit_of_measure: item.unit_of_measure || 'unit',
          notes: item.notes || '',
        })),
      };

      const response = await purchaseRequestsAPI.create(data);
      await purchaseRequestsAPI.submit(response.id);

      toast({
        title: 'Request submitted',
        description: 'Purchase request submitted for approval successfully',
      });

      navigate('/staff/requests');
    } catch (error) {
      const { toastData } = handleAndFormatError(ErrorHandlers.validation(error));
      toast(toastData);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Create Purchase Request</h1>
          <p className="text-gray-600 mt-1">Fill in the details for your purchase request</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Request Details</CardTitle>
            <CardDescription>
              Provide a title and description for this purchase request
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Office Supplies Q1 2024"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Additional details about this request..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Items Section */}
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Items</CardTitle>
                <CardDescription>Manage items in your purchase request</CardDescription>
              </div>
              <Button
                onClick={() => {
                  setEditingIndex(undefined);
                  setIsModalOpen(true);
                }}
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No items added yet</h3>
                <p className="text-gray-600 mb-4">
                  Click "Add Item" to start building your purchase request
                </p>
                <Button
                  onClick={() => {
                    setEditingIndex(undefined);
                    setIsModalOpen(true);
                  }}
                  variant="outline"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Item
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-start justify-between p-4 border rounded-lg hover:border-gray-400 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-medium text-gray-900">{item.description}</h4>
                          {item.notes && (
                            <p className="text-sm text-gray-600 mt-1">{item.notes}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="flex items-center text-lg font-bold text-green-600">
                            <DollarSign className="h-4 w-4" />
                            {calculateSubtotal(item).toFixed(2)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>
                          Qty: <span className="font-medium">{item.quantity}</span> {item.unit_of_measure}
                        </span>
                        <span className="text-gray-300">•</span>
                        <span>
                          Price: <span className="font-medium">${typeof item.unit_price === 'number' ? item.unit_price.toFixed(2) : item.unit_price}</span>
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <Button
                        onClick={() => handleEditItem(index)}
                        size="sm"
                        variant="ghost"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => handleRemoveItem(index)}
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
          <CardFooter className="border-t bg-gray-50">
            <div className="flex items-center justify-between w-full">
              <span className="text-sm text-gray-600">{items.length} item(s)</span>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-semibold">Total:</span>
                <div className="flex items-center text-2xl font-bold text-green-600">
                  <DollarSign className="h-6 w-6" />
                  {calculateTotal().toFixed(2)}
                </div>
              </div>
            </div>
          </CardFooter>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-between mt-6">
          <Button
            onClick={() => navigate('/staff/requests')}
            variant="outline"
            disabled={loading}
          >
            Cancel
          </Button>
          <div className="flex space-x-3">
            <Button
              onClick={handleSaveDraft}
              variant="outline"
              disabled={loading}
            >
              Save as Draft
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? 'Submitting...' : 'Submit for Approval'}
            </Button>
          </div>
        </div>
      </div>

      {/* Add/Edit Item Modal */}
      <AddItemModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingIndex(undefined);
        }}
        onAdd={handleAddItem}
        editItem={editingIndex !== undefined ? items[editingIndex] : undefined}
        editIndex={editingIndex}
      />
    </div>
  );
};

export default CreateRequestPage;
